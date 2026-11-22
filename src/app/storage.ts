import type {
  GameDocument,
  Expedition,
  Archive,
  Board,
  Report,
} from "../shared/types";
import { region } from "../features/terrain";
import { validateGuards } from "../features/terrain";
import { initialGame } from "./gameReducer";

const key = "ruinfield-jdk025-v2";
const obj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const int = (v: unknown, min = 0) =>
  typeof v === "number" && Number.isInteger(v) && v >= min;
const nullableInt = (v: unknown) => v === null || int(v);

function validZones(board: Board): boolean {
  const r = region(board.difficulty);
  if (board.zones.length !== r.zoneCols * r.zoneRows) return false;
  const all = board.zones.flatMap((z) => z.cells).sort((a, b) => a - b);
  if (all.length !== board.width * board.height) return false;
  return all.every((id, i) => id === i);
}

function validBoard(v: unknown): v is Board {
  if (
    !obj(v) ||
    !["scout", "scholar", "legend"].includes(String(v.difficulty)) ||
    typeof v.seed !== "string" ||
    v.seed.length > 40 ||
    typeof v.generated !== "boolean" ||
    !Array.isArray(v.cells) ||
    !Array.isArray(v.zones) ||
    !Array.isArray(v.guards)
  )
    return false;
  const r = region(v.difficulty as Board["difficulty"]);
  const b = v as unknown as Board;
  if (
    b.width !== r.width ||
    b.height !== r.height ||
    b.mines !== r.mines ||
    b.guardCount !== r.guardCount ||
    b.cells.length !== r.width * r.height ||
    b.guards.length !== r.guardCount
  )
    return false;
  if (
    !b.cells.every(
      (c, i) =>
        obj(c) &&
        c.id === i &&
        typeof c.mine === "boolean" &&
        typeof c.revealed === "boolean" &&
        ["none", "flag", "question"].includes(c.mark) &&
        ["unknown", "safe", "danger"].includes(c.intel) &&
        nullableInt(c.intelTurn) &&
        nullableInt(c.flagTurn) &&
        nullableInt(c.observedAt) &&
        nullableInt(c.observedNumber) &&
        nullableInt(c.seenGuardTurn) &&
        int(c.trapAdjacent) &&
        c.trapAdjacent <= 8 &&
        ["stone", "moss", "water"].includes(c.terrain) &&
        (c.relic === null ||
          ["sun", "vessel", "tablet"].includes(c.relic)) &&
        !(c.mine && c.relic) &&
        (!c.revealed || c.mark === "none") &&
        (c.observedAt === null || (c.revealed && !c.mine)) &&
        (c.observedNumber === null || int(c.observedNumber, 0)),
    )
  )
    return false;
  // 公开巡逻结构必须满足闭合、不重复、守卫间不共格。
  const specTracks = r.tracks.map((t) => t.map(([x, y]) => y * r.width + x));
  if (
    !b.guards.every(
      (g, i) =>
        int(g.id) &&
        g.id === i &&
        Array.isArray(g.track) &&
        g.track.length === specTracks[i].length &&
        g.track.every((cell, k) => cell === specTracks[i][k]) &&
        int(g.phase) &&
        g.phase < g.track.length,
    )
  )
    return false;
  if (!validateGuards(b)) return false;
  if (!validZones(b)) return false;
  if (!b.generated)
    return b.cells.every(
      (c) =>
        !c.mine &&
        !c.revealed &&
        c.trapAdjacent === 0 &&
        c.intel === "unknown" &&
        c.relic === null &&
        c.observedAt === null,
    );
  return b.cells.filter((c) => c.mine).length === b.mines;
}

function validExpedition(v: unknown): v is Expedition {
  if (
    !obj(v) ||
    !validBoard(v.board) ||
    typeof v.id !== "string" ||
    !["ready", "active", "won", "lost", "extracted"].includes(
      String(v.status),
    ) ||
    !int(v.lives) ||
    Number(v.lives) > 3 ||
    typeof v.shield === "boolean" ||
    typeof v.paused === "boolean" ||
    !int(v.turn) ||
    !int(v.used) ||
    !int(v.mistakes) ||
    !int(v.elapsed) ||
    !int(v.nextAction, 1) ||
    !int(v.startedAt) ||
    !obj(v.tools) ||
    !Array.isArray(v.actions) ||
    v.actions.length > 100 ||
    !Array.isArray(v.footsteps) ||
    !Array.isArray(v.sightings) ||
    !Array.isArray(v.slates) ||
    !Array.isArray(v.guardPositions) ||
    ["explore", "probe", "flare"].includes(String(v.tool)) === false ||
    typeof v.inspectOpen !== "boolean" ||
    (v.pending !== null && !obj(v.pending))
  )
    return false;
  const e = v as unknown as Expedition;
  const t = e.tools;
  if (
    !int(t.probe) ||
    t.probe > 2 ||
    !int(t.flare) ||
    t.flare > 1 ||
    !int(t.shield) ||
    t.shield > 1
  )
    return false;
  const board = e.board;
  const actionKinds = [
    "explore",
    "wait",
    "probe",
    "flare",
    "shield",
    "mark",
    "hit",
    "extract",
  ];
  if (
    !e.actions.every(
      (a) =>
        obj(a) &&
        int(a.id, 1) &&
        a.id < e.nextAction &&
        actionKinds.includes(a.kind) &&
        (a.cell === null || (int(a.cell) && a.cell < board.cells.length)) &&
        typeof a.message === "string" &&
        int(a.turn),
    )
  )
    return false;
  const cellOk = (id: unknown) => int(id) && Number(id) < board.cells.length;
  if (
    !e.footsteps.every(
      (f) => int(f.turn) && int(f.zone) && f.zone < board.zones.length && int(f.count),
    ) ||
    !e.sightings.every(
      (s) => int(s.turn) && cellOk(s.cell) && typeof s.present === "boolean",
    ) ||
    !e.slates.every(
      (s) => int(s.turn) && cellOk(s.cell) && int(s.number) && s.number <= 8,
    ) ||
    e.guardPositions.length !== board.guards.length ||
    !e.guardPositions.every(cellOk)
  )
    return false;
  if (e.pending) {
    const p = e.pending;
    if (
      !["explore", "wait", "probe", "flare"].includes(p.kind) ||
      !int(p.turn) ||
      (p.kind === "wait"
        ? p.cell !== null
        : p.cell === null || !cellOk(p.cell))
    )
      return false;
  }
  return (
    (e.status === "ready") === !e.board.generated &&
    (e.status !== "lost" || e.lives === 0)
  );
}

function validReport(v: unknown): v is Report {
  return (
    obj(v) &&
    typeof v.id === "string" &&
    typeof v.seed === "string" &&
    ["scout", "scholar", "legend"].includes(String(v.difficulty)) &&
    ["won", "lost", "extracted"].includes(String(v.outcome)) &&
    [
      "safe",
      "totalSafe",
      "score",
      "seconds",
      "turns",
      "used",
      "mistakes",
      "endedAt",
    ].every((k) => int(v[k])) &&
    Number(v.safe) <= Number(v.totalSafe) &&
    Array.isArray(v.relics) &&
    v.relics.every((r) => ["sun", "vessel", "tablet"].includes(String(r)))
  );
}

function validArchive(v: unknown): v is Archive {
  return (
    obj(v) &&
    Array.isArray(v.reports) &&
    v.reports.length <= 50 &&
    v.reports.every(validReport) &&
    new Set(v.reports.map((r) => r.id)).size === v.reports.length &&
    obj(v.discoveries) &&
    Object.entries(v.discoveries).every(
      ([id, n]) => ["sun", "vessel", "tablet"].includes(id) && int(n),
    ) &&
    int(v.totalScore)
  );
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return initialGame();
    const v: unknown = JSON.parse(raw);
    if (
      obj(v) &&
      v.version === 2 &&
      validExpedition(v.expedition) &&
      validArchive(v.archive)
    )
      return {
        doc: v as unknown as GameDocument,
        notice:
          "已恢复上次探险：回合、带回合的证据与联合推断记录足以继续推理。",
      };
    return {
      ...initialGame(),
      notice: "存档校验未通过（可能来自旧版本），已开启新探险且不覆盖原存档。",
      recovery: true,
    };
  } catch {
    return {
      ...initialGame(),
      notice: "无法读取本地存档，本次仍可探索。",
      recovery: true,
    };
  }
}

export function saveGame(doc: GameDocument) {
  try {
    localStorage.setItem(key, JSON.stringify(doc));
    return true;
  } catch {
    return false;
  }
}
