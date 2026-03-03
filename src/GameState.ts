import * as ROT from "rot-js";
import { Actor, Player, Robot } from "./Actor";
import { Device, Terminal } from "./Device";
import { Game } from "./Game";
import { Popup, YesNoPopup } from "./Popup";
import { InfoPopupController, YesNoController } from "./InputController";
import { Terrain, TERRAIN_DEF } from "./Terrain";
import type { TerrainType } from "./Terrain";
import { randomTextExcerptSync, NUM_LVLS, ActionResult } from "./Utils";
import { TypingTestPopup, TypingTestController } from "./TypingTest";
import { RobotHackPopup, RobotHackController } from "./RobotHack";
import { TerminalController } from "./Terminal";

export class GameState {
  readonly width: number;
  readonly height: number;
  currLevel: number = 0;
  player!: Player;

  maps: Record<string, TerrainType>[] = [];
  devices: Record<string, Device>[] = Array.from({ length: NUM_LVLS }, () => ({}));
  freeCells: string[] = [];
  visible: Record<string, boolean> = {};
  explored: Record<string, boolean> = {};
  downLifts: boolean[] = Array(NUM_LVLS).fill(false);
  robots: Robot[] = [];

  highlightedLoc: string = "";
  isAnimating: boolean = false;
  fovRadius = 10;
  turn = 0;
  messages: string[] = [];

  fov: InstanceType<typeof ROT.FOV.PreciseShadowcasting>;
  game!: Game;

  constructor() {
    this.width = 80;
    this.height = 25;

    this.fov = new ROT.FOV.PreciseShadowcasting((x, y) => {
      if (x === this.player.x && y === this.player.y) 
        return true;
      const terrain = this.maps[this.currLevel][`${x},${y}`];
      return terrain !== undefined && !TERRAIN_DEF[terrain].opaque;
    });
  }

  computeFov(): void {
    for (const k in this.visible) 
      delete this.visible[k];

    this.fov.compute(this.player.x, this.player.y, this.fovRadius, (x: number, y: number, _r: number, visibility: number) => {
      if (visibility) {
        const key = `${this.currLevel},${x},${y}`;
        this.visible[key] = true;
        this.explored[key] = true;
      }
    });
  }

  public addRobot(robot: Robot, level: number, x: number, y: number): void {
    robot.level = level;
    robot.x = x;
    robot.y = y;

    this.robots.push(robot);
    if (level == this.currLevel)
      this.game.scheduler.add(robot, true);
  }

  private takeLiftDown(): void {
    ++this.currLevel;
    
    for (const [key, terrain] of Object.entries(this.maps[this.currLevel])) { 
      if (terrain === Terrain.LiftUp) {
        const [x, y] = key.split(',').map(Number);
        this.player.x = x;
        this.player.y = y;
        break;
      }
    }
  }

  occupied(x: number, y: number): boolean {
    if (this.player.x === x && this.player.y === y)
      return true;

    for (const robot of this.robots) {
      if (robot.level === this.currLevel && robot.x === x && robot.y === y)
        return true;
    }

    return false;
  }

  tryMove(dx: number, dy: number, game: Game | null, actor: Actor): ActionResult {
    const nx = actor.x + dx;
    const ny = actor.y + dy;
    const key = `${nx},${ny}`;
    const terrain = this.maps[this.currLevel][key];
    const isPlayer = actor instanceof Player;

    if (terrain === undefined || !TERRAIN_DEF[terrain].walkable) {
      if (isPlayer)
        this.addMessage("You cannot go that way!");
      return ActionResult.Failure;
    } else if (actor instanceof Player && terrain == Terrain.LiftDown) {
      this.stepOnLift(nx, ny, game);
      return ActionResult.Success;
    } else if (this.occupied(nx, ny)) {
      if (isPlayer && this.bumpIntoRobot(nx, ny))
        return ActionResult.Pending;
      return ActionResult.Failure;
    }

    actor.x = nx;
    actor.y = ny;

    if (isPlayer && this.devices[this.currLevel][key]) {
      if (this.handleDevice(this.devices[this.currLevel][key]))
        return ActionResult.Pending;
    }

    return ActionResult.Success;
  }

  private bumpIntoRobot(x: number, y: number): boolean {
    const robot = this.robots.find(a => a.level === this.currLevel && a.x === x && a.y === y) ?? null;

    if (!robot) return false;

    this.game.pushPopup(new YesNoPopup("", `\nAttempt to hack ${robot.name}`, 5, 10, 30));
    this.game.pushInputController(new YesNoController(this.game, (yes) => {
      if (yes) {
        this.startRobotHack(robot);
      } else {
        this.computeFov();
        this.player.endTurn();
      }
    }));

    return true;
  }

  private stepOnLift(dx: number, dy: number, game: Game | null): void {
    this.player.x = dx;
    this.player.y = dy;

    if (!this.downLifts[this.currLevel]) {
      const msg = "The lift is currently disabled."
      this.addMessage(msg);
      game?.pushPopup(new Popup("", "\n" + msg, 3, 10, 31));
      game?.pushInputController(new InfoPopupController(game));
    } else if (this.player.securityClearance < 1) {
      const msg = "You do not have sufficient security access to use an elevator.";
      this.addMessage(msg);
      game?.pushPopup(new Popup("", "\n" + msg, 3, 10, 31));
      game?.pushInputController(new InfoPopupController(game));
    } else {
      this.takeLiftDown();
    }    
  }

  private handleDevice(device: Device): boolean {
    if (device instanceof Terminal) {
      this.game.pushPopup(new YesNoPopup("", "\nAccess terminal?", 5, 10, 30));
      this.game.pushInputController(new YesNoController(this.game, (yes) => {
        if (yes)
          this.startTerminalHack(device);
        else {
          this.computeFov();
          this.player.endTurn();
        }
      }));
      return true;
    }
    return false;
  }

  private startRobotHack(robot: Robot): void {
    const popup = new RobotHackPopup(robot.name, robot.currFirewall, robot.maxFirewall, 2, 1);
    const controller = new RobotHackController(this.game, this, robot, popup, (success) => {
      if (success) {
        const popup = new Popup("", `\n${robot.name} has been hacked.\n\n[Robot control menu - stub]`, 5, 10, 35);
        this.game.pushPopup(popup);
        this.game.pushInputController(new InfoPopupController(this.game));

        this.game.scheduler.remove(robot);
        this.robots = this.robots.filter(r => r !== robot);

        if (this.player.hackedRobot) {
          let prevRobot = this.player.hackedRobot;
          prevRobot.x = this.player.x;
          prevRobot.y = this.player.y;
          prevRobot.level = this.currLevel;
          this.robots.push(prevRobot);
          this.game.scheduler.add(prevRobot, true);
        }
        
        this.player.x = robot.x;
        this.player.y = robot.y;
        this.player.ch = robot.ch;
        this.player.colour = robot.colour;
        this.player.maxHull = robot.maxHull;
        this.player.currHull = robot.currHull;
        this.player.maxFirewall = robot.maxFirewall;
        this.player.currFirewall = Math.round(robot.maxFirewall / 3);
        this.player.hackedRobot = robot;
        this.player.currRobotId = robot.id;
        this.player.securityClearance = robot.securityClearance;

        //this.game.pushInputController(new InfoPopupController(this.game, () => this.onComplete()));
      } else {
        const popup = new Popup("", "\nYou have been expunged.", 5, 10, 35);
        this.game.pushPopup(popup);
        this.game.pushInputController(new InfoPopupController(this.game));
        //this.game.pushInputController(new InfoPopupController(this.game, () => this.onComplete()));
      }

      this.computeFov();
      this.player.endTurn();
    });

    this.game.pushPopup(popup);
    this.game.pushInputController(controller);
  }

  private startTerminalHack(device: Terminal): void {
    const excerpt = randomTextExcerptSync(Math.round(this.game.wpm / 4));
    const popup = new TypingTestPopup(excerpt, 3, 20, 50);
    // 16 seconds gives the player a moment to read before typing
    const controller = new TypingTestController(this.game, 16_000, excerpt, popup, (success) => {
      if (success) {
        this.openTerminalAccess(device);
      } else {
        device.accessFailures++;
        this.player.currFirewall = Math.max(0, this.player.currFirewall - 1);
        this.computeFov();
        this.player.endTurn();
      }
    });

    this.game.pushPopup(popup);
    this.game.pushInputController(controller);
  }

  private openTerminalAccess(device: Terminal): void {
    this.addMessage("\"I'm in.\"");
    const controller = new TerminalController(this, device);
    this.game.pushInputController(controller);
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
        const terrain = this.maps[this.currLevel][key];

        // Doors are passable but will block sound
        if (terrain === undefined || terrain === Terrain.Door) 
          continue;
        if (TERRAIN_DEF[terrain].walkable) {
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
