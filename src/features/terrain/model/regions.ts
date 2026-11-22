import type { Difficulty } from "../../../shared/types";

export interface RegionSpec {
  id: Difficulty;
  name: string;
  code: string;
  width: number;
  height: number;
  mines: number;
  guardCount: number;
  /** 公开巡逻路线：[x, y] 闭合环，各守卫路线互不重叠。 */
  tracks: [number, number][][];
  /** 脚步报告分区列数 × 行数。 */
  zoneCols: number;
  zoneRows: number;
  tag: string;
  description: string;
}

export const regions: RegionSpec[] = [
  {
    id: "scout",
    name: "苔石回廊",
    code: "MOSS GALLERY",
    width: 10,
    height: 10,
    mines: 14,
    guardCount: 3,
    zoneCols: 3,
    zoneRows: 2,
    tag: "初阶勘探",
    description: "藤蔓之下，古老的回廊仍在沉睡。",
    tracks: [
      [
        [1, 1], [2, 1], [3, 1], [4, 1], [5, 1],
        [5, 2], [5, 3], [4, 3], [3, 3], [2, 3], [1, 3], [1, 2],
      ],
      [
        [7, 1], [8, 1], [8, 2], [8, 3], [8, 4], [7, 4], [7, 3], [7, 2],
      ],
      [
        [1, 6], [2, 6], [3, 6], [4, 6], [4, 7], [4, 8],
        [3, 8], [2, 8], [1, 8], [1, 7],
      ],
    ],
  },
  {
    id: "scholar",
    name: "沉沙祭坛",
    code: "SUNKEN ALTAR",
    width: 12,
    height: 12,
    mines: 27,
    guardCount: 4,
    zoneCols: 3,
    zoneRows: 2,
    tag: "进阶勘探",
    description: "被细沙掩埋的祭坛，藏着更深的秘密。",
    tracks: [
      [
        [1, 1], [2, 1], [3, 1], [4, 1], [5, 1],
        [5, 2], [4, 2], [3, 2], [2, 2], [1, 2],
      ],
      [
        [8, 1], [9, 1], [10, 1], [10, 2], [10, 3], [9, 3], [8, 3], [8, 2],
      ],
      [
        [1, 7], [2, 7], [3, 7], [4, 7], [4, 8], [4, 9], [3, 9], [2, 9], [1, 9], [1, 8],
      ],
      [
        [7, 6], [8, 6], [9, 6], [10, 6], [10, 7], [10, 8],
        [9, 8], [8, 8], [7, 8], [7, 7],
      ],
    ],
  },
  {
    id: "legend",
    name: "日蚀神殿",
    code: "ECLIPSE TEMPLE",
    width: 14,
    height: 12,
    mines: 38,
    guardCount: 5,
    zoneCols: 3,
    zoneRows: 2,
    tag: "大师勘探",
    description: "穿过光与影，寻找失落文明最后的回声。",
    tracks: [
      [
        [1, 1], [2, 1], [3, 1], [4, 1], [4, 2], [3, 2], [2, 2], [1, 2],
      ],
      [
        [7, 1], [8, 1], [9, 1], [10, 1], [10, 2], [9, 2], [8, 2], [7, 2],
      ],
      [
        [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [5, 6], [4, 6], [3, 6], [2, 6], [1, 6],
      ],
      [
        [8, 5], [9, 5], [10, 5], [11, 5], [11, 6], [11, 7], [10, 7], [9, 7], [8, 7], [8, 6],
      ],
      [
        [3, 9], [4, 9], [5, 9], [6, 9], [7, 9], [7, 10],
        [6, 10], [5, 10], [4, 10], [3, 10],
      ],
    ],
  },
];

export function region(id: Difficulty): RegionSpec {
  return regions.find((r) => r.id === id) ?? regions[0];
}
