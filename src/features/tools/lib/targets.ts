import type { Expedition } from "../../../shared/types";

export function canTarget(e: Expedition, id: number) {
  const c = e.board.cells[id];
  return (
    (e.status === "active" || e.status === "ready") &&
    !e.paused &&
    !e.pending &&
    !!c &&
    !c.revealed &&
    c.mark !== "flag"
  );
}
