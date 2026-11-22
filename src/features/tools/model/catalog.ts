export const toolCatalog = [
  {
    id: "probe" as const,
    name: "勘探探针",
    subtitle: "确认一格固定陷阱",
    key: "I",
    description:
      "作为一个回合行动登记，确认后才推进。只判定固定陷阱，不揭开石板，不结算守卫；结论标注回合。",
  },
  {
    id: "flare" as const,
    name: "照明火把",
    subtitle: "安全则揭开",
    key: "II",
    description:
      "作为一个回合行动登记，确认后才推进。若该格无固定陷阱则揭开并展开，若是陷阱则仅确认、不触发。",
  },
  {
    id: "shield" as const,
    name: "守护符石",
    subtitle: "抵挡一次伤害",
    key: "III",
    description: "即时激活，不推进回合；可挡一次陷阱或守卫的移动遭遇。",
  },
];
