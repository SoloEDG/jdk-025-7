import type { Expedition } from "../../../shared/types";
import { logAction } from "../../../shared/initial";

export function hasTool(
  e: Expedition,
  tool: "probe" | "flare" | "shield",
): boolean {
  return e.tools[tool] > 0 && !e.paused && (e.status === "active" || e.status === "ready");
}

/** 守护符石即时激活：不构成回合行动，不推进回合。 */
export function activateShield(e: Expedition): Expedition {
  if (!hasTool(e, "shield") || e.shield || e.pending) return e;
  return logAction(
    {
      ...e,
      shield: true,
      used: e.used + 1,
      tools: { ...e.tools, shield: e.tools.shield - 1 },
    },
    "shield",
    null,
    "守护符石已激活（第 " + e.turn + " 回合），将抵挡下一次陷阱或守卫伤害。",
  );
}
