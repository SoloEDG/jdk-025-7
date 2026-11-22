import type { ActionKind, Archive, Expedition, Status } from "./types";

export function emptyArchive(): Archive {
  return { reports: [], discoveries: {}, totalScore: 0 };
}

export function isTerminal(status: Status) {
  return status === "won" || status === "lost" || status === "extracted";
}

export function logAction(
  e: Expedition,
  kind: ActionKind,
  cell: number | null,
  message: string,
  turn = e.turn,
): Expedition {
  return {
    ...e,
    nextAction: e.nextAction + 1,
    actions: [
      ...e.actions,
      { id: e.nextAction, kind, cell, message, turn },
    ].slice(-100),
  };
}
