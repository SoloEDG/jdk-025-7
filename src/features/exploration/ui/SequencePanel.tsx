import { ScrollText } from "lucide-react";
import { TURN_SEQUENCE } from "../lib/sequence";

/** 固定次序面板：纯展示，展开它不会推进回合。 */
export function SequencePanel() {
  return (
    <section className="sequence-panel">
      <div className="panel-heading">
        <ScrollText size={15} />
        <h2>回合次序</h2>
        <span>执行前可查</span>
      </div>
      <ol className="sequence-list">
        {TURN_SEQUENCE.map((s) => (
          <li key={s.step}>
            <b>{String(s.step).padStart(2, "0")}</b>
            <span>
              <strong>{s.name}</strong>
              <small>{s.detail}</small>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
