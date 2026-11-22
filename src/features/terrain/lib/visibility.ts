import type { Board, PublicBoard } from "../../../shared/types";
import { guardCellAt } from "./generator";

/** 推断模块唯一可用的地图视图：不含任何暗处真相。 */
export function publicBoard(board: Board): PublicBoard {
  return {
    width: board.width,
    height: board.height,
    mines: board.mines,
    guardCount: board.guardCount,
    zones: board.zones,
    guards: board.guards.map((g) => ({ id: g.id, track: [...g.track] })),
    cells: board.cells.map((c) => ({
      id: c.id,
      revealed: c.revealed,
      mark: c.mark,
      intel: c.intel,
      intelTurn: c.intelTurn,
      flagTurn: c.flagTurn,
      observedAt: c.observedAt,
      observedNumber: c.observedNumber,
      seenGuardTurn: c.seenGuardTurn,
    })),
  };
}

/** 真相层：某回合初每名守卫的位置。 */
export function positionsAt(board: Board, turn: number): number[] {
  return board.guards.map((g) => guardCellAt(g, turn));
}

export function explored(board: Board) {
  return board.cells.filter((c) => c.revealed && !c.mine).length;
}

export function flagged(board: Board) {
  return board.cells.filter((c) => c.mark === "flag").length;
}
