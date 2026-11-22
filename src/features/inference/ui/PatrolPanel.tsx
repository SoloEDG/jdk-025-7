import { Footprints, Route } from "lucide-react";
import type { Expedition } from "../../../shared/types";
import { region } from "../../terrain/model/regions";
import type { SituationAnalysis } from "../lib/situations";

/**
 * 只展示公开信息：巡逻路线、分区、脚步区域计数，
 * 以及联合推断得到的“各格被多少情形占据”。不读取暗处相位。
 */
export function PatrolPanel({
  expedition: e,
  analysis,
}: {
  expedition: Expedition;
  analysis: SituationAnalysis | null;
}) {
  const r = region(e.board.difficulty);
  const trackCells = new Map<number, number>();
  e.board.guards.forEach((g) => g.track.forEach((c) => trackCells.set(c, g.id)));
  const totalWeight = analysis
    ? analysis.situations.reduce((s, x) => s + x.merged, 0)
    : 0;
  const recentSteps = e.footsteps.slice(-12);

  return (
    <section className="patrol-panel">
      <div className="panel-heading">
        <Route size={15} />
        <h2>公开巡逻规则</h2>
        <span>{e.board.guards.length} 名守卫</span>
      </div>
      <div
        className="patrol-grid"
        style={{
          gridTemplateColumns: `repeat(${r.width},1fr)`,
          aspectRatio: `${r.width} / ${r.height}`,
        }}
        role="img"
        aria-label="守卫公开巡逻路线与分区"
      >
        {e.board.cells.map((c) => {
          const guardId = trackCells.get(c.id);
          const zone = e.board.zones.find((z) => z.cells.includes(c.id));
          const hits = analysis?.guardHits.get(c.id) ?? 0;
          const ratio = totalWeight ? hits / totalWeight : 0;
          return (
            <span
              key={c.id}
              className={[
                "patrol-cell",
                guardId !== undefined ? `patrol-guard-${guardId}` : "",
                ratio === 1 ? "patrol-certain" : ratio > 0 ? "patrol-possible" : "",
                `zone-tint-${(zone?.id ?? 0) % 6}`,
              ].join(" ")}
              title={
                guardId !== undefined
                  ? `守卫 ${guardId + 1} 路线格；${hits}/${totalWeight} 情形本回合在此`
                  : `非巡逻格`
              }
            />
          );
        })}
      </div>
      <div className="patrol-legend">
        {e.board.guards.map((g) => (
          <span key={g.id}>
            <i className={`patrol-guard-${g.id}`} />
            守卫 {g.id + 1} · {g.track.length} 步循环
          </span>
        ))}
      </div>
      <div className="footstep-log">
        <h3>
          <Footprints size={13} />
          脚步报告（只报区域数量）
        </h3>
        {recentSteps.length === 0 ? (
          <p>第一回合确认后开始记录。</p>
        ) : (
          <ul>
            {recentSteps.map((f, i) => (
              <li key={i}>
                <b>T{f.turn}</b>
                {e.board.zones[f.zone]?.name ?? `${f.zone} 区`}：{f.count} 名守卫
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
