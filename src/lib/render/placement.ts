import { mulberry32, range } from "../random";
import type { Placement } from "../types";

export interface Item {
  x: number;
  y: number;
  size: number;
  rotation: number; // radians
  index: number; // stable index, used to cycle through chars/icons/colors
  rand: number; // stable random 0..1 per item
}

const DEG = Math.PI / 180;

/** Region items wrap around in when drifting (for grids it's a whole number of cells, so the tiling stays intact). */
export interface Bounds {
  minX: number;
  minY: number;
  spanX: number;
  spanY: number;
  parallax: boolean;
}

export interface Layout {
  items: Item[];
  bounds: Bounds;
}

function freeBounds(items: Item[], W: number, H: number): Bounds {
  const m = Math.max(0, ...items.map((i) => i.size)) * 0.75;
  return { minX: -m, minY: -m, spanX: W + 2 * m, spanY: H + 2 * m, parallax: items.length > 1 };
}

export function layout(p: Placement, W: number, H: number): Layout {
  const items = layoutItems(p, W, H);
  if (p.mode !== "grid") return { items, bounds: freeBounds(items, W, H) };
  const { cell, cols, rows, ox, oy } = gridGeometry(p, W, H);
  return { items, bounds: { minX: ox - cell / 2, minY: oy - cell / 2, spanX: cols * cell, spanY: rows * cell, parallax: false } };
}

function gridGeometry(p: Placement, W: number, H: number) {
  const min = Math.min(W, H);
  const cell = Math.max(4, p.spacing * min);
  const cols = Math.ceil(W / cell) + 2;
  let rows = Math.ceil(H / cell) + 2;
  if (rows % 2) rows++; // keeps staggered rows consistent across the wrap
  const ox = (W - (cols - 1) * cell) / 2;
  const oy = (H - (rows - 1) * cell) / 2;
  return { cell, cols, rows, ox, oy };
}

export function layoutItems(p: Placement, W: number, H: number): Item[] {
  const min = Math.min(W, H);
  const rng = mulberry32(p.seed);
  const jitterRot = () => (rng() * 2 - 1) * p.randomRotation * DEG;

  if (p.mode === "single") {
    return [{ x: p.x * W, y: p.y * H, size: p.size * min, rotation: p.rotation * DEG, index: 0, rand: rng() }];
  }

  if (p.mode === "scatter") {
    const items: Item[] = [];
    for (let i = 0; i < p.count; i++) {
      const size = range(rng, p.sizeMin, Math.max(p.sizeMin, p.sizeMax)) * min;
      items.push({
        x: range(rng, -0.04, 1.04) * W,
        y: range(rng, -0.04, 1.04) * H,
        size,
        rotation: p.rotation * DEG + jitterRot(),
        index: i,
        rand: rng(),
      });
    }
    // Paint small ones first so big items sit on top – feels more natural.
    return items.sort((a, b) => a.size - b.size);
  }

  const { cell, cols, rows, ox, oy } = gridGeometry(p, W, H);
  const items: Item[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const shift = p.stagger && r % 2 ? cell / 2 : 0;
      items.push({
        x: ox + c * cell + shift + (rng() * 2 - 1) * p.jitter * cell * 0.5,
        y: oy + r * cell + (rng() * 2 - 1) * p.jitter * cell * 0.5,
        size: p.size * min,
        rotation: p.rotation * DEG + jitterRot(),
        index: r + c,
        rand: rng(),
      });
    }
  }
  return items;
}
