export { RegionPanel } from "./ui/RegionPanel";
export { BoardView } from "./ui/BoardView";
export { region, regions } from "./model/regions";
export type { RegionSpec } from "./model/regions";
export { blankBoard, generateBoard, guardCellAt, validateGuards, buildZones } from "./lib/generator";
export { publicBoard, explored, flagged, positionsAt } from "./lib/visibility";
export { advanceGuardPositions, footstepReport, positionsForPhases } from "./lib/patrol";
