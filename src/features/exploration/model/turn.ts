import type {
  ActionKind,
  Board,
  Expedition,
  IntentKind,
  PendingIntent,
} from "../../../shared/types";
import { coordinate, neighbors } from "../../../shared/geometry";
import { logAction } from "../../../shared/initial";
import { mayAct } from "./expedition";
import { floodOpen } from "../lib/flood";
import {
  advanceGuardPositions,
  footstepReport,
} from "../../terrain/lib/patrol";
import { generateBoard, guardCellAt } from "../../terrain/lib/generator";

export function planIntent(
  e: Expedition,
  kind: IntentKind,
  cell: number | null,
): Expedition {
  if (!mayAct(e) || e.pending) return e;
  // 首次行动必须是探索（reducer 也会拦，模型层保持自洽）。
  if (e.status === "ready" && kind !== "explore") return e;
  if (kind === "wait") {
    return { ...e, pending: { kind, cell: null, turn: e.turn } };
  }
  const target = e.board.cells[cell ?? -1];
  if (!target || target.revealed || target.mark === "flag") return e;
  if ((kind === "probe" && e.tools.probe <= 0) || (kind === "flare" && e.tools.flare <= 0))
    return e;
  return { ...e, pending: { kind, cell, turn: e.turn } };
}

export function cancelPlan(e: Expedition): Expedition {
  return e.pending ? { ...e, pending: null } : e;
}

/** 给本回合新揭开的格盖观测数据（数字冻结、目击回合）。 */
function stampObservations(
  board: Board,
  opened: number[],
  turn: number,
  positions: number[],
): Board {
  const occupied = new Set(positions);
  return {
    ...board,
    cells: board.cells.map((c) => {
      if (!opened.includes(c.id) || c.mine) return c;
      const guardAround = neighbors(c.id, board.width, board.height).filter(
        (n) => occupied.has(n),
      ).length;
      return {
        ...c,
        observedAt: turn,
        observedNumber: c.trapAdjacent + guardAround,
        seenGuardTurn: occupied.has(c.id) ? turn : c.seenGuardTurn,
      };
    }),
  };
}

/**
 * 确认意图 → 按 TURN_SEQUENCE 的固定次序执行，恰好推进一个回合。
 * 纯函数：真相只从 board.guards[].phase 读取，推断层不接触它。
 */
export function confirmTurn(e: Expedition): Expedition {
  const intent = e.pending;
  if (!intent || !mayAct(e)) return e;
  const turn = e.turn;
  let board = e.board;
  let lives = e.lives;
  let shield = e.shield;
  let mistakes = e.mistakes;
  let tools = { ...e.tools };
  let used = e.used;
  const logs: { kind: ActionKind; cell: number | null; message: string }[] = [];
  const slates = [...e.slates];
  const sightings = [...e.sightings];

  // 首步探索时生成地图（保证首步及邻格无陷阱、无守卫）。
  if (e.status === "ready") {
    if (intent.kind !== "explore" || intent.cell === null) return e;
    board = generateBoard(board, intent.cell);
  }

  // 步骤 2：回合初观测（守卫移动前）。
  const beforePositions = board.guards.map((g) => guardCellAt(g, turn));
  const occupiedBefore = new Set(beforePositions);
  const guardAt = (cell: number) => (occupiedBefore.has(cell) ? 1 : 0);

  let opened: number[] = [];
  let trapHit = false;

  if (intent.kind === "explore" && intent.cell !== null) {
    const target = board.cells[intent.cell];
    if (target.mine) {
      trapHit = true;
      board = {
        ...board,
        cells: board.cells.map((c) =>
          c.id === target.id
            ? { ...c, revealed: true, observedAt: turn, observedNumber: null }
            : c,
        ),
      };
      logs.push({
        kind: "hit",
        cell: target.id,
        message: `${coordinate(target.id, board.width)} 的固定陷阱触发。`,
      });
    } else {
      // 步骤 2 + 3：先按空区规则揭开，再统一冻结本回合观测数字。
      const flood = floodOpen(board, [target.id], guardAt);
      opened = flood.opened;
      board = stampObservations({ ...board, cells: flood.cells }, opened, turn, beforePositions);
      for (const id of opened) {
        const c = board.cells[id];
        if (c.observedNumber !== null)
          slates.push({ turn, cell: id, number: c.observedNumber });
        sightings.push({ turn, cell: id, present: occupiedBefore.has(id) });
      }
      logs.push({
        kind: "explore",
        cell: target.id,
        message: `第 ${turn} 回合探索 ${coordinate(target.id, board.width)}，揭开 ${opened.length} 块石板。`,
      });
    }
  } else if (intent.kind === "probe" && intent.cell !== null) {
    // 步骤 4：探针只确认固定陷阱，不揭开、不结算守卫、不消耗回合外信息。
    const id = intent.cell;
    const isTrap = board.cells[id].mine;
    board = {
      ...board,
      cells: board.cells.map((c) =>
        c.id === id
          ? { ...c, intel: isTrap ? "danger" : "safe", intelTurn: turn }
          : c,
      ),
    };
    tools.probe -= 1;
    used += 1;
    logs.push({
      kind: "probe",
      cell: id,
      message: `第 ${turn} 回合探针：${coordinate(id, board.width)} ${isTrap ? "存在固定陷阱" : "没有固定陷阱"}。`,
    });
  } else if (intent.kind === "flare" && intent.cell !== null) {
    const id = intent.cell;
    const isTrap = board.cells[id].mine;
    if (isTrap) {
      board = {
        ...board,
        cells: board.cells.map((c) =>
          c.id === id ? { ...c, intel: "danger", intelTurn: turn } : c,
        ),
      };
      logs.push({
        kind: "flare",
        cell: id,
        message: `第 ${turn} 回合肥火把照亮 ${coordinate(id, board.width)}：确认是固定陷阱，未触发。`,
      });
    } else {
      const flood = floodOpen(board, [id], guardAt);
      opened = flood.opened;
      board = stampObservations({ ...board, cells: flood.cells }, opened, turn, beforePositions);
      for (const oid of opened) {
        const c = board.cells[oid];
        if (c.observedNumber !== null)
          slates.push({ turn, cell: oid, number: c.observedNumber });
        sightings.push({ turn, cell: oid, present: occupiedBefore.has(oid) });
      }
      logs.push({
        kind: "flare",
        cell: id,
        message: `第 ${turn} 回合肥火把照亮 ${coordinate(id, board.width)}，揭开 ${opened.length} 块石板。`,
      });
    }
    tools.flare -= 1;
    used += 1;
  } else if (intent.kind === "wait") {
    logs.push({
      kind: "wait",
      cell: null,
      message: `第 ${turn} 回合原地等待，观察守卫动向。`,
    });
  }

  // 陷阱伤害（观测时结算，护符可挡一次）。
  if (trapHit) {
    mistakes += 1;
    if (shield) {
      shield = false;
      logs.push({ kind: "shield", cell: null, message: "守护符石挡住了陷阱伤害。" });
    } else {
      lives -= 1;
    }
  }

  // 步骤 5：守卫移动（下一回合初的位置），共格由巡逻模块防御性校验。
  const nextTurn = turn + 1;
  const nextPositions = advanceGuardPositions(board, nextTurn);
  const occupiedAfter = new Set(nextPositions);

  // 步骤 6：守卫移动后踏入本回合揭开的石板才造成伤害。
  if (opened.length) {
    const entered = opened.filter((id) => occupiedAfter.has(id));
    if (entered.length) {
      mistakes += 1;
      const where = entered.map((id) => coordinate(id, board.width)).join("、");
      if (shield) {
        shield = false;
        logs.push({
          kind: "shield",
          cell: entered[0],
          message: `守卫移动后踏入 ${where}，守护符石挡住了伤害。`,
        });
      } else {
        lives -= 1;
        logs.push({
          kind: "hit",
          cell: entered[0],
          message: `守卫移动后踏入 ${where}，受到 1 点伤害。`,
        });
      }
    } else {
      logs.push({
        kind: "wait",
        cell: null,
        message: "守卫本轮移动后未踏入新揭开的区域。",
      });
    }
  }

  // 步骤 7：下一回合初的脚步报告（区域计数，不含具体格）。
  const steps = footstepReport(board, nextTurn, nextPositions);

  // 步骤 8：回合推进、胜负判定。
  const safeRevealed = board.cells.filter((c) => c.revealed && !c.mine).length;
  const totalSafe = board.cells.length - board.mines;
  const status =
    lives <= 0
      ? "lost"
      : safeRevealed >= totalSafe
        ? "won"
        : "active";

  let next: Expedition = {
    ...e,
    board,
    lives: Math.max(0, lives),
    shield,
    tools,
    used,
    mistakes,
    turn: nextTurn,
    status,
    pending: null,
    selected: intent.cell,
    guardPositions: nextPositions,
    footsteps: [...e.footsteps, ...steps],
    sightings,
    slates,
  };
  for (const log of logs)
    next = logAction(next, log.kind, log.cell, log.message, nextTurn);
  return next;
}

/** 旗标/疑问循环：不推进回合，记录所属回合。 */
export function cycleMark(e: Expedition, id: number): Expedition {
  if (!mayAct(e)) return e;
  const c = e.board.cells[id];
  if (!c || c.revealed) return e;
  const flags = e.board.cells.filter((v) => v.mark === "flag").length;
  if (c.mark === "none" && flags >= e.board.mines) return e;
  const mark =
    c.mark === "none" ? "flag" : c.mark === "flag" ? "question" : "none";
  const board: Board = {
    ...e.board,
    cells: e.board.cells.map((v) =>
      v.id === id
        ? {
            ...v,
            mark,
            flagTurn: mark === "flag" ? e.turn : mark === "question" ? v.flagTurn : null,
          }
        : v,
    ),
  };
  return logAction(
    { ...e, board, selected: id },
    "mark",
    id,
    `${coordinate(id, board.width)}：${mark === "flag" ? "插下旗标（第 " + e.turn + " 回合判断）" : mark === "question" ? "改为疑问标记" : "移除标记"}。`,
    e.turn,
  );
}

export function pendingSummary(e: Expedition): PendingIntent | null {
  return e.pending;
}
