import { LogOut, Clock3, Heart, ShieldCheck } from "lucide-react";
import type { Expedition } from "../../../shared/types";
import type { Command } from "../../../shared/commands";
import { mayAct } from "../model/expedition";

export function ActionBar({
  expedition: e,
  onExtract,
}: {
  expedition: Expedition;
  send?: (c: Command) => void;
  onExtract: () => void;
}) {
  return (
    <div className="action-bar">
      <div className="vitals">
        <span title="剩余生命">
          {[0, 1, 2].map((i) => (
            <Heart
              size={13}
              key={i}
              className={i < e.lives ? "heart-full" : "heart-empty"}
            />
          ))}
        </span>
        {e.shield && <ShieldCheck size={15} className="shield-active" />}
        <span className="timer">
          <Clock3 size={13} />
          {String(Math.floor(e.elapsed / 60)).padStart(2, "0")}:
          {String(e.elapsed % 60).padStart(2, "0")}
        </span>
        <span className="turn-counter">第 {e.turn} 回合</span>
      </div>
      <button
        className="extract-button"
        disabled={!mayAct(e) || !!e.pending}
        onClick={onExtract}
      >
        <LogOut size={14} />
        撤离
      </button>
    </div>
  );
}
