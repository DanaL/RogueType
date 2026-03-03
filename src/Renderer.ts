import * as ROT from "rot-js";
import { GameState } from "./GameState";
import { TERRAIN_DEF } from "./Terrain";

type Cell = { glyph: string; fg: string; bg: string | null; sx: number; sy: number };

export class Renderer {
  private display: ROT.Display;
  private width: number;
  private height: number;

  constructor(width: number, height: number, fontSize: number) {
    this.width = width;
    this.height = height;
    this.display = new ROT.Display({ width, height, fontSize });
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
    const camX = Math.max(0, Math.min(state.width  - vpW, state.player.x - Math.floor(vpW / 2)));
    const camY = Math.max(0, Math.min(state.height - vpH, state.player.y - Math.floor(vpH / 2)));

    return { camX, camY, vpW, vpH };
  }

  drawGameArea(gs: GameState): void {
    this.display.clear();

    const { camX, camY, vpW, vpH } = this.cameraFor(gs);
    const cells: Record<string, Cell> = {};
    const barkCells: Record<string, Cell> = {};

    for (const key in gs.maps[gs.currLevel]) {
      const [wx, wy] = key.split(",").map(Number);
      const sx = wx - camX;
      const sy = wy - camY;
      if (sx < 0 || sx >= vpW || sy < 0 || sy >= vpH)
        continue;

      const def = TERRAIN_DEF[gs.maps[gs.currLevel][key]];
      const lvlKey = `${gs.currLevel},${key}`;

      if (key == gs.highlightedLoc) {
        const cell = { glyph: def.glyph, fg: "#fff", bg: "#ff5cff", sx: sx, sy: sy};
        cells[`${sx},${sy}`] = cell;
      } else if (gs.visible[lvlKey]) {
        const cell = { glyph: def.glyph, fg: def.fg, bg: null, sx: sx, sy: sy};
        cells[`${sx},${sy}`] = cell;
      } else if (gs.explored[lvlKey]) {
        const cell = { glyph: def.glyph, fg: "#222", bg: null, sx: sx, sy: sy};
        cells[`${sx},${sy}`] = cell;
      }

      if (gs.devices[gs.currLevel][key]) {
        const visible = gs.visible[lvlKey];
        const explored = gs.explored[lvlKey];
        if (!(visible || explored))
          continue;

        const device = gs.devices[gs.currLevel][key];        
        if (key === gs.highlightedLoc) {
          const cell = { glyph: device.ch, fg: "#fff", bg: "#ff5cff", sx: sx, sy: sy};
          cells[`${sx},${sy}`] = cell;
        } else if (visible) {
          const cell = { glyph: device.ch, fg: device.colour, bg: null, sx: sx, sy: sy};
          cells[`${sx},${sy}`] = cell;
        } else if (explored) {
          const cell = { glyph: device.ch, fg: "#222", bg: null, sx: sx, sy: sy};
          cells[`${sx},${sy}`] = cell;
        }
      } 
    }

    for (const robot of gs.robots) {
      if (robot.level !== gs.currLevel)
        continue;

      const coord = `${robot.x},${robot.y}`;
      const vkey = `${robot.level},${coord}`;
      if (gs.visible[vkey]) {
        const sx = robot.x - camX;
        const sy = robot.y - camY;
        if (sx < 0 || sx >= vpW || sy < 0 || sy >= vpH)
          continue;
        const fg = coord == gs.highlightedLoc ? "#fff" : robot.colour;
        const bg = coord == gs.highlightedLoc ? "#ff5cff" : "#000";
        cells[`${robot.x},${robot.y}`] = { glyph: robot.ch, fg: fg, bg: bg, sx: sx, sy: sy};
      }
    }

    for (const cell of Object.values(cells)) {
      this.display.draw(cell.sx, cell.sy + this.MAP_Y, cell.glyph, cell.fg, cell.bg);
    }

    for (const cell of Object.values(barkCells)) {
      this.display.draw(cell.sx, cell.sy + this.MAP_Y, cell.glyph, cell.fg, cell.bg);
    }

    this.display.draw(gs.player.x - camX, gs.player.y - camY + this.MAP_Y,  gs.player.ch, "#000", gs.player.colour);
  }

  drawUI(gs: GameState): void {
    let col = 1;
    const hullRatio = gs.player.currHull / gs.player.maxHull;
    const hullBars = Math.round(20 * hullRatio);
    for (const ch of "chassis: ") {
      this.display.draw(col++, 0, ch, "#009d4a", "#111");
    }
    let count = 0;
    for (; count < hullBars; count++) {
      this.display.draw(col++, 0, '=',"#ff004e", "#111");
    }
    for (; count < 20; count++) {
      this.display.draw(col++, 0, '=', "#4e6ea8","#111");
    }
    col += 3;
    for (const ch of "firewall: ") {
      this.display.draw(col++, 0, ch, "#009d4a", "#111");
    }
    const fwRatio = gs.player.currFirewall / gs.player.maxFirewall;
    const fwBars = Math.round(20 * fwRatio);
    count = 0;
    for (; count < fwBars; count++) {
      this.display.draw(col++, 0, '=',"#60ff64", "#111");
    }
    for (; count < 20; count++) {
      this.display.draw(col++, 0, '=', "#4e6ea8","#111");
    }

    col += 2;
    for (const ch of "access: ") {
      this.display.draw(col++, 0, ch, "#009d4a", "#111");
    }
    let colour, s;
    if (gs.player.securityClearance === 5) {
      colour = "#600088";
      s = "violet";
    } else if (gs.player.securityClearance === 4) {
      colour = "#008ac5";
      s = "blue";
    } else if (gs.player.securityClearance === 3) {
      colour = "#0aff52";
      s = "green";
    } else if (gs.player.securityClearance === 2) {
      colour = "#f9d071";
      s = "yellow";
    } else if (gs.player.securityClearance === 1) {
      colour = "#ff004e";
      s = "red";
    } else {
      colour = "#4e6ea8";
      s = "none";
    }
    for (const ch of s) {
      this.display.draw(col++, 0, ch, colour, "#111");
    }

    // Write message log
    const msgColors = ["#444", "#777", "#bbb"]; // oldest → newest
    const msgStartY = this.height - 3;
    for (let age = 0; age < 3; age++) {
      const msg = gs.messages[age] ?? "";
      const row = msgStartY + (2 - age); // age 0 (newest) → bottom row
      const color = msgColors[2 - age];  // age 0 (newest) → brightest color
      for (let j = 0; j < Math.min(msg.length, this.width); j++) {
        this.display.draw(j, row, msg[j], color, "#000");
      }
    }
  }
}
