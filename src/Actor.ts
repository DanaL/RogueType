import * as ROT from "rot-js";
import { GameState } from "./GameState";
import { TERRAIN_DEF } from "./Terrain";
import { ActionResult, ICELevel } from "./Utils";
import { Software, SoftwareCategory } from "./Software";

export abstract class Actor {
  x: number;
  y: number;
  level: number = 0; // level as in dungeon level, not an expression of power
  ch: string;
  colour: string;

  abstract get maxHull(): number;
  abstract get currHull(): number;
  abstract set currHull(val: number);
  abstract set maxHull(val: number);

  abstract get maxFirewall(): number;
  abstract get currFirewall(): number;
  abstract set currFirewall(val: number);
  
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

  get maxHull(): number { return this.hackedRobot ? this.hackedRobot.maxHull : 0; }
  get currHull(): number { return this.hackedRobot ? this.hackedRobot.currHull : 0; }
  set currHull(val: number) {
    if (this.hackedRobot)
      this.hackedRobot.currHull = val;
  }
  set maxHull(val: number) {
    if (this.hackedRobot)
      this.hackedRobot.maxHull = val;
  }

  get maxFirewall(): number { return this.hackedRobot ? this.hackedRobot.maxFirewall : 0; }
  get currFirewall(): number { return this.hackedRobot ? this.hackedRobot.currFirewall : 0; }
  set currFirewall(val: number) {
    if (this.hackedRobot)
      this.hackedRobot.currFirewall = val;
  }
  
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
  software: Software[] = [];
  ice = ICELevel.Weak;
  memorySize = 0;

  protected _maxHull: number = 0;
  get maxHull() { return this._maxHull; }
  protected _currHull: number = 0;
  get currHull() { return this._currHull; }
  set currHull(val: number) { this._currHull = Math.min(val, this.maxHull) };
  set maxHull(val: number) { this._maxHull = val };

  get maxFirewall() {
    return this.software
      .filter(sw => sw.cat === SoftwareCategory.ICE)
      .reduce((sum, sw) => sum + 5 * sw.level, 0);
  }

  protected _currFirewall: number = 0;
  get currFirewall() { return this._currFirewall }
  set currFirewall(val: number) { this._currFirewall = Math.min(val, this.maxFirewall) }
  
  protected gs: GameState

  constructor(x: number, y: number, ch: string, colour: string, gs: GameState) {
    super(x, y, ch, colour);
    this.id = Robot.#nextId++;
    this.gs = gs;
  }
}

export class BasicBot extends Robot {  
  constructor(name: string, desc: string, ch: string, colour: string, x: number, y: number, gs: GameState) {    
    super(x, y, ch, colour, gs);
    this.name = name;
    this.desc = desc;
  }

  act(): Promise<void> {
    this.randomMove(this.gs);

    return Promise.resolve();
  }
}

export class Roomba extends Robot {
  constructor(x: number, y: number, gs: GameState) {
    super(x, y, 'o', '#fff', gs);
    this.name = "roomba";
    this.desc = "A standard cleaning bot. Conveniently innocuous.";
    this.x = x;
    this.y = y;
    this._maxHull = 3;    
    this.currHull = 3;    
    this.accuracy = 0.80;
    this.securityClearance = 1;
    this.memorySize = 3;

    this.software.push(new Software("Facility Firewall Gold Edition", SoftwareCategory.ICE, false, 1, 1));
    this.software.push(new Software("DW Move Protocal", SoftwareCategory.Behaviour, false, 1, 1));
    this.currFirewall = 5;    
  }

  act(): Promise<void> {
    if (this.randomMove(this.gs) === ActionResult.Failure && this.gs.visible[`${this.level},${this.x},${this.y}`]) {
      this.gs.addMessage("The roomba beeps.");
    }

    return Promise.resolve();
  }
}