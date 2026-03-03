import * as ROT from "rot-js";
import { Actor, Player } from "./Actor";
import { Device, Terminal } from "./Device";
import { Game } from "./Game";
import { Popup, YesNoPopup } from "./Popup";
import { InfoPopupController, YesNoController } from "./InputController";
import { Terrain, TERRAIN_DEF } from "./Terrain";
import type { TerrainType } from "./Terrain";
import { randomTextExcerptSync, NUM_LVLS } from "./Utils";
import { TypingTestPopup, TypingTestController } from "./TypingTest";
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
  robots: Actor[] = [];

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

  public addRobot(robot: Actor, level: number, x: number, y: number): void {
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

  tryMove(dx: number, dy: number, game: Game | null, actor: Actor): void {
    const nx = actor.x + dx;
    const ny = actor.y + dy;
    const key = `${nx},${ny}`;
    const terrain = this.maps[this.currLevel][key];

    if (terrain === undefined || !TERRAIN_DEF[terrain].walkable) {
      if (actor instanceof Player)
        this.addMessage("You cannot go that way!");
      return;
    } else if (actor instanceof Player && terrain == Terrain.LiftDown) {
      this.stepOnLift(nx, ny, game);
      return;
      
    }

    actor.x = nx;
    actor.y = ny;
  
    if (this.devices[this.currLevel][key]) {
      this.handleDevice(actor, this.devices[this.currLevel][key])
    }
    // else if (this.occupied(nx, ny)) {
    //   if (actor instanceof Player)
    //     this.addMessage("There's someone in your way!");
    //   return;
    // } 
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

  private handleDevice(_actor: Actor, device: Device): void {
    if (device instanceof Terminal) {
      this.game.pushPopup(new YesNoPopup("", "\nAccess terminal?", 5, 10, 30));
      this.game.pushInputController(new YesNoController(this.game, (yes) => {
        if (yes) 
          this.startTerminalHack(device);
      }));
    }
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
