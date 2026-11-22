import type { Board, Footstep } from "../../../shared/types";
import { guardCellAt } from "./generator";
import { cellZone } from "../../../shared/geometry";

/**
 * 公开巡逻规则的真相执行：
 * 每名守卫沿 track 每回合前进一步（下标 +1，取模）。
 * 路线在生成时保证互不重叠，因此任意回合都不可能共格；
 * 这里仍做防御性校验，一旦共格立即抛出，避免静默错误。
 */
export function advanceGuardPositions(board: Board, turn: number): number[] {
  const positions = board.guards.map((g) => guardCellAt(g, turn));
  if (new Set(positions).size !== positions.length) {
    throw new Error("巡逻规则被破坏：两名守卫占据同一格");
  }
  return positions;
}

/** 脚步只报告区域数量，不透露具体格；未被占据的区域计数为 0 也显式记录。 */
export function footstepReport(
  board: Board,
  turn: number,
  positions: number[],
): Footstep[] {
  const counts = new Map<number, number>(
    board.zones.map((z) => [z.id, 0]),
  );
  for (const cell of positions) {
    const zone = cellZone(cell, board.zones);
    counts.set(zone, (counts.get(zone) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([zone, count]) => ({ turn, zone, count }));
}

/** 某情形（给定各守卫相位）在指定回合初的位置序列。推断模块的纯函数版本。 */
export function positionsForPhases(
  tracks: number[][],
  phases: number[],
  turn: number,
): number[] {
  return tracks.map((track, i) => track[(phases[i] + turn) % track.length]);
}
