import * as ROT from "rot-js";
import { GameState } from "./GameState";
import { TERRAIN_DEF } from "./Terrain";
import { lerpLine, distance } from "./Utils";

type Cell = { glyph: string; fg: string; bg: string | null; sx: number; sy: number };

export class Renderer {
  private display: ROT.Display;
  private width: number;
  private height: number;

  constructor(width: number, height: number, fontSize: number) {
    this.width = width;
    this.height = height;
    this.display = new ROT.Display({ width, height, fontSize, fontFamily: '"Share Tech Mono", monospace' });
  }

  getContainer(): HTMLElement {
    return this.display.getContainer()!;
  }

  readonly MAP_Y = 1; // row 0 is the status bar

  drawChar(row: number, col: number, ch: string, fg: string, bg: string): void {
    this.display.draw(col, row, ch, fg, bg);
  }

  drawText(row: number, col: number, txt: string, fg: string, bg: string): void {
    this.display.draw(col, row, txt, fg, bg);
  }

  cameraFor(state: GameState): { camX: number, camY: number, vpW: number, vpH: number } {
    const vpW = this.width;
    const vpH = this.height - this.MAP_Y - 3;
    const camX = 10;
    const camY = 10;
    //const camX = Math.max(0, Math.min(state.width  - vpW, state.player.x - Math.floor(vpW / 2)));
    //const camY = Math.max(0, Math.min(state.height - vpH, state.player.y - Math.floor(vpH / 2)));
    return { camX, camY, vpW, vpH };
  }

  drawGameArea(state: GameState): void {
    this.display.clear();

    const { camX, camY, vpW, vpH } = this.cameraFor(state);
    const cells: Record<string, Cell> = {};
    const barkCells: Record<string, Cell> = {};

    for (const key in state.map) {
      const [wx, wy] = key.split(",").map(Number);
      const sx = wx - camX;
      const sy = wy - camY;
      if (sx < 0 || sx >= vpW || sy < 0 || sy >= vpH)
        continue;

      const def = TERRAIN_DEF[state.map[key]];

      if (state.visible[key]) {
        const cell = { glyph: def.glyph, fg: def.fg, bg: null, sx: sx, sy: sy};
        cells[`${sx},${sy}`] = cell;
      } else if (state.explored[key]) {
        const cell = { glyph: def.glyph, fg: "#222", bg: null, sx: sx, sy: sy};
        cells[`${sx},${sy}`] = cell;
      }
    }

    for (const cell of Object.values(cells)) {
      this.display.draw(cell.sx, cell.sy + this.MAP_Y, cell.glyph, cell.fg, cell.bg);
    }

    for (const cell of Object.values(barkCells)) {
      this.display.draw(cell.sx, cell.sy + this.MAP_Y, cell.glyph, cell.fg, cell.bg);
    }

    //this.display.draw(state.player.x - camX, state.player.y - camY + this.MAP_Y, "@", "#b45252", null);
  }

  drawUi(state: GameState): void {
    let col = 1;

    // for (const ch of "Health: ") {
    //   this.display.draw(col++, 0, ch, "#f2f0e5", "#111");
    // }
    // for (let i = 0; i < 3; i++) {
    //   const filled = true;
    //   this.display.draw(col++, 0, filled ? "\u2665" : "\u2661", filled ? "#b45252" : "#500", "#111");
    // }

    // Write message log
    const msgColors = ["#444", "#777", "#bbb"]; // oldest → newest
    const msgStartY = this.height - 3;
    for (let age = 0; age < 3; age++) {
      const msg = state.messages[age] ?? "";
      const row = msgStartY + (2 - age); // age 0 (newest) → bottom row
      const color = msgColors[2 - age];  // age 0 (newest) → brightest color
      for (let j = 0; j < Math.min(msg.length, this.width); j++) {
        this.display.draw(j, row, msg[j], color, "#000");
      }
    }
  }
}
