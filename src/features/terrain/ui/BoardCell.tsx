import { Flag, HelpCircle, TriangleAlert, Gem, Eye, Footprints } from "lucide-react";
import type { Cell } from "../../../shared/types";
import { coordinate } from "../../../shared/geometry";

export interface CellRisk {
  guardRatio: number;
  trapRatio: number;
  safe: boolean;
}

export function BoardCell({
  cell: c,
  width,
  terminal,
  guardHere,
  risk,
  selected,
  onOpen,
  onMark,
  onNavigate,
}: {
  cell: Cell;
  width: number;
  terminal: boolean;
  /** 真相层：仅在游戏结束时展示守卫实际位置。 */
  guardHere: boolean;
  risk: CellRisk | null;
  selected: boolean;
  onOpen: () => void;
  onMark: () => void;
  onNavigate: (key: string) => void;
}) {
  const trapShown = c.mine && (c.revealed || terminal);
  const content = trapShown ? (
    <TriangleAlert size={17} />
  ) : guardHere && terminal ? (
    <Footprints size={16} />
  ) : c.revealed ? (
    c.relic ? (
      <Gem size={16} />
    ) : (
      c.observedNumber ?? ""
    )
  ) : c.mark === "flag" ? (
    <Flag size={16} />
  ) : c.mark === "question" ? (
    <HelpCircle size={16} />
  ) : c.intel === "danger" ? (
    <TriangleAlert size={14} />
  ) : c.intel === "safe" ? (
    <Eye size={14} />
  ) : null;

  let label = `${coordinate(c.id, width)}，`;
  label += trapShown
    ? "已触发固定陷阱"
    : c.revealed
      ? `第 ${c.observedAt} 回合观测，当时数字 ${c.observedNumber ?? "—"}${c.relic ? "，发现文物" : ""}`
      : c.mark === "flag"
        ? `第 ${c.flagTurn ?? "?"} 回合插下的旗标（玩家判断，非证据）`
        : c.mark === "question"
          ? "疑问标记"
          : c.intel === "safe"
            ? `第 ${c.intelTurn} 回合探针确认：无固定陷阱`
            : c.intel === "danger"
              ? `第 ${c.intelTurn} 回合探针确认：固定陷阱`
              : "未探索";
  if (risk && !c.revealed && !terminal)
    label += `；${risk.safe ? "全部巡逻情形下安全" : "存在风险情形"}`;

  const riskClass =
    !c.revealed && risk && !terminal
      ? risk.guardRatio > 0
        ? risk.guardRatio === 1
          ? "risk-guard-certain"
          : "risk-guard"
        : risk.trapRatio > 0
          ? risk.trapRatio === 1
            ? "risk-trap-certain"
            : "risk-trap"
          : risk.safe
            ? "risk-safe"
            : ""
      : "";

  return (
    <button
      role="gridcell"
      id={"tile-" + c.id}
      tabIndex={selected ? 0 : -1}
      aria-label={label}
      data-cell={c.id}
      className={[
        "tile",
        c.revealed ? "open" : "closed",
        trapShown ? "hazard" : "",
        guardHere && terminal ? "guard-truth" : "",
        c.revealed ? "terrain-" + c.terrain : "",
        c.mark === "flag" ? "flagged" : "",
        c.intel !== "unknown" ? "intel-" + c.intel : "",
        riskClass,
        selected ? "tile-selected" : "",
        c.revealed && !c.mine ? "number-" + (c.observedNumber ?? 0) : "",
      ].join(" ")}
      onClick={onOpen}
      onContextMenu={(e) => {
        e.preventDefault();
        onMark();
      }}
      onKeyDown={(e) => {
        if (
          ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "f", "F"].includes(
            e.key,
          )
        ) {
          e.preventDefault();
          if (e.key.toLowerCase() === "f") onMark();
          else onNavigate(e.key);
        }
      }}
    >
      {content}
      {c.revealed && c.relic && (c.observedNumber ?? 0) > 0 && (
        <span className="relic-number">{c.observedNumber}</span>
      )}
      {c.revealed && (c.observedNumber ?? 0) === 0 && !c.relic && (
        <span className="stone-dot">·</span>
      )}
      {!c.revealed &&
        c.mark === "none" &&
        c.intel === "unknown" &&
        c.id % 13 === 0 && <span className="glyph">⌑</span>}
      {c.intel !== "unknown" && !c.revealed && (
        <Eye className="intel-badge" size={7} />
      )}
      {c.observedAt !== null && (
        <span className="turn-badge">T{c.observedAt}</span>
      )}
    </button>
  );
}
