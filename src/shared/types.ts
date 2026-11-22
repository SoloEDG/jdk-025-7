export type Difficulty = "scout" | "scholar" | "legend";
export type Status = "ready" | "active" | "won" | "lost" | "extracted";
export type Mark = "none" | "flag" | "question";
export type RelicId = "sun" | "vessel" | "tablet";
export type Terrain = "moss" | "stone" | "water";
export type Intel = "unknown" | "safe" | "danger";
export type IntentKind = "explore" | "wait" | "probe" | "flare";

/** 公开巡逻规则：每名守卫沿一条封闭路线循环行进；phase 是隐藏的初始相位。 */
export interface GuardDef {
  id: number;
  /** 公开巡逻路线（闭合环，格 id 不重复）。 */
  track: number[];
  /** 隐藏真相：出发时位于 track 的哪个下标。 */
  phase: number;
}

export interface Cell {
  id: number;
  /** 固定陷阱真相（未揭开前不公开）。 */
  mine: boolean;
  revealed: boolean;
  mark: Mark;
  /** 探针/火把得到的公开结论。 */
  intel: Intel;
  /** 公开结论所属回合。 */
  intelTurn: number | null;
  /** 旗标所属回合（旗标只是玩家判断，不是证据）。 */
  flagTurn: number | null;
  relic: RelicId | null;
  terrain: Terrain;
  /** 真相：相邻固定陷阱数（推断时作为未知变量处理）。 */
  trapAdjacent: number;
  /** 这块石板被观测（揭开）时的回合，数字永久冻结在该回合。 */
  observedAt: number | null;
  /** 观测时显示的数字 = 固定陷阱 + 当时相邻守卫。 */
  observedNumber: number | null;
  /** 直接目击守卫的回合（守卫当时正站在这块石板上）。 */
  seenGuardTurn: number | null;
}

export interface Zone {
  id: number;
  name: string;
  cells: number[];
}

/** 脚步：只报告某区域在某回合的守卫数量，不报告具体格。 */
export interface Footstep {
  turn: number;
  zone: number;
  count: number;
}

/** 直接目击：某回合某格是否有守卫（揭开/探针/火把均可产生）。 */
export interface Sighting {
  turn: number;
  cell: number;
  present: boolean;
}

/** 石板数字观测：回合、格、当时显示的数字。 */
export interface SlateObservation {
  turn: number;
  cell: number;
  number: number;
}

export interface Board {
  width: number;
  height: number;
  mines: number;
  guardCount: number;
  seed: string;
  difficulty: Difficulty;
  generated: boolean;
  cells: Cell[];
  zones: Zone[];
  guards: GuardDef[];
}

export type ActionKind =
  | "explore"
  | "wait"
  | "probe"
  | "flare"
  | "shield"
  | "mark"
  | "hit"
  | "extract";

export interface ActionEntry {
  id: number;
  kind: ActionKind;
  cell: number | null;
  message: string;
  turn: number;
}

/** 待确认的行动意图：只登记，不推进；确认后才恰好推进一个回合。 */
export interface PendingIntent {
  kind: IntentKind;
  cell: number | null;
  turn: number;
}

export interface Expedition {
  id: string;
  board: Board;
  status: Status;
  lives: number;
  shield: boolean;
  tools: { probe: number; flare: number; shield: number };
  used: number;
  mistakes: number;
  /** 当前回合号；守卫位置停在本回合初，等待玩家确认行动。 */
  turn: number;
  elapsed: number;
  paused: boolean;
  actions: ActionEntry[];
  nextAction: number;
  selected: number | null;
  startedAt: number;
  /** 每个回合初的脚步报告（按区域计数）。 */
  footsteps: Footstep[];
  /** 联合证据：全部带回合标签，刷新后据此重新推断。 */
  sightings: Sighting[];
  slates: SlateObservation[];
  /** 真相：本回合初每名守卫所在格（仅用于结算，推断模块禁止读取）。 */
  guardPositions: number[];
  pending: PendingIntent | null;
  /** 当前点选石板时登记的意图类型（等待不需要目标）。 */
  tool: "explore" | "probe" | "flare";
  /** 信息面板展开状态：仅 UI 状态，不推进回合。 */
  inspectOpen: boolean;
}

export interface Report {
  id: string;
  seed: string;
  difficulty: Difficulty;
  outcome: Status;
  safe: number;
  totalSafe: number;
  relics: RelicId[];
  score: number;
  seconds: number;
  turns: number;
  used: number;
  mistakes: number;
  endedAt: number;
}

export interface Archive {
  reports: Report[];
  discoveries: Partial<Record<RelicId, number>>;
  totalScore: number;
}

export interface GameDocument {
  version: 2;
  expedition: Expedition;
  archive: Archive;
}

/** 推断用的公开石板视图：看不到 mine 真相，只能看到冻结的观测数字。 */
export interface PublicCell {
  id: number;
  revealed: boolean;
  mark: Mark;
  intel: Intel;
  intelTurn: number | null;
  flagTurn: number | null;
  observedAt: number | null;
  observedNumber: number | null;
  seenGuardTurn: number | null;
}

export interface PublicBoard {
  width: number;
  height: number;
  mines: number;
  guardCount: number;
  cells: PublicCell[];
  zones: Zone[];
  guards: { id: number; track: number[] }[];
}

/** 一个仍然可能的联合巡逻情形：每名守卫的相位 + 守卫各回合格序列。 */
export interface Situation {
  /** 各守卫在当前回合初的相位。 */
  phases: number[];
  /** 各守卫在当前回合初的位置。 */
  positions: number[];
  /** 该情形下固定陷阱是否存在可行排布。 */
  trapsFeasible: boolean;
  /** 代表性来源：出发相位（合并后可能对应多个初始相位）。 */
  origin: number[];
  merged: number;
}

export interface RiskVerdict {
  cell: number;
  situations: number;
  /** 该格当前回合有守卫的情形数。 */
  guardHits: number;
  /** 该格可能是固定陷阱的情形数（存在可行陷阱排布）。 */
  trapHits: number;
  /** 只有所有联合情形都判定安全，才给安全结论。 */
  safe: boolean;
  reasons: string[];
}

export interface Workspace {
  doc: GameDocument;
  notice: string;
}
