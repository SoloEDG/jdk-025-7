/**
 * 固定陷阱约束求解（纯函数，只接收公开证据）。
 * 变量是“未被公开证实的固定陷阱”；守卫占用不参与，由调用方在约束里扣除。
 */
export interface TrapConstraint {
  /** 参与计数的未知变量格。 */
  vars: number[];
  /** 这些变量中需要为真（是陷阱）的数量。 */
  remaining: number;
}

export interface TrapCsp {
  /** 已被证据固定的格：true=确认陷阱，false=确认安全（含守卫必经格）。 */
  fixed: Map<number, boolean>;
  constraints: TrapConstraint[];
  /** 全局陷阱上限。 */
  mineBudget: number;
  cellCount: number;
}

export interface TrapSolve {
  feasible: boolean;
  /** 仍可能是陷阱的格（在某可行解中为真）。 */
  possibleTraps: Set<number>;
}

/** 单位传播 + 回溯；所有求解只读公开约束，绝不读取暗处答案。 */
export function solveTrapCsp(csp: TrapCsp, workLimit = 4000): TrapSolve {
  const value = new Map<number, boolean>(csp.fixed);
  const possible = new Set<number>();
  let work = 0;

  const conflict = (): boolean => {
    for (const con of csp.constraints) {
      let trueCount = 0,
        unknown: number[] = [];
      for (const v of con.vars) {
        const val = value.get(v);
        if (val === true) trueCount++;
        else if (val === undefined) unknown.push(v);
      }
      if (trueCount > con.remaining) return true;
      if (trueCount + unknown.length < con.remaining) return true;
      if (con.remaining === trueCount) unknown.forEach((u) => value.set(u, false));
      if (con.remaining - trueCount === unknown.length)
        unknown.forEach((u) => value.set(u, true));
    }
    return false;
  };

  // 初始传播（可能反复触发）。
  for (let i = 0; i < 64 && conflict(); i++) {
    /* 传播到不动点 */
  }
  if (conflict()) return { feasible: false, possibleTraps: possible };

  const forcedTrue = [...value.values()].filter(Boolean).length;
  if (forcedTrue > csp.mineBudget)
    return { feasible: false, possibleTraps: possible };

  const unknownVars = [...new Set(csp.constraints.flatMap((c) => c.vars))].filter(
    (v) => !value.has(v),
  );

  const recurse = (depth: number): boolean => {
    if (++work > workLimit) return false;
    const snapshot = new Map(value);
    if (conflict()) {
      value.clear();
      snapshot.forEach((v, k) => value.set(k, v));
      return false;
    }
    const v = unknownVars.find((u) => !value.has(u));
    if (v === undefined) {
      value.forEach((val, cell) => {
        if (val) possible.add(cell);
      });
      return true;
    }
    let any = false;
    for (const guess of [true, false]) {
      const before = new Map(value);
      value.set(v, guess);
      const ok = recurse(depth + 1);
      value.clear();
      before.forEach((val, k) => value.set(k, val));
      if (ok) any = true;
    }
    return any;
  };

  const feasible = recurse(0);
  return { feasible, possibleTraps: possible };
}
