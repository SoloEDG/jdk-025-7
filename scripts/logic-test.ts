/* 无头逻辑测试：验证回合制守卫的核心规则。运行：npx tsx scripts/logic-test.ts */
import assert from "node:assert";
import { blankBoard, generateBoard, guardCellAt, validateGuards } from "../src/features/terrain/lib/generator";
import { advanceGuardPositions, footstepReport } from "../src/features/terrain/lib/patrol";
import { createExpedition } from "../src/features/exploration/model/expedition";
import { cancelPlan, confirmTurn, cycleMark, planIntent } from "../src/features/exploration/model/turn";
import { activateShield } from "../src/features/tools/model/useTool";
import { analyzeSituations } from "../src/features/inference/lib/situations";
import { buildEvidence, boardForInference } from "../src/features/inference/model/notes";
import { gameReducer, initialGame } from "../src/app/gameReducer";
import type { Expedition } from "../src/shared/types";

let passed = 0;
const ok = (name: string, cond: boolean) => {
  assert.ok(cond, name);
  passed++;
  console.log("  ✓", name);
};

function start(seed = "TEST-SEED") {
  return createExpedition(blankBoard("scout", seed), "test-id", 0);
}

// 1. 公开巡逻结构合法且永不共格
{
  const e = start();
  ok("守卫路线闭合且守卫间永不共格", validateGuards(e.board));
  const gen = generateBoard(e.board, 44);
  const seen = new Set<number>();
  for (let t = 0; t < 30; t++) {
    const pos = gen.guards.map((g) => guardCellAt({ ...g, phase: g.phase }, t));
    if (new Set(pos).size !== pos.length) throw new Error("共格！");
    pos.forEach((p) => seen.add(p));
  }
  ok("30 回合内无任何共格", true);
  ok("守卫数量与区域配置一致", gen.guards.length === 3);
}

// 2. 计划不推进，确认才推进且幂等
{
  let e = start();
  e = { ...e, board: generateBoard(e.board, 44), status: "active", guardPositions: e.board.guards.map((g) => guardCellAt(g, 0)) };
  const turnBefore = e.turn;
  e = planIntent(e, "wait", null);
  ok("登记等待意图后回合不变", e.turn === turnBefore && e.pending?.kind === "wait");
  const planned = e;
  e = cancelPlan(e);
  ok("撤回意图后 pending 清空", e.pending === null);
  e = confirmTurn(planned);
  ok("确认后恰好推进一个回合", e.turn === turnBefore + 1 && e.pending === null);
  const after = e.turn;
  e = confirmTurn(e); // 无 pending
  ok("无待确认意图时重复确认不多走回合", e.turn === after);
}

// 3. 首次探索必须是 explore，且首步邻域无陷阱无守卫
{
  let e = start();
  const blocked = planIntent(e, "wait", null);
  ok("ready 状态不能登记等待", blocked === e);
  e = planIntent(e, "explore", 44);
  e = confirmTurn(e);
  ok("首步后进入 active 且回合=1", e.status === "active" && e.turn === 1);
  const nb = [44, ...neighborsOf(44, e.board.width, e.board.height)];
  ok("首步及邻格无固定陷阱", nb.every((id) => !e.board.cells[id].mine));
  const t0pos = e.board.guards.map((g) => guardCellAt(g, 0));
  ok("首步邻域首回合无守卫", nb.every((id) => !t0pos.includes(id)));
}

// 4. 石板数字 = 固定陷阱 + 观测时守卫，且冻结带回合
{
  let e = start();
  e = planIntent(e, "explore", 44);
  e = confirmTurn(e);
  const t0pos = new Set(e.board.guards.map((g) => guardCellAt(g, 0)));
  for (const c of e.board.cells) {
    if (c.revealed && c.observedAt === 0) {
      const guardAround = neighborsOf(c.id, e.board.width, e.board.height).filter((n) =>
        t0pos.has(n),
      ).length;
      assert.equal(
        c.observedNumber,
        c.trapAdjacent + guardAround,
        `格 ${c.id} 数字不符`,
      );
    }
  }
  ok("所有首回合观测数字 = 固定陷阱 + 当时相邻守卫", true);
  ok("观测格带回合徽标数据 observedAt=0", e.board.cells.some((c) => c.observedAt === 0));
}

// 5. 联合推断：情形数不超过相位组合笛卡尔积，且所有幸存情形满足证据
{
  let e = start();
  e = planIntent(e, "explore", 44);
  e = confirmTurn(e);
  e = planIntent(e, "wait", null);
  e = confirmTurn(e);
  const analysis = analyzeSituations(boardForInference(e), buildEvidence(e));
  const combos = e.board.guards.reduce((s, g) => s * g.track.length, 1);
  ok("幸存情形不超过相位笛卡尔积", analysis.situations.length <= combos);
  ok("至少存在一个可行情形", analysis.situations.length > 0);
  // 每个幸存情形必须复现全部脚步报告
  for (const f of e.footsteps) {
    for (const s of analysis.situations) {
      const pos = s.phases.map((ph, i) => {
        const track = e.board.guards[i].track;
        return track[(ph + f.turn) % track.length];
      });
      const zoneCells = new Set(e.board.zones[f.zone].cells);
      const count = pos.filter((p) => zoneCells.has(p)).length;
      assert.equal(count, f.count, "脚步报告未被情形满足");
    }
  }
  ok("全部幸存情形都满足每一条脚步报告", true);
}

// 6. 安全结论只在所有情形都安全时给出
{
  let e = start();
  e = planIntent(e, "explore", 44);
  e = confirmTurn(e);
  for (let i = 0; i < 4; i++) {
    e = planIntent(e, "wait", null);
    e = confirmTurn(e);
  }
  const analysis = analyzeSituations(boardForInference(e), buildEvidence(e));
  const total = analysis.situations.reduce((s, x) => s + x.merged, 0);
  for (const id of analysis.safeCells) {
    const gh = analysis.guardHits.get(id) ?? 0;
    const tr = analysis.trapRisk.get(id) ?? 0;
    assert.ok(gh === 0 && tr === 0 && total > 0, `格 ${id} 被误报安全`);
  }
  ok("safeCells 中每一格在全部情形下均无守卫且无陷阱可能", true);
  // 任一情形有守卫的格不得出现在 safeCells
  for (const [id, hits] of analysis.guardHits) {
    if (hits > 0) assert.ok(!analysis.safeCells.has(id), "风险格混入安全结论");
  }
  ok("有守卫风险的格不会被给安全结论", true);
}

// 7. 探针结论带回合且不推进之外的信息；旗标不是证据
{
  let e = start();
  e = planIntent(e, "explore", 44);
  e = confirmTurn(e);
  // 找一块未揭开、非旗标格做探针
  const target = e.board.cells.find((c) => !c.revealed && c.mark === "none")!.id;
  e = { ...e, tool: "probe" };
  e = planIntent(e, "probe", target);
  const turn = e.turn;
  e = confirmTurn(e);
  const c = e.board.cells[target];
  ok("探针结论标注回合", c.intel !== "unknown" && c.intelTurn === turn);
  ok("探针不揭开石板", c.revealed === false);
  ok("探针消耗一个道具", e.tools.probe === 1 && e.turn === turn + 1);
  // 旗标循环不推进回合
  const flagCell = e.board.cells.find((x) => !x.revealed && x.mark === "none")!.id;
  const t2 = e.turn;
  e = cycleMark(e, flagCell);
  ok("插旗不推进回合且记录旗标回合", e.turn === t2 && e.board.cells[flagCell].flagTurn === t2);
}

// 8. 新公开事实淘汰旧可能：等待若干轮后情形数单调不增
{
  let e = start();
  e = planIntent(e, "explore", 44);
  e = confirmTurn(e);
  let prev = analyzeSituations(boardForInference(e), buildEvidence(e)).situations.length;
  for (let i = 0; i < 5; i++) {
    e = planIntent(e, "wait", null);
    e = confirmTurn(e);
    const cur = analyzeSituations(boardForInference(e), buildEvidence(e)).situations.length;
    assert.ok(cur <= prev, "新证据后情形数不应增加");
    prev = cur;
  }
  ok("随脚步累积，幸存联合情形单调不增", true);
}

// 9. reducer 层面：inspect 不推进，重复 plan 被拒绝
{
  let ws = initialGame();
  const t0 = ws.doc.expedition.turn;
  ws = gameReducer(ws, { type: "inspect", open: true });
  ok("展开面板不推进回合", ws.doc.expedition.turn === t0 && ws.doc.expedition.inspectOpen === true);
  ws = gameReducer(ws, { type: "plan", kind: "explore", cell: 33 });
  const pendingTurn = ws.doc.expedition.turn;
  ws = gameReducer(ws, { type: "plan", kind: "wait" });
  ok("已有待确认意图时不能再登记", ws.doc.expedition.pending?.kind === "explore");
  ws = gameReducer(ws, { type: "confirm" });
  ok("reducer 确认后推进且意图清空", ws.doc.expedition.turn === pendingTurn + 1 && ws.doc.expedition.pending === null);
}

// 10. 脚步报告只含区域计数
{
  const e = start();
  const gen = generateBoard(e.board, 44);
  const pos = advanceGuardPositions(gen, 0);
  const report = footstepReport(gen, 0, pos);
  ok("脚步报告条目均为区域+数量，无具体格", report.every((r) => typeof r.zone === "number" && typeof r.count === "number" && !("cell" in r)));
  const total = report.reduce((s, r) => s + r.count, 0);
  ok("脚步区域计数之和等于守卫总数", total === gen.guards.length);
}

// 11. 健全性：真实初始相位组合必须始终是幸存情形之一
{
  let e = start("SOUND-SEED");
  e = planIntent(e, "explore", 44);
  e = confirmTurn(e);
  for (let i = 0; i < 6; i++) {
    e = planIntent(e, "wait", null);
    e = confirmTurn(e);
  }
  const analysis = analyzeSituations(boardForInference(e), buildEvidence(e));
  const truthKey = e.board.guards.map((g) => g.phase).join("|");
  const survivorKeys = new Set(analysis.situations.map((s) => s.phases.join("|")));
  ok("真实相位组合永不被公开证据淘汰", survivorKeys.has(truthKey));
}

// 12. 守卫移动遭遇：守卫移动后踏入新揭开格才造成伤害；符石可挡
{
  // 同一探险：首步生成地图，再在该地图上找“回合1无守卫、回合2被踏入”的安全格
  let e: Expedition = createExpedition(blankBoard("scout", "AMBUSH-SEED"), "ambush", 0);
  e = planIntent(e, "explore", 44);
  e = confirmTurn(e);
  const board = e.board;
  const pos1 = advanceGuardPositions(board, 1);
  const pos2 = advanceGuardPositions(board, 2);
  const target = pos2.find(
    (cell) =>
      !pos1.includes(cell) &&
      !board.cells[cell].mine &&
      !board.cells[cell].revealed,
  );
  if (target !== undefined) {
    const livesBefore = e.lives;
    e = planIntent(e, "explore", target);
    e = confirmTurn(e);
    const entered = e.actions.some((a) => a.message.includes("守卫移动后踏入"));
    ok("守卫移动踏入新揭开格被结算", entered);
    ok("无符石时遭遇损失 1 点生命", e.lives === livesBefore - 1);
  } else {
    ok("守卫移动踏入新揭开格被结算（本种子无此布局，跳过）", true);
    ok("无符石时遭遇损失 1 点生命（本种子无此布局，跳过）", true);
  }
}

// 13. 刷新恢复：序列化→反序列化→校验通过，且证据足以重建相同情形
{
  let e = start("PERSIST-SEED");
  e = planIntent(e, "explore", 44);
  e = confirmTurn(e);
  e = planIntent(e, "wait", null);
  e = confirmTurn(e);
  const before = analyzeSituations(boardForInference(e), buildEvidence(e)).situations.length;
  const json = JSON.stringify({ version: 2, expedition: e, archive: { reports: [], discoveries: {}, totalScore: 0 } });
  const restored = JSON.parse(json) as { expedition: Expedition };
  const after = analyzeSituations(
    boardForInference(restored.expedition),
    buildEvidence(restored.expedition),
  ).situations.length;
  ok("刷新恢复后联合情形数量一致（记录足以继续推断）", before === after);
}

// 14. 符石即时激活不推进回合，并能抵挡守卫移动遭遇
{
  let e: Expedition = createExpedition(blankBoard("scout", "SHIELD-SEED"), "sh", 0);
  e = planIntent(e, "explore", 44);
  e = confirmTurn(e);
  const turnBeforeShield = e.turn;
  e = activateShield(e);
  ok("符石激活不推进回合", e.turn === turnBeforeShield && e.shield === true);
  const pos1 = advanceGuardPositions(e.board, 1);
  const pos2 = advanceGuardPositions(e.board, 2);
  const target = pos2.find(
    (cell) =>
      !pos1.includes(cell) &&
      !e.board.cells[cell].mine &&
      !e.board.cells[cell].revealed,
  );
  if (target !== undefined) {
    const lives = e.lives;
    e = planIntent(e, "explore", target);
    e = confirmTurn(e);
    const blocked = e.actions.some((a) => a.message.includes("守护符石挡住"));
    ok("符石挡住守卫遭遇且不掉生命", blocked && e.lives === lives && e.shield === false);
  } else {
    ok("符石挡住守卫遭遇（本种子无此布局，跳过）", true);
  }
}

function neighborsOf(id: number, width: number, height: number) {
  const x = id % width,
    y = Math.floor(id / width);
  const out: number[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx,
        ny = y + dy;
      if ((dx || dy) && nx >= 0 && nx < width && ny >= 0 && ny < height)
        out.push(ny * width + nx);
    }
  return out;
}

console.log(`\n全部 ${passed} 项断言通过。`);
