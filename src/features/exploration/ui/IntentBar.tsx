import { Pickaxe, Hourglass, ScanLine, Flame, Check, X } from "lucide-react";
import type { Expedition, IntentKind } from "../../../shared/types";
import type { Command } from "../../../shared/commands";
import { coordinate } from "../../../shared/geometry";
import { INTENT_LABEL } from "../lib/sequence";

const INTENT_ICONS = {
  explore: Pickaxe,
  wait: Hourglass,
  probe: ScanLine,
  flare: Flame,
} as const;

export function IntentBar({
  expedition: e,
  send,
}: {
  expedition: Expedition;
  send: (c: Command) => void;
}) {
  const blocked =
    e.paused || ["won", "lost", "extracted"].includes(e.status);
  const pending = e.pending;

  const toolButton = (
    tool: "explore" | "probe" | "flare",
    stock?: number,
  ) => (
    <button
      key={tool}
      className={"intent-card " + (e.tool === tool ? "selected" : "")}
      disabled={blocked || !!pending || (stock !== undefined && stock <= 0)}
      aria-pressed={e.tool === tool}
      onClick={() => send({ type: "selectTool", tool })}
    >
      {INTENT_ICONS[tool] && (() => {
        const Icon = INTENT_ICONS[tool];
        return <Icon size={17} />;
      })()}
      <span>
        <strong>
          {tool === "explore" ? "探索" : tool === "probe" ? `探针 ×${stock}` : `火把 ×${stock}`}
        </strong>
        <small>
          {tool === "explore"
            ? "点石板登记探索"
            : tool === "probe"
              ? "点石板登记探针"
              : "点石板登记火把"}
        </small>
      </span>
    </button>
  );

  return (
    <section className="intent-panel">
      <div className="intent-heading">
        <span className="eyebrow">TURN ORDER / 回合 {e.turn}</span>
        <p>
          {pending
            ? "意图已登记，尚未推进；确认后才按固定次序结算一个回合。"
            : "点击石板登记当前行动，或直接等待；展开任何面板都不会推进。"}
        </p>
      </div>
      {!pending ? (
        <div className="intent-choices">
          {toolButton("explore")}
          <button
            className="intent-card"
            disabled={blocked}
            onClick={() => send({ type: "plan", kind: "wait" })}
          >
            <Hourglass size={17} />
            <span>
              <strong>等待</strong>
              <small>原地观察一回合</small>
            </span>
          </button>
          {toolButton("probe", e.tools.probe)}
          {toolButton("flare", e.tools.flare)}
        </div>
      ) : (
        <div className="intent-confirm" role="status">
          <span className="intent-pending-card">
            {(() => {
              const Icon = INTENT_ICONS[pending.kind];
              return <Icon size={18} />;
            })()}
            <span>
              <strong>
                待确认 · {INTENT_LABEL[pending.kind as IntentKind]}
                {pending.cell !== null
                  ? ` ${coordinate(pending.cell, e.board.width)}`
                  : ""}
              </strong>
              <small>登记于第 {pending.turn} 回合，确认前一切不变</small>
            </span>
          </span>
          <div className="intent-buttons">
            <button
              className="outline-button"
              onClick={() => send({ type: "cancelPlan" })}
            >
              <X size={14} />
              撤回
            </button>
            <button
              className="primary"
              autoFocus
              // 幂等：确认后 pending 立即清空，重复点击不再触发结算。
              onClick={() => send({ type: "confirm" })}
            >
              <Check size={14} />
              确认并推进 1 回合
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
