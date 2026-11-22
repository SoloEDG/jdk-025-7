import type { IntentKind } from "../../../shared/types";

/**
 * 固定回合次序，玩家在执行前可查（侧栏“回合次序”面板展示）。
 * 任何确认行动都严格按此顺序结算，且一次确认只走一个回合。
 */
export const TURN_SEQUENCE: { step: number; name: string; detail: string }[] = [
  {
    step: 1,
    name: "登记意图",
    detail: "选择探索 / 等待 / 探针 / 火把并确认；仅展开面板不会推进回合。",
  },
  {
    step: 2,
    name: "回合初观测",
    detail: "在守卫移动前结算揭开与道具，石板数字冻结为：固定陷阱 + 当前相邻守卫。",
  },
  {
    step: 3,
    name: "空区展开",
    detail: "数字为 0 的安全石板按连通关系自动展开，同样冻结观测回合。",
  },
  {
    step: 4,
    name: "道具结算",
    detail: "探针只确认固定陷阱；火把安全则揭开、陷阱则仅确认；成功才消耗。",
  },
  {
    step: 5,
    name: "守卫移动",
    detail: "每名守卫沿公开路线前进一格，路线互不重叠，不可能共格。",
  },
  {
    step: 6,
    name: "遭遇结算",
    detail: "移动后守卫踏入玩家本回合揭开的石板才造成伤害；陷阱在观测时即结算。",
  },
  {
    step: 7,
    name: "脚步报告",
    detail: "只报告各区域本回合初的守卫数量，不透露具体格。",
  },
  {
    step: 8,
    name: "更新回合",
    detail: "回合号 +1，新的公开事实淘汰旧可能；重复点击不会多走一回合。",
  },
];

export const INTENT_LABEL: Record<IntentKind, string> = {
  explore: "探索石板",
  wait: "原地等待",
  probe: "探针确认",
  flare: "火把照明",
};
