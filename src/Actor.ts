import * as ROT from "rot-js";
import { GameState } from "./GameState";
import { TERRAIN_DEF } from "./Terrain";

export abstract class Actor {
  name: string = "";
  desc: string = "";
  x: number;
  y: number;
  level: number = 0; // level as in dungeon level, not an expression of power
  ch: string;
  colour: string;
  maxHull: number = 0;
  currHull: number = 0;
  maxFirewall: number = 0;
  currFirewall: number = 0;
  securityClearance: number = 0;

  constructor(x: number, y: number, ch: string, colour: string) {
    this.x = x;
    this.y = y;
    this.ch = ch;
    this.colour = colour;
  }

  protected randomMove(gs: GameState): void {
    const dirs: [number, number][] = [[0, -1], [0, 1], [1, 0], [-1, 0]];
    const [dx, dy] = dirs[Math.floor(ROT.RNG.getUniform() * 4)];
    
    const terrain = gs.maps[gs.currLevel][`${this.x + dx},${this.y + dy}`];
    if (TERRAIN_DEF[terrain].walkable) {
      gs.tryMove(dx, dy, null, this);
    }
  }

  abstract act(): Promise<void>;
}

export class Player extends Actor {
  
  // not sure if this will be needed for rogue type
  private _endTurn: (() => void) | null = null;

  endTurn(): void {
    this._endTurn?.();
  }

  act(): Promise<void> {
    return new Promise(resolve => {
      this._endTurn = resolve;
    });
  }
}

export class Roomba extends Actor {
  private readonly gs: GameState;

  constructor(x: number, y: number, gs: GameState) {
    super(x, y, 'o', '#fff');
    this.name = "roomba";
    this.desc = "A standard cleaning bot. Conveniently innocuous.";
    this.x = x;
    this.y = y;
    this.gs = gs;
  }

  act(): Promise<void> {
    this.randomMove(this.gs);

    return Promise.resolve();
  }
}