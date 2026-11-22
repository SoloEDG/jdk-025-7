import { Map, ArrowUpRight } from "lucide-react";
import type { Difficulty, Expedition } from "../../../shared/types";
import { regions } from "../model/regions";

export function RegionPanel({
  expedition: e,
  onNew,
}: {
  expedition: Expedition;
  onNew: (d: Difficulty) => void;
}) {
  return (
    <section className="region-panel">
      <div className="panel-heading">
        <Map size={15} />
        <h2>远古遗址</h2>
        <span>03 区域</span>
      </div>
      <div className="region-list">
        {regions.map((r, i) => (
          <button
            key={r.id}
            className={
              "region-card " + (e.board.difficulty === r.id ? "selected" : "")
            }
            onClick={() => onNew(r.id)}
          >
            <span className={"region-mini mini-" + r.id}>
              <i />
              <b>0{i + 1}</b>
            </span>
            <span>
              <small>{r.code}</small>
              <strong>{r.name}</strong>
              <em>
                {r.width} × {r.height} · {r.mines} 陷阱 · {r.guardCount} 守卫
              </em>
            </span>
            <ArrowUpRight size={13} />
          </button>
        ))}
      </div>
      <div className="field-note">
        <span>FIELD NOTE / 002</span>
        <p>
          守卫的路线是公开的，
          <br />
          暗处的初始相位不是。
        </p>
        <small>联合所有数字与脚步，再决定下一步。</small>
      </div>
    </section>
  );
}
