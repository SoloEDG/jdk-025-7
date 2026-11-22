import type {
  Expedition,
  Footstep,
  PublicBoard,
  Sighting,
  SlateObservation,
} from "../../../shared/types";
import { publicBoard } from "../../terrain/lib/visibility";
import type { Evidence } from "../lib/situations";

/** 只从公开记录重建证据，所有条目保留原始回合；刷新后据此继续推断。 */
export function buildEvidence(e: Expedition): Evidence {
  return {
    turn: e.turn,
    footsteps: e.footsteps.map((f): Footstep => ({ ...f })),
    sightings: e.sightings.map((s): Sighting => ({ ...s })),
    slates: e.slates.map((s): SlateObservation => ({ ...s })),
  };
}

export function boardForInference(e: Expedition): PublicBoard {
  return publicBoard(e.board);
}
