import { Backpack, ScanLine, Flame, ShieldCheck, Check } from "lucide-react";
import type { Expedition } from "../../../shared/types";
import type { Command } from "../../../shared/commands";
import { toolCatalog } from "../model/catalog";
import { hasTool } from "../model/useTool";

const ICONS = [ScanLine, Flame, ShieldCheck];

export function ToolPanel({
  expedition: e,
  send,
}: {
  expedition: Expedition;
  send: (c: Command) => void;
}) {
  return (
    <section className="tool-panel">
      <div className="panel-heading">
        <Backpack size={15} />
        <h2>随身行囊</h2>
        <span>有限补给</span>
      </div>
      <div className="tool-list">
        {toolCatalog.map((t, i) => {
          const Icon = ICONS[i];
          const isShield = t.id === "shield";
          const selected = isShield ? e.shield : e.tool === t.id;
          const disabled = isShield
            ? !hasTool(e, "shield") || e.shield || !!e.pending
            : !hasTool(e, t.id) || !!e.pending;
          return (
            <button
              key={t.id}
              title={t.description}
              disabled={disabled}
              aria-pressed={selected}
              className={"tool-card " + (selected ? "selected" : "")}
              onClick={() =>
                isShield
                  ? send({ type: "shield" })
                  : send({ type: "selectTool", tool: t.id })
              }
            >
              <span className={"tool-icon tool-" + t.id}>
                <Icon size={21} />
              </span>
              <span>
                <strong>{t.name}</strong>
                <small>{t.subtitle}</small>
              </span>
              <span className="tool-stock">
                {isShield && e.shield ? (
                  <Check size={14} />
                ) : (
                  <>
                    ×<b>{e.tools[t.id]}</b>
                  </>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <p className="tool-note">
        探针与火把是回合行动：点选石板登记意图，确认后才推进。
        <br />
        所有结论与旗标都会标注回合，刷新后可继续推断。
      </p>
    </section>
  );
}
