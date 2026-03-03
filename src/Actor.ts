import * as ROT from "rot-js";
import { GameState } from "./GameState";
import { TERRAIN_DEF } from "./Terrain";
import { ActionResult, ICELevel } from "./Utils";

export abstract class Actor {
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

  protected randomMove(gs: GameState): ActionResult {
    const dirs: [number, number][] = [[0, -1], [0, 1], [1, 0], [-1, 0]];
    const [dx, dy] = dirs[Math.floor(ROT.RNG.getUniform() * 4)];
    
    const terrain = gs.maps[gs.currLevel][`${this.x + dx},${this.y + dy}`];
    if (TERRAIN_DEF[terrain].walkable) {
      return gs.tryMove(dx, dy, null, this);
    }

    return ActionResult.Failure;
  }

  abstract act(): Promise<void>;
}

export class Player extends Actor {
  currRobotId: number = 1;
  hackedRobot: Robot | null = null;

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

export abstract class Robot extends Actor {
  static #nextId = 2;
  readonly id: number;
  name: string = "";
  desc: string = "";
  accuracy: number = 0.0;
  ice = ICELevel.Weak;

  constructor(x: number, y: number, ch: string, colour: string) {
    super(x, y, ch, colour);
    this.id = Robot.#nextId++;
  }
}

export class BasicBot extends Robot {  
  constructor(name: string, desc: string, ch: string, colour: string, x: number, y: number) {    
    super(x, y, ch, colour);
    this.name = name;
    this.desc = desc;
  }

  act(): Promise<void> {
    return Promise.resolve();
  }
}

export class Roomba extends Robot {
  private readonly gs: GameState;

  constructor(x: number, y: number, gs: GameState) {
    super(x, y, 'o', '#fff');
    this.name = "roomba";
    this.desc = "A standard cleaning bot. Conveniently innocuous.";
    this.x = x;
    this.y = y;
    this.gs = gs;
    this.maxHull = 3;
    this.currHull = 3;
    this.currFirewall = 5;
    this.maxFirewall = 5;
    this.accuracy = 0.80;
    this.securityClearance = 1;
  }

  act(): Promise<void> {
    if (this.randomMove(this.gs) === ActionResult.Failure && this.gs.visible[`${this.level},${this.x},${this.y}`]) {
      this.gs.addMessage("The roomba beeps.");
    }

    return Promise.resolve();
  }
}