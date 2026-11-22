import { BrainCircuit, ShieldCheck, TriangleAlert, FileSearch } from "lucide-react";
import type { Expedition } from "../../../shared/types";
import { coordinate } from "../../../shared/geometry";
import type { SituationAnalysis } from "../lib/situations";

export function InferencePanel({
  expedition: e,
  analysis,
  onLocate,
}: {
  expedition: Expedition;
  analysis: SituationAnalysis | null;
  onLocate: (id: number) => void;
}) {
  const totalWeight = analysis
    ? analysis.situations.reduce((s, x) => s + x.merged, 0)
    : 0;
  const safeList = analysis ? [...analysis.safeCells].slice(0, 12) : [];
  const guardList = analysis ? [...analysis.certainGuardCells].slice(0, 12) : [];

  const slates = e.slates.slice(-8);
  const probes = e.board.cells
    .filter((c) => c.intel !== "unknown")
    .slice(-8);
  const flags = e.board.cells
    .filter((c) => c.mark === "flag")
    .slice(-8);

  return (
    <section className="inference-panel">
      <div className="panel-heading">
        <BrainCircuit size={15} />
        <h2>联合巡逻推断</h2>
        <span>不读暗处答案</span>
      </div>

      {e.status === "ready" ? (
        <p className="inference-empty">
          尚无公开事实。第一回合确认后，引擎将枚举全部联合相位组合，并用石板数字、脚步与目击逐条淘汰。
        </p>
      ) : (
        <>
          <div className="situation-summary">
            <div>
              <strong>{analysis?.situations.length ?? 0}</strong>
              <small>幸存联合情形{analysis?.truncated ? "（已达上限）" : ""}</small>
            </div>
            <div>
              <strong>{totalWeight}</strong>
              <small>加权相位组合</small>
            </div>
            <div>
              <strong>{e.guardPositions.length || e.board.guards.length}</strong>
              <small>守卫数量</small>
            </div>
          </div>

          <div className="verdict-block">
            <h3>
              <ShieldCheck size={13} />
              所有情形都安全的格
            </h3>
            {safeList.length === 0 ? (
              <p className="muted">当前没有可下“安全”结论的格——任一情形有风险即不报安全。</p>
            ) : (
              <div className="cell-chips safe-chips">
                {safeList.map((id) => (
                  <button key={id} onClick={() => onLocate(id)}>
                    {coordinate(id, e.board.width)}
                  </button>
                ))}
                {analysis && analysis.safeCells.size > safeList.length && (
                  <em>另 {analysis.safeCells.size - safeList.length} 格…</em>
                )}
              </div>
            )}
          </div>

          <div className="verdict-block">
            <h3>
              <TriangleAlert size={13} />
              所有情形都有守卫的格
            </h3>
            {guardList.length === 0 ? (
              <p className="muted">尚无格在全部情形中被守卫占据。</p>
            ) : (
              <div className="cell-chips danger-chips">
                {guardList.map((id) => (
                  <button key={id} onClick={() => onLocate(id)}>
                    {coordinate(id, e.board.width)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="evidence-ledger">
            <h3>
              <FileSearch size={13} />
              带回合的证据册
            </h3>
            <h4>石板数字（含观测时守卫，旧数字保留回合）</h4>
            <ul>
              {slates.length === 0 && <li className="muted">暂无</li>}
              {slates.map((s, i) => (
                <li key={i}>
                  <b>T{s.turn}</b>
                  {coordinate(s.cell, e.board.width)} = {s.number}
                </li>
              ))}
            </ul>
            <h4>探针 / 火把结论</h4>
            <ul>
              {probes.length === 0 && <li className="muted">暂无</li>}
              {probes.map((c) => (
                <li key={c.id}>
                  <b>T{c.intelTurn}</b>
                  {coordinate(c.id, e.board.width)}：
                  {c.intel === "danger" ? "确认固定陷阱" : "确认无固定陷阱"}
                </li>
              ))}
            </ul>
            <h4>旗标（玩家判断，不作为推断证据）</h4>
            <ul>
              {flags.length === 0 && <li className="muted">暂无</li>}
              {flags.map((c) => (
                <li key={c.id} className="flag-line">
                  <b>T{c.flagTurn}</b>
                  {coordinate(c.id, e.board.width)}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
