import type { IntentKind } from "./types";

/**
 * 回合制命令：
 * - plan/cancelPlan 只登记或撤回待确认意图，绝不推进回合；
 * - confirm 才按固定次序执行并恰好推进一个回合；
 * - inspect 仅展开侧栏，不推进。
 */
export type Command =
  | { type: "plan"; kind: IntentKind; cell?: number }
  | { type: "cancelPlan" }
  | { type: "confirm" }
  | { type: "selectTool"; tool: "explore" | "probe" | "flare" }
  | { type: "mark"; id: number }
  | { type: "shield" }
  | { type: "inspect"; open: boolean }
  | { type: "pause"; paused?: boolean }
  | { type: "tick" }
  | { type: "extract" }
  | { type: "new"; difficulty: import("./types").Difficulty; seed: string };
