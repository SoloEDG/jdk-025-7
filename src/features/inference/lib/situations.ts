import type {
  Footstep,
  PublicBoard,
  Sighting,
  SlateObservation,
  Situation,
} from "../../../shared/types";
import { cellZone, neighbors } from "../../../shared/geometry";
import { positionsForPhases } from "../../terrain/lib/patrol";
import { solveTrapCsp, type TrapCsp } from "./trapCsp";

export interface Evidence {
  turn: number;
  footsteps: Footstep[];
  sightings: Sighting[];
  slates: SlateObservation[];
}

export interface SituationAnalysis {
  situations: Situation[];
  /** 每个情形下各格被守卫占据的次数（用于风险底纹）。 */
  guardHits: Map<number, number>;
  /** 每个格在多少情形中仍可能是固定陷阱。 */
  trapRisk: Map<number, number>;
  /** 被全部情形判定为当前回合安全的格。 */
  safeCells: Set<number>;
  /** 被全部情形判定有守卫的格。 */
  certainGuardCells: Set<number>;
  truncated: boolean;
  enumerated: number;
}

const SITUATION_LIMIT = 24000;

/**
 * 联合枚举：递归为每名守卫选相位，任何部分组合违反证据即剪枝。
 * 不做“每守卫独立追踪后相乘”，因为那会保留不可能同时出现的组合。
 */
export function analyzeSituations(
  board: PublicBoard,
  evidence: Evidence,
): SituationAnalysis {
  const tracks = board.guards.map((g) => g.track);
  const current = evidence.turn;

  const footprintByTurn = new Map<number, Map<number, number>>();
  for (const f of evidence.footsteps) {
    const m = footprintByTurn.get(f.turn) ?? new Map<number, number>();
    m.set(f.zone, f.count);
    footprintByTurn.set(f.turn, m);
  }
  const sightByTurn = new Map<number, Map<number, boolean>>();
  for (const s of evidence.sightings) {
    const m = sightByTurn.get(s.turn) ?? new Map<number, boolean>();
    m.set(s.cell, s.present);
    sightByTurn.set(s.turn, m);
  }

  const matchesEvidence = (
    turn: number,
    partial: number[],
    nextPos: number,
    guardIndex: number,
  ): boolean => {
    const sight = sightByTurn.get(turn);
    if (sight) {
      const want = sight.get(nextPos);
      if (want === false) return false;
      // present=true 必须由某名守卫占据，留到完整组合时统一核对。
    }
    const foot = footprintByTurn.get(turn);
    if (foot) {
      const zone = cellZone(nextPos, board.zones);
      // 报告显式列出全部区域（含 0）；不在表中的区域视为计数 0。
      const wanted = foot.has(zone) ? foot.get(zone)! : 0;
      const inZone =
        partial.filter((p) => cellZone(p, board.zones) === zone).length +
        (cellZone(nextPos, board.zones) === zone ? 1 : 0);
      // 部分计数已超过报告数即剪枝；最终精确性在完整组合时核对。
      if (inZone > wanted) return false;
    }
    // 石板数字约束在完整组合上校验（需要全部守卫位置）。
    void guardIndex;
    return true;
  };

  const survivors: { phases: number[]; positions: number[] }[] = [];
  let truncated = false;
  let enumerated = 0;

  const recurse = (guardIndex: number, phases: number[], partial: number[]) => {
    if (truncated) return;
    if (guardIndex === tracks.length) {
      enumerated++;
      // 完整组合的精确脚步核对 + present=true 目击核对 + 石板数字核对。
      for (const [turnStr, counts] of footprintByTurn) {
        const turn = Number(turnStr);
        const pos = positionsForPhases(tracks, phases, turn);
        const actual = new Map<number, number>();
        for (const cell of pos) {
          const z = cellZone(cell, board.zones);
          actual.set(z, (actual.get(z) ?? 0) + 1);
        }
        for (const [zone, count] of counts)
          if ((actual.get(zone) ?? 0) !== count) return;
      }
      for (const [turnStr, sight] of sightByTurn) {
        const turn = Number(turnStr);
        const pos = positionsForPhases(tracks, phases, turn);
        const occupied = new Set(pos);
        for (const [cell, present] of sight)
          if (occupied.has(cell) !== present) return;
      }
      for (const slate of evidence.slates) {
        const pos = positionsForPhases(tracks, phases, slate.turn);
        const around = new Set(
          neighbors(slate.cell, board.width, board.height),
        );
        const guardCount = pos.filter((p) => around.has(p)).length;
        if (guardCount > slate.number) return;
      }
      survivors.push({ phases: [...phases], positions: partial });
      if (survivors.length >= SITUATION_LIMIT) truncated = true;
      return;
    }
    const track = tracks[guardIndex];
    for (let phase = 0; phase < track.length; phase++) {
      if (truncated) return;
      // 逐回合目击剪枝：该守卫在所有被目击回合都不能落在“确认无守卫”的格。
      let ok = true;
      for (const [turnStr, sight] of sightByTurn) {
        const turn = Number(turnStr);
        const cell = track[(phase + turn) % track.length];
        if (sight.get(cell) === false) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      const nextPos = track[(phase + current) % track.length];
      if (!matchesEvidence(current, partial, nextPos, guardIndex)) continue;
      phases.push(phase);
      partial.push(nextPos);
      recurse(guardIndex + 1, phases, partial);
      phases.pop();
      partial.pop();
    }
  };
  recurse(0, [], []);

  // 等价情形合并：当前相位相同则过去与未来位置完全一致，按相位去重，
  // 保留代表情形并累计合并数（不丢未来移动信息——track 与相位足以复现全部回合）。
  const merged = new Map<string, { phases: number[]; positions: number[]; n: number }>();
  for (const s of survivors) {
    const key = s.phases.join("|");
    const prev = merged.get(key);
    if (prev) prev.n++;
    else merged.set(key, { ...s, n: 1 });
  }

  // 固定陷阱 CSP 的静态部分（与情形无关）。
  // 注意：整条巡逻路线的格都不可能是固定陷阱（守卫要经过）。
  const baseFixed = new Map<number, boolean>();
  const guardTrackCells = new Set(tracks.flat());
  guardTrackCells.forEach((cell) => baseFixed.set(cell, false));
  for (const c of board.cells) {
    if (c.revealed) baseFixed.set(c.id, false);
    if (c.intel === "safe") baseFixed.set(c.id, false);
    if (c.intel === "danger") baseFixed.set(c.id, true);
  }

  // 每个石板产生一条约束；守卫数随情形变化，先建邻格表。
  const slateAround = evidence.slates.map((slate) => ({
    slate,
    around: neighbors(slate.cell, board.width, board.height),
  }));

  const cspCache = new Map<string, { feasible: boolean; possible: Set<number> }>();
  const situations: Situation[] = [];
  const guardHits = new Map<number, number>();
  const trapRisk = new Map<number, number>();

  for (const m of merged.values()) {
    // 该情形下，守卫在每个观测回合占据的全部格（这些格当时不是固定陷阱）。
    const occupiedBySituation = new Set<number>();
    for (const t of new Set(evidence.slates.map((s) => s.turn))) {
      for (const p of positionsForPhases(tracks, m.phases, t))
        occupiedBySituation.add(p);
    }
    const fixed = new Map(baseFixed);
    occupiedBySituation.forEach((cell) => {
      // 不覆盖探针已确认的危险结论（若冲突，该情形会在 CSP 中被淘汰）。
      if (!fixed.has(cell)) fixed.set(cell, false);
    });

    // 该情形在各石板观测回合贡献的守卫数 → 剩余陷阱计数。
    const built = slateAround.map(({ slate, around }) => {
      const pos = positionsForPhases(tracks, m.phases, slate.turn);
      const guardCount = pos.filter((p) => around.includes(p)).length;
      let remaining = slate.number - guardCount;
      const vars: number[] = [];
      for (const id of around) {
        const f = fixed.get(id);
        if (f === true) remaining -= 1; // 已确认陷阱计入
        else if (f === undefined) vars.push(id); // 仅未知格作为变量
      }
      return { vars, remaining };
    });

    const key = built
      .map((c) => `${c.vars.join(".")}=${c.remaining}`)
      .join("|");
    let solved = cspCache.get(key);
    if (!solved) {
      const csp: TrapCsp = {
        fixed,
        mineBudget: board.mines,
        cellCount: board.cells.length,
        constraints: built,
      };
      const result = solveTrapCsp(csp);
      solved = { feasible: result.feasible, possible: result.possibleTraps };
      cspCache.set(key, solved);
    }
    if (!solved.feasible) continue; // 新公开事实淘汰旧可能
    const situation: Situation = {
      phases: m.phases,
      positions: m.positions,
      trapsFeasible: true,
      origin: m.phases,
      merged: m.n,
    };
    situations.push(situation);
    for (const cell of m.positions)
      guardHits.set(cell, (guardHits.get(cell) ?? 0) + m.n);
    for (const cell of solved.possible)
      trapRisk.set(cell, (trapRisk.get(cell) ?? 0) + m.n);
  }

  const totalWeight = situations.reduce((sum, s) => sum + s.merged, 0);
  const safeCells = new Set<number>();
  const certainGuardCells = new Set<number>();
  for (const c of board.cells) {
    const gh = guardHits.get(c.id) ?? 0;
    const tr = trapRisk.get(c.id) ?? 0;
    // 所有情形都安全才给安全结论。
    if (gh === 0 && tr === 0 && totalWeight > 0) safeCells.add(c.id);
    if (gh === totalWeight && totalWeight > 0) certainGuardCells.add(c.id);
  }

  return {
    situations,
    guardHits,
    trapRisk,
    safeCells,
    certainGuardCells,
    truncated,
    enumerated,
  };
}

/** 单格风险判定：只依据幸存的联合情形。 */
export function assessCell(
  analysis: SituationAnalysis,
  cell: number,
  totalSituations: number,
) {
  const guardHits = analysis.guardHits.get(cell) ?? 0;
  const trapHits = analysis.trapRisk.get(cell) ?? 0;
  const reasons: string[] = [];
  if (guardHits > 0)
    reasons.push(
      `有 ${guardHits}/${totalSituations} 种巡逻情形中守卫本回合站在该格`,
    );
  if (trapHits > 0)
    reasons.push(
      `有 ${trapHits}/${totalSituations} 种情形下该格仍可能是固定陷阱`,
    );
  return {
    cell,
    situations: totalSituations,
    guardHits,
    trapHits,
    safe: guardHits === 0 && trapHits === 0 && totalSituations > 0,
    reasons,
  };
}
