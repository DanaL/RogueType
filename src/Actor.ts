import * as ROT from "rot-js";
import { GameState } from "./GameState";
import { TERRAIN_DEF } from "./Terrain";
import { ActionResult, ICELevel, rngRange } from "./Utils";
import { Software, SoftwareCategory } from "./Software";
import type { JigsawPiece } from "./Jigsaw";
import type { Device } from "./Device";

export abstract class Actor {
  x: number;
  y: number;
  level: number = 0; // level as in dungeon level, not an expression of power
  ch: string;
  colour: string;
  name: string = "";

  protected gs: GameState;

  abstract get maxHull(): number;
  abstract get currHull(): number;
  abstract set currHull(val: number);
  abstract set maxHull(val: number);

  abstract get maxFirewall(): number;
  abstract get currFirewall(): number;
  abstract set currFirewall(val: number);
  
  securityClearance: number = 0;

  constructor(x: number, y: number, ch: string, colour: string, gs: GameState) {
    this.x = x;
    this.y = y;
    this.ch = ch;
    this.colour = colour;
    this.gs = gs;
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

  private isAssaultTarget(levelNum: number, x: number, y: number): Actor | null {
    if (levelNum === this.gs.player.level && x === this.gs.player.x && y === this.gs.player.y)
      return this.gs.player;
    
    for (const robot of this.gs.robots) {
      if (levelNum === robot.level && x === robot.x && y === robot.y)
        return robot;
    }

    return null;
  }

  protected randomAssault(): ActionResult {
    const dirs: [number, number][] = [[0, -1], [0, 1], [1, 0], [-1, 0]];
    const targets: Actor[] = [];
    for (const d of dirs) {
      const target = this.isAssaultTarget(this.level, this.x + d[0], this.y + d[1]);
      if (target)
        targets.push(target);      
    }

    if (targets.length > 0) {
      this.gs.assault(targets[rngRange(targets.length)], this, 2);
      return ActionResult.Complete;
    }

    return ActionResult.Failure;
  }

  takeDamage(amount: number): void {
    this.currHull = Math.max(0, this.currHull - amount);
  }

  endTurn(): void {
    this.gs.postTurn(this);
  }

  abstract act(): Promise<void>;
}

export class Player extends Actor {
  currRobotId: number = 1;
  hackedRobot: Robot | null = null;
  softwareArchive: Software[] = [];
  jigsawPieces: JigsawPiece[] = [];
  previousRobots: number[] = [];

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
    super.endTurn();
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
  desc: string = "";
  accuracy: number = 0.0;
  software: Software[] = [];
  ice: ICELevel = ICELevel.Weak;
  memorySize = 0;
  previouslyHacked = false;
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
  get currFirewall() { return Math.min(this._currFirewall, this.maxFirewall) }
  set currFirewall(val: number) { this._currFirewall = Math.min(val, this.maxFirewall) }
  
  constructor(x: number, y: number, ch: string, colour: string, gs: GameState) {
    super(x, y, ch, colour, gs);
    this.id = Robot.#nextId++;

    if (rngRange(5) === 0)
      this.software.push(new Software("Experimental Evil Algorithm", SoftwareCategory.Behaviour, false, 1, 2));      
  }

  act(): Promise<void> {
    for (const sw of this.software) {
      if (sw.name === "Experimental Evil Algorithm") {
        const res = this.randomAssault();
        if (res === ActionResult.Complete)
          break;
      }

      if (sw.name === "DW Move Protocol") {
        const res = this.randomMove(this.gs);

        // in a non-7DRL I wouldn't write shitty code like this...
        if (res === ActionResult.Failure && this.name === "roomba" && this.gs.visible[`${this.level},${this.x},${this.y}`])
          this.gs.addMessage("The roomba beeps.");
        else if (res === ActionResult.Complete)
          break;
      }
    }
    
    this.endTurn();
    return Promise.resolve();
  }
}

export class BasicBot extends Robot {  
  constructor(name: string, desc: string, ch: string, colour: string, x: number, y: number, gs: GameState) {    
    super(x, y, ch, colour, gs);
    this.name = name;
    this.desc = desc;
  }
}

export class Roomba extends Robot {
  constructor(x: number, y: number, gs: GameState) {
    super(x, y, 'o', '#fff', gs);
    this.name = "roomba";
    this.desc = "A standard cleaning bot. Conveniently innocuous.";
    this.x = x;
    this.y = y;
    this._maxHull = 5;    
    this.currHull = 5;    
    this.accuracy = 0.80;
    this.securityClearance = 1;
    this.memorySize = 3;

    this.software.push(new Software("Facility Firewall Gold Edition", SoftwareCategory.ICE, false, 1, 1));
    this.software.push(new Software("DW Move Protocol", SoftwareCategory.Behaviour, false, 1, 1));
    this.currFirewall = 5;    
  }
}

export class ShieldedBot extends Robot {
  constructor(x: number, y: number, gs: GameState) {
    super(x, y, 'r', '#0aff52', gs);
    this.name = "shielded bot";
    this.desc = "A robot constructed with radiation shielding.";
    this.x = x;
    this.y = y;
    this._maxHull = 10;    
    this.currHull = 10;    
    this.accuracy = 1.0;
    this.securityClearance = 1;
    this.memorySize = 2;

    this.software.push(new Software("Facility Firewall Gold Edition", SoftwareCategory.ICE, false, 1, 1));
    this.software.push(new Software("DW Move Protocol", SoftwareCategory.Behaviour, false, 1, 1));
    this.currFirewall = 5;    
  }
}

export class DozerBot extends Robot {
  constructor(x: number, y: number, gs: GameState) {
    super(x, y, 'b', '#ff5cff', gs);
    this.name = "dozer bot";
    this.desc = "A miniature bulldozer. Or a very large toy bulldozer. Very pushy looking though.";
    this.x = x;
    this.y = y;
    this._maxHull = 10;    
    this.currHull = 10;    
    this.accuracy = 1.2;
    this.securityClearance = 1;
    this.memorySize = 2;

    this.software.push(new Software("Facility Firewall Gold Edition", SoftwareCategory.ICE, false, 1, 1));
    
    this.currFirewall = 5;    
  }
}

export class ForkLifter extends Robot {
  carriedDevice: Device | null = null;

  constructor(x: number, y: number, gs: GameState) {
    super(x, y, 'f', '#009d4a', gs);
    this.name = "forklifter";
    this.desc = "Early genAI designs had the flaw in that the algorithm thought it was to design a robot specifically to lift forks. Anyhow, this robot can carry stuff.";
    this.x = x;
    this.y = y;
    this._maxHull = 10;    
    this.currHull = 10;
    this.accuracy = 1.2;
    this.securityClearance = 2;
    this.memorySize = 2;


    this.software.push(new Software("Facility Firewall Platinum Edition", SoftwareCategory.ICE, false, 2, 1));
    
    this.currFirewall = 5;    
  }
}