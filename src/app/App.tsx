import { useMemo, useState } from "react";
import {
  Compass,
  Map,
  BookOpen,
  HelpCircle,
  Plus,
  Check,
  ArrowUpRight,
  LogOut,
  X,
  Save,
} from "lucide-react";
import type { Difficulty } from "../shared/types";
import { isTerminal } from "../shared/initial";
import {
  RegionPanel,
  BoardView,
} from "../features/terrain";
import {
  ActionBar,
  ProgressStrip,
  IntentBar,
  SequencePanel,
} from "../features/exploration";
import {
  analyzeSituations,
  InferencePanel,
  PatrolPanel,
  buildEvidence,
  boardForInference,
} from "../features/inference";
import { ToolPanel } from "../features/tools";
import { ChroniclePanel, ResultPanel } from "../features/chronicle";
import { useGame } from "./useGame";
import { GuideDialog } from "./ui/GuideDialog";
import { LaunchDialog } from "./ui/LaunchDialog";

export function App() {
  const { state, send, saved } = useGame();
  const e = state.doc.expedition;
  const [help, setHelp] = useState(false);
  const [launch, setLaunch] = useState<Difficulty | null>(null);
  const [extract, setExtract] = useState(false);
  const report = state.doc.archive.reports.find((v) => v.id === e.id);

  // 推断完全由公开证据驱动：不含 mine / phase 等暗处答案。
  const analysis = useMemo(() => {
    if (e.status === "ready") return null;
    return analyzeSituations(boardForInference(e), buildEvidence(e));
  }, [e]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="#">
          <span className="brand-mark">
            <Compass size={28} strokeWidth={1.2} />
          </span>
          <span>
            <strong>
              遗迹守卫<span>RUIN WATCH</span>
            </strong>
            <small>公开的路线，未知的相位。</small>
          </span>
        </a>
        <nav aria-label="主导航">
          <a className="nav-active" href="#map">
            <Map size={14} />
            遗迹探索
          </a>
          <a href="#chronicle">
            <BookOpen size={14} />
            探险手记
          </a>
        </nav>
        <div className="header-end">
          <span className={"save-state " + (!saved ? "unsaved" : "")}>
            <Check size={11} />
            {saved ? "进度已保存" : "本地保存不可用"}
          </span>
          <button
            className="icon-button"
            aria-label="探险指南"
            onClick={() => setHelp(true)}
          >
            <HelpCircle size={18} />
          </button>
          <span className="avatar">勘</span>
        </div>
      </header>
      <main>
        <div className="page-heading">
          <div>
            <span className="eyebrow">
              <span />
              TURN-BASED RUIN PATROL / VOL. 025
            </span>
            <h1>
              先推断，再落子<span>。</span>
            </h1>
            <p>守卫循公开路线巡逻，只有确认行动才会推进回合。</p>
          </div>
          <button
            className="new-expedition"
            onClick={() => setLaunch(e.board.difficulty)}
          >
            <Plus size={15} />
            新的探险
            <ArrowUpRight size={13} />
          </button>
        </div>
        <div className="workspace">
          <aside className="left-column">
            <RegionPanel expedition={e} onNew={setLaunch} />
            <SequencePanel />
            <div className="left-bottom">
              <span className="eyebrow">EXPEDITION SEED</span>
              <code>{e.board.seed}</code>
              <span className="seed-tip">同一种子，同一巡逻真相。</span>
            </div>
          </aside>
          <div className="center-column" id="map">
            <ProgressStrip expedition={e} />
            <BoardView expedition={e} analysis={analysis} send={send} />
            <IntentBar expedition={e} send={send} />
            <ActionBar
              expedition={e}
              send={send}
              onExtract={() => setExtract(true)}
            />
            {report && (
              <ResultPanel
                report={report}
                onNew={() => setLaunch(e.board.difficulty)}
              />
            )}
            <div className="save-strip">
              <Save size={12} />
              <span>自动保存回合、带回合证据与巡逻推断 · 刷新后继续推理</span>
              <small>LOCAL FIELD JOURNAL</small>
            </div>
          </div>
          <aside className="right-column">
            <PatrolPanel expedition={e} analysis={analysis} />
            <InferencePanel
              expedition={e}
              analysis={analysis}
              onLocate={(id) => {
                document.getElementById("tile-" + id)?.focus();
                document
                  .getElementById("tile-" + id)
                  ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
              }}
            />
            <ToolPanel expedition={e} send={send} />
            <div id="chronicle">
              <ChroniclePanel archive={state.doc.archive} expedition={e} />
            </div>
          </aside>
        </div>
        <footer>
          <span>
            RUINFIELD EXPLORER’S SOCIETY <i /> EST. 2026
          </span>
          <span>
            所有情形都安全，才算安全。
            <Compass size={13} />
          </span>
        </footer>
      </main>
      {state.notice && (
        <div className="notice" role="status" key={state.notice}>
          {state.notice}
        </div>
      )}
      {help && <GuideDialog onClose={() => setHelp(false)} />}
      {launch && (
        <LaunchDialog
          key={launch}
          difficulty={launch}
          ongoing={!isTerminal(e.status) && e.board.generated}
          onClose={() => setLaunch(null)}
          onConfirm={(difficulty, seed) => {
            send({ type: "new", difficulty, seed });
            setLaunch(null);
          }}
        />
      )}
      {extract && (
        <div className="modal-backdrop" onClick={() => setExtract(false)}>
          <section
            className="dialog extract-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="extract-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="icon-button close"
              aria-label="取消撤离"
              onClick={() => setExtract(false)}
            >
              <X size={18} />
            </button>
            <LogOut size={28} />
            <h2 id="extract-title">带着发现，平安归营。</h2>
            <p>
              撤离会结束本次探险并归档；待确认意图会被取消，尚未探索的区域不计分。
            </p>
            <div className="dialog-actions">
              <button
                autoFocus
                className="outline-button"
                onClick={() => setExtract(false)}
              >
                继续探索
              </button>
              <button
                className="primary"
                onClick={() => {
                  send({ type: "extract" });
                  setExtract(false);
                }}
              >
                确认撤离
                <ArrowUpRight size={14} />
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
