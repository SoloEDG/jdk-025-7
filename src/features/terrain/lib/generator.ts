import type { Board, Cell, Difficulty, GuardDef, Zone } from "../../../shared/types";
import { neighbors } from "../../../shared/geometry";
import { seedHash, shuffled } from "../../../shared/random";
import { region } from "../model/regions";

export function buildZones(width: number, height: number, cols: number, rows: number): Zone[] {
  const zones: Zone[] = [];
  for (let zy = 0; zy < rows; zy++)
    for (let zx = 0; zx < cols; zx++) {
      const cells: number[] = [];
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
          const czx = Math.min(cols - 1, Math.floor(((x + 1) * cols) / width));
          const czy = Math.min(rows - 1, Math.floor(((y + 1) * rows) / height));
          if (czx === zx && czy === zy) cells.push(y * width + x);
        }
      zones.push({ id: zy * cols + zx, name: `${zx + 1}-${zy + 1} 区`, cells });
    }
  return zones;
}

export function buildGuards(spec: ReturnType<typeof region>, width: number): GuardDef[] {
  return spec.tracks.map((track, id) => ({
    id,
    track: track.map(([x, y]) => y * width + x),
    phase: 0,
  }));
}

/** 公开规则校验：路线闭合相邻、格不重复、守卫之间永不共格。 */
export function validateGuards(board: Pick<Board, "width" | "height" | "guards">): boolean {
  const occupied = new Set<number>();
  for (const g of board.guards) {
    if (new Set(g.track).size !== g.track.length) return false;
    for (let i = 0; i < g.track.length; i++) {
      const a = g.track[i],
        b = g.track[(i + 1) % g.track.length];
      const ax = a % board.width,
        ay = Math.floor(a / board.width),
        bx = b % board.width,
        by = Math.floor(b / board.width);
      if (Math.abs(ax - bx) + Math.abs(ay - by) !== 1) return false;
      if (occupied.has(a)) return false;
    }
    g.track.forEach((c) => occupied.add(c));
  }
  return true;
}

export function blankBoard(difficulty: Difficulty, seed: string): Board {
  const r = region(difficulty);
  const zones = buildZones(r.width, r.height, r.zoneCols, r.zoneRows);
  const guards = buildGuards(r, r.width);
  return {
    width: r.width,
    height: r.height,
    mines: r.mines,
    guardCount: r.guardCount,
    seed,
    difficulty,
    generated: false,
    zones,
    guards,
    cells: Array.from({ length: r.width * r.height }, (_, id): Cell => ({
      id,
      mine: false,
      revealed: false,
      mark: "none",
      intel: "unknown",
      intelTurn: null,
      flagTurn: null,
      relic: null,
      terrain: id % 17 === 0 ? "water" : id % 5 === 0 ? "moss" : "stone",
      trapAdjacent: 0,
      observedAt: null,
      observedNumber: null,
      seenGuardTurn: null,
    })),
  };
}

/** 守卫在给定回合初的格（真相，仅供结算层使用）。 */
export function guardCellAt(g: GuardDef, turn: number): number {
  return g.track[(g.phase + turn) % g.track.length];
}

export function generateBoard(board: Board, first: number): Board {
  const excluded = new Set([
    first,
    ...neighbors(first, board.width, board.height),
  ]);
  const guardTracks = new Set(board.guards.flatMap((g) => g.track));
  const candidates = shuffled(
    board.cells
      .map((c) => c.id)
      .filter((id) => !excluded.has(id) && !guardTracks.has(id)),
    seedHash(board.seed),
  );
  const hazards = new Set(candidates.slice(0, board.mines));

  // 隐藏初始相位：真相从伪随机流生成，推断模块永不读取。
  let rnd = seedHash(board.seed + ":phase");
  const guards = board.guards.map((g) => {
    const allowed = g.track
      .map((cell, phase) => ({ cell, phase }))
      .filter((v) => !excluded.has(v.cell));
    rnd = (Math.imul(rnd, 1664525) + 1013904223) >>> 0;
    const pick = allowed[Math.floor((rnd / 4294967296) * allowed.length)] ?? {
      phase: 0,
    };
    return { ...g, phase: pick.phase };
  });

  const safe = shuffled(
    board.cells
      .map((c) => c.id)
      .filter((id) => !hazards.has(id) && id !== first && !guardTracks.has(id)),
    seedHash(board.seed + "relic"),
  );
  const relics = new Map(
    safe
      .slice(0, 6)
      .map((id, i) => [id, (["sun", "vessel", "tablet"] as const)[i % 3]]),
  );

  return {
    ...board,
    generated: true,
    guards,
    cells: board.cells.map((c) => ({
      ...c,
      mine: hazards.has(c.id),
      trapAdjacent: neighbors(c.id, board.width, board.height).filter((id) =>
        hazards.has(id),
      ).length,
      relic: relics.get(c.id) ?? null,
      // 首步必然安全：无陷阱，且所有守卫本回合均不在此格及邻格。
      ...(c.id === first
        ? { mine: false, trapAdjacent: 0, observedAt: null, observedNumber: null }
        : {}),
    })),
  };
}
