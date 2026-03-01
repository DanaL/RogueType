import * as ROT from "rot-js";
import { Game } from "./Game";
import { Popup } from "./Popup";
import { InfoPopupController } from "./InputController";
import { Terrain, TERRAIN_DEF } from "./Terrain";
import type { TerrainType } from "./Terrain";
import { lerpLine, adj8Locs } from "./Utils";

export class GameState {
  readonly width: number;
  readonly height: number;

  map: Record<string, TerrainType> = {};
  freeCells: string[] = [];
  visible: Record<string, boolean> = {};
  explored: Record<string, boolean> = {};

  examinedLoc: string = "";
  isAnimating: boolean = false;
  fovRadius = 10;
  turn = 0;
  messages: string[] = [];

  //fov: InstanceType<typeof ROT.FOV.PreciseShadowcasting>;
  game!: Game;

  constructor() {
    this.width = 80;
    this.height = 25;
  }

  computeFov(): void {
    
  }

  floodFill(startX: number, startY: number, radius: number): Set<string> {
    const reachable = new Set<string>();
    const visited = new Set<string>();
    const queue: [number, number, number][] = [[startX, startY, 0]];
    visited.add(`${startX},${startY}`);

    while (queue.length > 0) {
      const [x, y, dist] = queue.shift()!;
      reachable.add(`${x},${y}`);
      if (dist >= radius) 
        continue;

      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]] as const) {
        const nx = x + dx;
        const ny = y + dy;
        const key = `${nx},${ny}`;
        if (visited.has(key)) 
          continue;
        visited.add(key);
        const terrain = this.map[key];

        // Doors are passable but will block sound
        if (terrain === undefined || terrain === Terrain.Door) 
          continue;
        if (TERRAIN_DEF[terrain].walkable || terrain === Terrain.Water) {
          queue.push([nx, ny, dist + 1]);
        }
      }
    }

    return reachable;
  }

  addMessage(msg: string): void {
    this.messages.unshift(msg);
    if (this.messages.length > 3) this.messages.length = 3;
  }
}
