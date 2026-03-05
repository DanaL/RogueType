import * as ROT from "rot-js";
import { JigsawPiece } from "./Jigsaw";

export const ActionResult = { Complete: 0, Failure: 1, Pending: 2 } as const;
export type ActionResult = (typeof ActionResult)[keyof typeof ActionResult];

export const ICELevel = { Weak: 0, Normal: 1, Strong: 2, Freezing: 3 } as const;
export type ICELevel = (typeof ICELevel)[keyof typeof ICELevel];

export const MAP_WIDTH = 100;
export const MAP_ROWS = 32;
export const NUM_LVLS = 9;

export const MOVE_KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
  h: [-1, 0], j: [0, 1], k: [0, -1], l: [1, 0]
};

export function rngRange(n: number): number;
export function rngRange(min: number, max: number): number;
export function rngRange(minOrN: number, max?: number): number {
  if (max === undefined)
    return Math.floor(ROT.RNG.getUniform() * minOrN);
  return minOrN + Math.floor(ROT.RNG.getUniform() * (max - minOrN + 1));
}

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

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
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

const TEXT_FILES = ['alice.txt', 'frank.txt', 'janeeyre.txt', 'moby.txt', '20kleagues.txt', 'warworlds.txt'];
const textCache = new Map<string, string[]>();

async function loadTextWords(filename: string): Promise<string[]> {
  if (textCache.has(filename)) 
    return textCache.get(filename)!;
  const response = await fetch(`/texts/${filename}`);
  const text = await response.text();
  const words = text.split(/\s+/).filter(w => w.length > 0);
  textCache.set(filename, words);

  return words;
}

function excerptFromWords(words: string[], wordCount: number): string {
  if (words.length <= wordCount)
    return words.join(' ');

  const startIdx = Math.floor(ROT.RNG.getUniform() * (words.length - wordCount));
  const slice = words.slice(startIdx, startIdx + wordCount);

  const prevWord = startIdx > 0 ? words[startIdx - 1] : null;
  const startsAtSentence = prevWord === null || /[.!?]["']?$/.test(prevWord);
  const endsAtSentence = /[.!?]["']?$/.test(slice[slice.length - 1]);

  let excerpt = slice.join(' ');
  if (!startsAtSentence)
    excerpt = '...' + excerpt;
  if (!endsAtSentence)
    excerpt = excerpt + '...';

  return excerpt.trim().replace(/\n/g, ' ').replace(/  +/g, ' ');
}

export async function warmTextCache(): Promise<void> {
  await Promise.all(TEXT_FILES.map(loadTextWords));
}

export function randomTextExcerptSync(wordCount: number): string {
  const file = TEXT_FILES[Math.floor(ROT.RNG.getUniform() * TEXT_FILES.length)];
  const words = textCache.get(file);
  if (!words) throw new Error(`Text cache not warmed: ${file}`);
  return excerptFromWords(words, wordCount);
}

export async function randomTextExcerpt(wordCount: number): Promise<string> {
  const file = TEXT_FILES[Math.floor(ROT.RNG.getUniform() * TEXT_FILES.length)];
  const words = await loadTextWords(file);
  return excerptFromWords(words, wordCount);
}

let petFont: Map<string, string[]> | null = null;

function parsePetFont(text: string): Map<string, string[]> {
  const font = new Map<string, string[]>();
  const lines = text.split('\n');

  let i = 0;
  while (i < lines.length) {
    const label = lines[i].trim();
    if (label.length === 1 && /[A-Z0-9]/.test(label)) {
      const rows: string[] = [];
      i++;
      while (i < lines.length && /^[.*]{8}$/.test(lines[i])) {
        rows.push(lines[i]);
        i++;
      }
      if (rows.length > 0)
        font.set(label, rows);
    } else {
      i++;
    }
  }

  return font;
}

export async function warmFontCache(): Promise<void> {
  if (petFont) 
    return;
  const response = await fetch('/pet-font.txt');
  const text = await response.text();
  petFont = parsePetFont(text);
}

// Returns one string per row. Each character contributes 8 columns.
// Unknown characters are silently skipped.
export function renderBitmap(input: string): JigsawPiece[] {
  const chars = [...input.toUpperCase()]
    .map(ch => petFont!.get(ch))
    .filter((rows): rows is string[] => rows !== undefined);

  if (chars.length === 0) 
    return [];

  const rowCount = chars[0].length;
  const result: JigsawPiece[] = [];

  for (let row = 0; row < rowCount; row++) {
    const s = chars.map(c => c[row] ?? '........').join('');
    const piece = new JigsawPiece(row, s);
    result.push(piece);
  }
  
  return result;
}
