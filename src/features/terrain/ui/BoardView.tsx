import { useRef, useState } from "react";
import { Pause, Play, MapPin, Maximize2, Flag, Gem, Footprints } from "lucide-react";
import type { Expedition } from "../../../shared/types";
import type { Command } from "../../../shared/commands";
import { isTerminal } from "../../../shared/initial";
import type { SituationAnalysis } from "../../inference";
import { region } from "../model/regions";
import { BoardCell, type CellRisk } from "./BoardCell";

export function BoardView({
  expedition: e,
  analysis,
  send,
}: {
  expedition: Expedition;
  analysis: SituationAnalysis | null;
  send: (c: Command) => void;
}) {
  const [focus, setFocus] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const r = region(e.board.difficulty);
  const terminal = isTerminal(e.status);
  const totalWeight = analysis
    ? analysis.situations.reduce((s, x) => s + x.merged, 0)
    : 0;

  const riskOf = (id: number): CellRisk | null => {
    if (!analysis || totalWeight === 0) return null;
    const gh = analysis.guardHits.get(id) ?? 0;
    const tr = analysis.trapRisk.get(id) ?? 0;
    return {
      guardRatio: gh / totalWeight,
      trapRatio: tr / totalWeight,
      safe: analysis.safeCells.has(id),
    };
  };

  const guardTruth = new Set(
    terminal ? e.guardPositions : [],
  );

  const navigate = (id: number, key: string) => {
    const x = id % e.board.width,
      y = Math.floor(id / e.board.width);
    const next =
      key === "ArrowLeft"
        ? x > 0
          ? id - 1
          : id
        : key === "ArrowRight"
          ? x < e.board.width - 1
            ? id + 1
            : id
          : key === "ArrowUp"
            ? y > 0
              ? id - e.board.width
              : id
            : y < e.board.height - 1
              ? id + e.board.width
              : id;
    setFocus(next);
    wrap.current
      ?.querySelector<HTMLButtonElement>(`[data-cell="${next}"]`)
      ?.focus();
  };

  return (
    <section className="board-panel">
      <div className="board-heading">
        <div>
          <span className="eyebrow">EXPEDITION 025 / {r.code}</span>
          <h2>
            {r.name}
            <span>{r.tag}</span>
          </h2>
        </div>
        <div className="board-actions">
          <span className="turn-chip">
            <Footprints size={13} />
            回合 {e.turn}
          </span>
          <span>
            <i />{" "}
            {e.status === "ready"
              ? "待出发"
              : e.status === "active"
                ? "巡逻进行中"
                : "探险已结束"}
          </span>
          <button
            className="icon-button"
            aria-label={e.paused ? "继续探险" : "暂停探险"}
            disabled={terminal}
            onClick={() => send({ type: "pause" })}
          >
            {e.paused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button
            className="icon-button"
            aria-label="聚焦地图"
            onClick={() =>
              wrap.current
                ?.querySelector<HTMLButtonElement>(
                  `[data-cell="${Math.min(focus, e.board.cells.length - 1)}"]`,
                )
                ?.focus()
            }
          >
            <Maximize2 size={15} />
          </button>
        </div>
      </div>
      <div className="map-area" ref={wrap}>
        <div className="map-flourish top-left" />
        <div className="map-flourish bottom-right" />
        <div
          className="column-labels"
          style={{ gridTemplateColumns: `repeat(${e.board.width},1fr)` }}
        >
          {Array.from({ length: e.board.width }, (_, i) => (
            <span key={i}>{String.fromCharCode(65 + i)}</span>
          ))}
        </div>
        <div className="map-row">
          <div
            className="row-labels"
            style={{ gridTemplateRows: `repeat(${e.board.height},1fr)` }}
          >
            {Array.from({ length: e.board.height }, (_, i) => (
              <span key={i}>{String(i + 1).padStart(2, "0")}</span>
            ))}
          </div>
          <div
            role="grid"
            aria-label="遗迹探索地图"
            aria-rowcount={e.board.height}
            aria-colcount={e.board.width}
            className="board-grid"
            style={{ gridTemplateColumns: `repeat(${e.board.width},1fr)` }}
          >
            {e.board.cells.map((c) => (
              <BoardCell
                key={c.id}
                cell={c}
                width={e.board.width}
                terminal={terminal}
                guardHere={guardTruth.has(c.id)}
                risk={riskOf(c.id)}
                selected={c.id === Math.min(focus, e.board.cells.length - 1)}
                onOpen={() => {
                  setFocus(c.id);
                  if (c.revealed || c.mark === "flag" || e.pending || terminal) return;
                  send({ type: "plan", kind: e.tool, cell: c.id });
                }}
                onMark={() => {
                  setFocus(c.id);
                  send({ type: "mark", id: c.id });
                }}
                onNavigate={(key) => navigate(c.id, key)}
              />
            ))}
          </div>
        </div>
        <div className="map-coordinate">
          <MapPin size={10} />
          脚步只报区域数量，不报具体格<span>数字冻结于观测回合</span>
        </div>
        {e.status === "ready" && (
          <div className="first-step">
            点击石板登记探索意图，再确认推进第一回合
            <span>首步及周围八格保证无陷阱、无守卫</span>
          </div>
        )}
        {e.paused && (
          <div className="pause-overlay">
            <Pause size={34} />
            <h3>遗迹会等你回来</h3>
            <p>回合已暂停，地图、证据与巡逻推断均已保存。</p>
            <button className="primary" onClick={() => send({ type: "pause" })}>
              <Play size={14} />
              继续探险
            </button>
          </div>
        )}
      </div>
      <div className="board-legend">
        <span>
          <i className="legend-risk-safe" />
          全情形安全
        </span>
        <span>
          <i className="legend-risk-guard" />
          守卫风险
        </span>
        <span>
          <i className="legend-risk-trap" />
          陷阱风险
        </span>
        <span>
          <Flag size={12} />
          旗标（非证据）
        </span>
        <span>
          <Gem size={12} />
          文物
        </span>
        <small>右键插旗 · 单击登记探索意图，确认后才走回合</small>
      </div>
    </section>
  );
}
