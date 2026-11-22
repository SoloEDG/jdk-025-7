import type { Board, Cell } from "../../../shared/types";
import { neighbors } from "../../../shared/geometry";

/**
 * 空区展开：从已合法揭开的种子出发，只对“固定陷阱数为 0 且
 * 观测回合相邻守卫数为 0”的石板继续扩散。
 * guardCountAt(cell) 返回该格观测时是否被守卫占据（1/0）；
 * 守卫只在观测瞬间计入数字，展开的是静态安全区。
 */
export function floodOpen(
  board: Board,
  seeds: number[],
  guardCountAt: (cell: number) => number,
): { cells: Cell[]; opened: number[] } {
  const cells = board.cells.map((c) => ({ ...c }));
  const queue = [...seeds];
  const seen = new Set<number>();
  const opened: number[] = [];
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    if (seen.has(id)) continue;
    seen.add(id);
    const c = cells[id];
    if (!c || c.revealed || c.mark === "flag" || c.mine) continue;
    c.revealed = true;
    c.mark = "none";
    opened.push(id);
    // 扩散条件：无固定陷阱相邻，且八邻格在观测时都没有守卫。
    const guardAround = neighbors(id, board.width, board.height).reduce(
      (sum, n) => sum + guardCountAt(n),
      0,
    );
    if (c.trapAdjacent === 0 && guardAround === 0)
      for (const next of neighbors(id, board.width, board.height))
        if (!seen.has(next) && !cells[next].mine) queue.push(next);
  }
  return { cells, opened };
}
