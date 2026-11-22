import { X, Pickaxe, Footprints, ScanSearch, BrainCircuit } from "lucide-react";

export function GuideDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="dialog guide-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      >
        <button
          autoFocus
          className="icon-button close"
          onClick={onClose}
          aria-label="关闭指南"
        >
          <X size={18} />
        </button>
        <span className="eyebrow">THE WATCHER’S HANDBOOK</span>
        <h2 id="guide-title">与守卫共处一座遗迹。</h2>
        <div className="guide-step">
          <Pickaxe />
          <p>
            <strong>回合制行动</strong>
            点击石板只是登记探索意图，选择等待或道具同理；展开任何面板都不推进。只有点“确认并推进”才按固定次序结算一个回合，重复点击不会多走。
          </p>
        </div>
        <div className="guide-step">
          <Footprints />
          <p>
            <strong>巡逻与脚步</strong>
            每名守卫沿公开闭合路线每回合前进一步，路线互不重叠、永不共格。初始相位在暗处未知；脚步只报告各区域守卫数量，不透露具体格。
          </p>
        </div>
        <div className="guide-step">
          <ScanSearch />
          <p>
            <strong>石板数字</strong>
            数字在观测回合冻结 = 固定陷阱 + 当时相邻守卫，旧数字保留其回合标签。空区在同回合自动展开。探针只确认固定陷阱，火把安全则揭开，结论均标注回合。
          </p>
        </div>
        <div className="guide-step">
          <BrainCircuit />
          <p>
            <strong>联合推断</strong>
            引擎枚举守卫相位的联合组合（而非各自独立追踪），用历轮数字、脚步与目击逐条淘汰，并合并等价情形。下一步风险只依据幸存情形：所有情形都安全，才给出安全结论。
          </p>
        </div>
        <p className="guide-foot">
          三次生命，符石可挡一次陷阱或守卫遭遇。守卫在移动后踏入你本回合揭开的石板才会造成伤害。揭开全部安全格即获胜，也可提前撤离。刷新页面会恢复足以继续推断的完整记录。
        </p>
        <button className="primary" onClick={onClose}>
          开始我的探险
        </button>
      </section>
    </div>
  );
}
