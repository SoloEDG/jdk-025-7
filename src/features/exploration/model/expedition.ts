import type { Board, Expedition } from "../../../shared/types";

export function createExpedition(
  board: Board,
  id: string,
  now: number,
): Expedition {
  return {
    id,
    board,
    status: "ready",
    lives: 3,
    shield: false,
    tools: { probe: 2, flare: 1, shield: 1 },
    used: 0,
    mistakes: 0,
    turn: 0,
    elapsed: 0,
    paused: false,
    actions: [],
    nextAction: 1,
    selected: null,
    startedAt: now,
    footsteps: [],
    sightings: [],
    slates: [],
    guardPositions: [],
    pending: null,
    tool: "explore",
    inspectOpen: false,
  };
}

export function mayAct(e: Expedition) {
  return !e.paused && (e.status === "ready" || e.status === "active");
}
