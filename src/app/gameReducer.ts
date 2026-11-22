import type { Workspace } from "../shared/types";
import type { Command } from "../shared/commands";
import { isTerminal, emptyArchive, logAction } from "../shared/initial";
import { blankBoard } from "../features/terrain";
import { createExpedition, mayAct } from "../features/exploration";
import {
  cancelPlan,
  confirmTurn,
  cycleMark,
  planIntent,
} from "../features/exploration/model/turn";
import { activateShield } from "../features/tools";
import { settle } from "../features/chronicle";

export function initialGame(): Workspace {
  return {
    doc: {
      version: 2,
      expedition: createExpedition(
        blankBoard("scout", "RUIN-025"),
        crypto.randomUUID(),
        Date.now(),
      ),
      archive: emptyArchive(),
    },
    notice: "",
  };
}

export function gameReducer(state: Workspace, c: Command): Workspace {
  let e = state.doc.expedition;
  let archive = state.doc.archive;
  switch (c.type) {
    case "new": {
      const seed = c.seed.trim().slice(0, 40) || "RUIN-025";
      return {
        ...state,
        doc: {
          ...state.doc,
          expedition: createExpedition(
            blankBoard(c.difficulty, seed),
            crypto.randomUUID(),
            Date.now(),
          ),
        },
        notice: "新的石板地图已准备好，守卫按公开路线巡逻；确认意图才会推进回合。",
      };
    }
    case "plan":
      // 仅登记意图：不推进回合、不结算。
      if (e.status === "ready" && c.kind !== "explore") {
        return { ...state, notice: "首次行动必须先探索一块石板。" };
      }
      e = planIntent(e, c.kind, c.cell ?? null);
      break;
    case "cancelPlan":
      e = cancelPlan(e);
      break;
    case "selectTool":
      // 只切换点选模式，不推进；有待确认意图时禁止切换。
      if (!e.pending && mayAct(e)) e = { ...e, tool: c.tool };
      break;
    case "confirm":
      // 幂等：没有待确认意图时重复点击不会多走一回合或多结算。
      e = confirmTurn(e);
      break;
    case "mark":
      e = cycleMark(e, c.id);
      break;
    case "shield":
      e = activateShield(e);
      break;
    case "inspect":
      // 仅展开/收起信息面板，状态变化不推进回合、不结算发现。
      return {
        ...state,
        doc: {
          ...state.doc,
          expedition: { ...state.doc.expedition, inspectOpen: c.open },
        },
      };
    case "pause":
      if (e.status === "active" || e.status === "ready")
        e = { ...e, paused: c.paused ?? !e.paused };
      break;
    case "tick":
      if ((e.status === "active" || e.status === "ready") && !e.paused)
        e = { ...e, elapsed: e.elapsed + 1 };
      break;
    case "extract":
      if ((e.status === "active" || e.status === "ready") && !e.paused)
        e = logAction(
          { ...e, status: "extracted", pending: null },
          "extract",
          null,
          `第 ${e.turn} 回合携带发现撤离，探险已归档。`,
        );
      break;
    default:
      return state;
  }
  if (e === state.doc.expedition) return state;
  if (isTerminal(e.status)) archive = settle(archive, e, Date.now());
  return { ...state, doc: { ...state.doc, expedition: e, archive } };
}
