export const MOVE_KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
  h: [-1, 0], j: [0, 1], k: [0, -1], l: [1, 0]
};

function diagDistance(x0: number, y0: number, x1: number, y1: number): number {
   return Math.max(Math.abs(x0 - x1), Math.abs(y0 - y1));
}

function roundPt(pt: [number, number]): [number, number] {
  return [ Math.round(pt[0]), Math.round(pt[1]) ];
}

function lerp(start: number, end: number, t: number) {
  return start * (1.0 - t) + end * t;
}

function lerpPts(x0: number, y0: number, x1: number, y1: number, t: number): [number, number] {
  return [ lerp(x0, x1, t), lerp(y0, y1, t) ];
}

export function lerpLine(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const pts: [number, number][] = [];
  let n = diagDistance(x0, y0, x1, y1);
  for (let step = 0; step <= n; step++) {
    let t = n === 0 ? 0.0 : step / n;
    pts.push(roundPt(lerpPts(x0, y0, x1, y1, t)));
  }

  return pts;
}

export function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.max(Math.abs(bx - ax), Math.abs(by - ay));
}

export function indefArticle(s: string): string {
  const first = s[0];
  if (first >= '0' && first <= '9') 
    return s;

  return 'aeiouAEIOUyY'.includes(first) ? `an ${s}` : `a ${s}`;
}

export const adj8: [number, number][] = [
  [-1, 0], [1, 0], [0, 1], [0, -1],
  [-1, -1], [-1, 1], [1, -1], [1, 1]
];

export function adj8Locs(x: number, y: number): [number, number][] {
  return adj8.map(([dx, dy]) => [x + dx, y + dy]);
}

