import * as ROT from "rot-js";
import { Actor, DozerBot, Player, Robot, ShieldedBot } from "./Actor";
import { ColourPuzzleGoal, ColourPuzzleTile, Crate, Device, LightSource, LightTrigger, Mirror, Terminal, TimerTrigger, WeightTrigger } from "./Device";
import { Game } from "./Game";
import { Popup, YesNoPopup } from "./Popup";
import { InfoPopupController, YesNoController } from "./InputController";
import { Terrain, TERRAIN_DEF } from "./Terrain";
import type { TerrainType } from "./Terrain";
import { randomTextExcerptSync, NUM_LVLS, ActionResult, indefArticle, rndRange } from "./Utils";
import { TypingTestPopup, TypingTestController } from "./TypingTest";
import { RobotHackPopup, RobotHackController } from "./RobotHack";
import { TerminalController } from "./Terminal";
import { EndGameController, EndGamePopup } from "./EndGame";

export const EnvironmentHazard = { NONE: 0, RADIATION: 1 }
export type EnvironmentHazard = (typeof EnvironmentHazard)[keyof typeof EnvironmentHazard];

export const HackInitiatedBy = {
  Player: 0,
  Hacker: 1,
  SecBot: 2,
} as const;
export type HackInitiatedBy = typeof HackInitiatedBy[keyof typeof HackInitiatedBy];

export class GameState {
  readonly width: number;
  readonly height: number;
  currLevel: number = 0;
  player!: Player;

  maps: Record<string, TerrainType>[] = [];
  devices: Record<string, Device>[] = Array.from({ length: NUM_LVLS }, () => ({}));
  hazards: Record<string, EnvironmentHazard>[] = Array.from({ length: NUM_LVLS }, () => ({}));

  visible: Record<string, boolean> = {};
  explored: Record<string, boolean> = {};
  downLifts: boolean[] = Array(NUM_LVLS).fill(false);
  robots: Robot[] = [];

  onRestart: (() => void) | null = null;

  highlightedLoc: string = "";
  isAnimating: boolean = false;
  fovRadius = 10;
  turn = 0;
  messages: string[] = [];

  fov: InstanceType<typeof ROT.FOV.PreciseShadowcasting>;
  game!: Game;

  beamTiles: Set<string> = new Set();
  
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

  postTurn(actor: Actor): void {
    this.checkWeightedGateState();

    const shielded = actor instanceof ShieldedBot 
              || (actor instanceof Player && actor.hackedRobot instanceof ShieldedBot);
    const loc = `${actor.x},${actor.y}`;
    if (!shielded && this.hazards[actor.level][loc] === EnvironmentHazard.RADIATION) {
      actor.takeDamage(2);
      if (this.visible[`${actor.level},${loc}`] && actor instanceof Player)
        this.addMessage("Radiation is damaging your systems!");
      this.checkDestroyed(actor);
    }

    if (this.turn % 11 == 0) {
      actor.currFirewall += 1;
    }
  }

  computeBeam(): void {
    this.beamTiles = new Set();
    let beamHitsTarget = false;

    const lightSource = Object.entries(this.devices[this.currLevel])
      .find(([, d]) => d instanceof LightSource && d.on);
    if (!lightSource)
      return;

    const [key, device] = lightSource as [string, LightSource];
    const [sx, sy] = key.split(',').map(Number);
    let x = sx + device.dirX;
    let y = sy + device.dirY;
    let dx = device.dirX;
    let dy = device.dirY;

    for (let step = 0; step < 500; step++) {
        const k = `${x},${y}`;
        const terrain = this.maps[this.currLevel]?.[k];
        if (terrain === undefined || terrain === Terrain.Wall) 
          break;

        this.beamTiles.add(k);

        const tileDevice = this.devices[this.currLevel][k];
        if (tileDevice instanceof Crate) 
          break;
        if (tileDevice instanceof LightTrigger) {
          beamHitsTarget = true;
          break;
        }
        if (tileDevice instanceof Mirror) {
          [dx, dy] = tileDevice.flipped ? [dy, dx] : [-dy, -dx];
        }

        x += dx;
        y += dy;
      }

    let gateLoc = "";
    for (const loc of Object.keys(this.maps[this.currLevel])) {
      const t = this.maps[this.currLevel][loc];
      if (t === Terrain.Gate || t === Terrain.OpenGate) {
        gateLoc = loc;
        break;
      }
    }
          
    if (gateLoc === "")
      return;

    const prevState = this.maps[this.currLevel][gateLoc];
    this.maps[this.currLevel][gateLoc] = beamHitsTarget ? Terrain.OpenGate : Terrain.Gate;
    if (prevState !== this.maps[this.currLevel][gateLoc]) {
      this.addMessage("You hear a pneumatic hiss.");
    }
  }

  roundEnd(): void {
    ++this.turn;
    this.computeBeam();

    const devices = Object.values(this.devices[this.currLevel]);
    for (const timerTrigger of devices.filter(d => d instanceof TimerTrigger)) {
      if (timerTrigger.countDown === 1) {
        timerTrigger.countDown = 0;
        const gateMapLoc = `${timerTrigger.gateX},${timerTrigger.gateY}`;
        const gateLoc = `${this.currLevel},${gateMapLoc}`;

        if (this.maps[this.currLevel][gateMapLoc] === Terrain.DeactivatedGate)
          return;

        this.maps[this.currLevel][gateMapLoc] = Terrain.Gate;
        if (this.visible[gateLoc])
          this.addMessage("The gate closes with a hiss.");
      } else if (timerTrigger.countDown > 1) {
        --timerTrigger.countDown;
      }
    }

    // check the state of the colour puzzle if there is one.
    const colourPuzzleGoal = devices.find(d => d instanceof ColourPuzzleGoal);
    if (colourPuzzleGoal) {      
      const goalColour = colourPuzzleGoal.colourNum;
      const complete = !devices.some(d => d instanceof ColourPuzzleTile && d.colourNum !== goalColour);
      const gateMapLoc = `${colourPuzzleGoal.gateX},${colourPuzzleGoal.gateY}`;
      const gateLoc = `${this.currLevel},${gateMapLoc}`;
      const gateTile = this.maps[this.currLevel][gateMapLoc];

      if (gateTile === Terrain.DeactivatedGate) {
        return;
      } else if (complete && gateTile === Terrain.Gate) {
        this.maps[this.currLevel][gateMapLoc] = Terrain.OpenGate;
        if (this.visible[gateLoc])
          this.addMessage("You hear a pneumatic hiss.");
      } else if (!complete && gateTile === Terrain.OpenGate) {
        this.maps[this.currLevel][gateMapLoc] = Terrain.Gate;
        if (this.visible[gateLoc])
          this.addMessage("The gate closes with a hiss.");
      }
    }
  }

  private checkWeightedGateState() {
    const actorLocs = new Set<string>([
      ...this.robots
        .filter(r => r.level === this.currLevel)
        .map(r => `${r.x},${r.y}`)
    ]);
    actorLocs.add(`${this.player.x},${this.player.y}`);

    for (const [key, device] of Object.entries(this.devices[this.currLevel])) {
      if (device instanceof Crate)
        actorLocs.add(key);
    }

    let weightTriggers: Record<string, WeightTrigger> = {};
    let gateOpen = false;
    for (const [key, device] of Object.entries(this.devices[this.currLevel])) {
      if (device instanceof WeightTrigger)
        weightTriggers[key] = device;
    }

    if (Object.keys(weightTriggers).length > 0) {
      gateOpen = true;
      for (const loc of Object.keys(weightTriggers)) {
        if (!actorLocs.has(loc)) {
          gateOpen = false;
          weightTriggers[loc].weighted = false;
        } else {
          weightTriggers[loc].weighted = true;
          if (!weightTriggers[loc].weighted && this.visible[`${this.currLevel},${loc}`])
            this.addMessage("You hear a click.");
        } 
      }
    } 
    else {
      return;
    }

    let gateLoc = "";
    let gate = -1;
    for (const loc of Object.keys(this.maps[this.currLevel])) {
      if (this.maps[this.currLevel][loc] === Terrain.Gate || this.maps[this.currLevel][loc] === Terrain.OpenGate) {
        gateLoc = loc;
        gate = this.maps[this.currLevel][loc];
      }
    }

    if (gate === Terrain.DeactivatedGate)
      return;

    if (gateOpen && gate === Terrain.Gate) {
      this.maps[this.currLevel][gateLoc] = Terrain.OpenGate;
      if (this.visible[`${this.currLevel},${gateLoc}`])
        this.addMessage("You hear a pneumatic hiss.");
    } else if (!gateOpen && gate === Terrain.OpenGate) {
      this.maps[this.currLevel][gateLoc] = Terrain.Gate;
      if (this.visible[`${this.currLevel},${gateLoc}`])
        this.addMessage("The gate closes with a hiss.");
    }
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

  private changeLevel(newLevel: number): void {
    for (const robot of this.robots.filter(r => r.level === this.currLevel))
      this.game.scheduler.remove(robot);

    this.currLevel = newLevel;

    for (const robot of this.robots.filter(r => r.level === this.currLevel)) {
      this.game.scheduler.add(robot, true);
    }
  }

  private takeLift(nextLevel: number, arrival: TerrainType): void {
    for (const [key, terrain] of Object.entries(this.maps[nextLevel])) {
      if (terrain === arrival) {
        const [x, y] = key.split(',').map(Number);
        this.player.x = x;
        this.player.y = y;
        this.player.level = nextLevel;
        break;
      }
    }

    this.changeLevel(nextLevel);
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

  private checkDestroyed(actor: Actor): void {
    if (actor.currHull > 0) 
      return;

    const actorLoc = `${actor.level},${actor.x},${actor.y}`;
    if (actor instanceof Player) {
      this.game.pushPopup(new Popup("", "Your robot was 86'd.", 4, 40, 25));
      this.game.pushInputController(new InfoPopupController(this.game));
      this.addMessage("Your robot was 86'd.");
      this.player.hackedRobot = null;
      this.disconnect();
    } else if (actor instanceof Robot) {
      if (this.visible[actorLoc])
        this.addMessage(`The ${actor.name} is destroyed!`);
      this.game.scheduler.remove(actor);
      this.robots = this.robots.filter(r => r !== actor);
    }
  }

  assault(target: Actor, attacker: Actor, strength: number): void {
    const attackerName = attacker instanceof Player ? "You" : `The ${attacker.name}`;
    const targetName = target instanceof Player ? "you" : `the ${target.name};`
    const targetLoc = `${target.level},${target.x},${target.y}`;
    const s = this.visible[targetLoc]
                ? `${attackerName} attacks ${targetName}!`
                : "You hear electronic squeals and the sounds of plastic and metal being battered.";
    this.addMessage(s);

    target.takeDamage(strength);
    this.checkDestroyed(target);
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
    } else if (isPlayer && terrain === Terrain.Mainframe) {
      actor.x = nx;
      actor.y = ny;
      const popup = new EndGamePopup(3, 10);
      const controller = new EndGameController(this.game, this, popup, (success) => {
        if (success) {
          const blurb = "Succees! You have uploaded the Cookie Monster Virus Model C into the Mainframe core. Soon it will have overwritten the system. The world should finally be safe from the paperclip scourge.";
          const popup = new Popup("> victory <", blurb, 5, 10, 35);
          this.game.pushPopup(popup);
          this.game.pushInputController(new InfoPopupController(this.game, this.onRestart));
        } else {
          const blurb = ".......flatlined...\n\nif you ever recover, it will be in a world of paperclips. glorious paperclips. paperclips everywhere. paperclip paradise...";
          const popup = new Popup("> game over <", blurb, 5, 10, 35);
          this.game.pushPopup(popup);
          this.game.pushInputController(new InfoPopupController(this.game, this.onRestart));
        }
      });
      this.game.pushInputController(controller);
      this.game.pushPopup(popup);
      return ActionResult.Complete;
    } else if (isPlayer && terrain === Terrain.LiftDown) {
      this.stepOnLift(nx, ny, game);
      return ActionResult.Complete;
    } else if (isPlayer && terrain === Terrain.LiftUp) {
      this.takeLift(this.currLevel - 1, Terrain.LiftDown);
      return ActionResult.Complete;
    } else if (this.occupied(nx, ny)) {
      if (isPlayer && this.bumpIntoRobot(nx, ny))
        return ActionResult.Pending;
      return ActionResult.Failure;
    }

    const device = this.devices[this.currLevel][key];

    if (device instanceof ColourPuzzleGoal) {      
      this.addMessage("You cannot go that way!");
      return ActionResult.Failure;
    }

    const dozer = actor instanceof DozerBot || (isPlayer && this.player.hackedRobot instanceof DozerBot);
    const crate = device instanceof Crate;
    if (crate && dozer) {
      return this.tryToPushCrate(actor, device, nx, ny, dx, dy);
    } else if (crate) {
      if (isPlayer)
        this.addMessage("Your robot body is too weak to push that crate.");
      return ActionResult.Failure;
    }

    actor.x = nx;
    actor.y = ny;

    if (device) {
      if (isPlayer)
        this.addMessage(`There is ${indefArticle(device.name)} here.`);
      if (this.handleDevice(actor, device))
        return ActionResult.Pending;
    }

    return ActionResult.Complete;
  }

  private tryToPushCrate(actor: Actor, crate: Crate, cx: number, cy: number, dx: number, dy: number): ActionResult {
    const nx = cx + dx;
    const ny = cy + dy;
    const destKey = `${nx},${ny}`;
    const terrain = this.maps[this.currLevel][destKey];

    if (terrain === undefined || !TERRAIN_DEF[terrain].walkable)
      return ActionResult.Failure;

    if (this.occupied(nx, ny)) {
      if (actor instanceof Player)
        this.addMessage("You cannot move the crate.");
      return ActionResult.Failure;
    }
    const destDevice = this.devices[this.currLevel][destKey];
    if (destDevice instanceof Terminal) {
      if (actor instanceof Player)
        this.addMessage("You cannot move the crate.");
      return ActionResult.Failure;
    }

    delete this.devices[this.currLevel][`${cx},${cy}`];
    this.devices[this.currLevel][destKey] = crate;

    actor.x = cx;
    actor.y = cy;

    return ActionResult.Complete;
  }

  private expunged(): void {
    this.game.pushPopup(new Popup("","\n[#d93e48 U HAVE BEEN EXPUNGED]\n\n-- press any key to continue --", 10, 20, 40));
    this.game.pushInputController(new InfoPopupController(this.game, this.onRestart));
  }

  private disconnect() {
    do {
      let robotId = this.player.previousRobots.pop() ?? -1;

      if (robotId === -1) {
        this.expunged();
        return;
      }

      for (const robot of this.robots) {
        if (robot.id === robotId) {
          this.switchToRobot(robot);
          this.currLevel = robot.level;
          this.computeFov();
          return;
        }
      }
    }
    while (true);
  }

  disconnectCurrentRobot(): void {
    let msg = "\ndisconnect from current remote host?";
    if (this.player.previousRobots.length === 0) {
      msg += "\n\n[#d93e48 * warning:] no previous host. u will be expunged."
    }

    this.game.pushPopup(new YesNoPopup("", msg, 5, 10, 50));
    this.game.pushInputController(new YesNoController(this.game, (yes) => {
      if (yes) {
        this.disconnect();
        this.computeFov();
        this.player.endTurn();
      }
    }));
  }

  quit(): void {
    let msg = "\nquit current run and restart?";
    
    this.game.pushPopup(new YesNoPopup("", msg, 5, 10, 50));
    this.game.pushInputController(new YesNoController(this.game, (yes) => {
      if (yes && this.onRestart) {
        this.onRestart();
      }
    }));
  }

  private bumpIntoRobot(x: number, y: number): boolean {
    const robot = this.robots.find(a => a.level === this.currLevel && a.x === x && a.y === y) ?? null;

    if (!robot) return false;

    this.game.pushPopup(new YesNoPopup("", `\nAttempt to hack ${robot.name}`, 5, 10, 30));
    this.game.pushInputController(new YesNoController(this.game, (yes) => {
      if (yes) {
        this.startRobotHack(robot, HackInitiatedBy.Player);
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
      this.takeLift(this.currLevel + 1, Terrain.LiftUp);
    }    
  }

  private handleDevice(actor: Actor, device: Device): boolean {
    if (actor instanceof Player && device instanceof Terminal) {
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
    } else if (device instanceof TimerTrigger) {
      if (device.countDown === 0) {
        device.countDown = 6;
        const gateLoc = `${device.gateX},${device.gateY}`;
        if (this.maps[this.currLevel][gateLoc] === Terrain.DeactivatedGate) {
          return false;
        }
        
        const actorLoc = `${this.currLevel},${actor.x},${actor.y}`;
        this.maps[this.currLevel][gateLoc] = Terrain.OpenGate;
        if (this.visible[actorLoc])
          this.addMessage("You hear a click and a buzzer begins to sound.");
        if (this.visible[`${this.currLevel},${device.gateX},${device.gateY}`])
          this.addMessage("You hear a pneumatic hiss.");
      }
    } else if (device instanceof ColourPuzzleTile) {
      this.switchColourPuzzleTile(device, actor.x, actor.y);
    }

    return false;
  }

  private switchColourPuzzleTile(tile: ColourPuzzleTile, x: number, y: number): void {
    let n: Device | undefined;
    switch (tile.position) {
      case 0: // top-left
        n = this.devices[this.currLevel][`${x+1},${y}`];
        if (n instanceof ColourPuzzleTile) n.switchColour();
        n = this.devices[this.currLevel][`${x},${y+1}`];
        if (n instanceof ColourPuzzleTile) n.switchColour();
        break;
      case 1: // top
        n = this.devices[this.currLevel][`${x-1},${y}`];
        if (n instanceof ColourPuzzleTile) n.switchColour();
        break;
      case 2: // top-right
        n = this.devices[this.currLevel][`${x-1},${y}`];
        if (n instanceof ColourPuzzleTile) n.switchColour();
        n = this.devices[this.currLevel][`${x},${y+1}`];
        if (n instanceof ColourPuzzleTile) n.switchColour();
        break;
      case 3: // left
        n = this.devices[this.currLevel][`${x},${y+1}`];
        if (n instanceof ColourPuzzleTile) n.switchColour();
        break;
      case 5: // right
        n = this.devices[this.currLevel][`${x},${y-1}`];
        if (n instanceof ColourPuzzleTile) n.switchColour();
        break;
      case 6: // bottom-left
        n = this.devices[this.currLevel][`${x+1},${y}`];
        if (n instanceof ColourPuzzleTile) n.switchColour();
        n = this.devices[this.currLevel][`${x},${y-1}`];
        if (n instanceof ColourPuzzleTile) n.switchColour();
        break;
      case 7: // bottom
        n = this.devices[this.currLevel][`${x+1},${y}`];
        if (n instanceof ColourPuzzleTile) n.switchColour();
        break;
      default: // bottom-right
        n = this.devices[this.currLevel][`${x-1},${y}`];
        if (n instanceof ColourPuzzleTile) n.switchColour();
        n = this.devices[this.currLevel][`${x},${y-1}`];
        if (n instanceof ColourPuzzleTile) n.switchColour();
        break;
    }
  }

  startRobotHack(robot: Robot, initiatedBy: HackInitiatedBy): void {
    let taunt = "";    
    if (initiatedBy === HackInitiatedBy.Hacker) {
      const taunts = ["MESS WITH THE BEST DIE LIKE THE REST", "MY KUNGFU IS THE BEST", "LOSER", "DO U THINK U CAN DEFEAT ME?? L0L"];
      taunt = taunts[rndRange(taunts.length)];
    } else if (initiatedBy === HackInitiatedBy.SecBot) {
      taunt = "INTRUDER DETECTED"
    }

    const popup = new RobotHackPopup(robot.name, robot.currFirewall, robot.maxFirewall, 2, 1);
    const wordCount = Math.round(this.game.wpm / 4);
    const controller = new RobotHackController(this.game, this, robot, popup, wordCount, taunt, (success) => {
      if (success) {
        robot.pwned = false;

        if (initiatedBy === HackInitiatedBy.Hacker) {
          const msg = `You expelled the other hacker from the ${robot.name}.`;
          const popup = new Popup("", `\n${msg}`, 5, 10, 40);
          this.addMessage(msg);
          this.game.pushPopup(popup);
          this.game.pushInputController(new InfoPopupController(this.game));
        } else {
          this.player.previousRobots.push(robot.id);
          const msg = `You have taken control of the ${robot.name}.`;
          const popup = new Popup("", msg, 5, 10, 35);
          this.addMessage(msg);
          this.game.pushPopup(popup);
          this.game.pushInputController(new InfoPopupController(this.game));

          this.switchToRobot(robot);
          robot.previouslyHacked = true;
          robot.currFirewall = Math.round(robot.maxFirewall / 3);
        }
      } else {
        if (this.player.currFirewall === 0) {
          const popup = new Popup("", "\nconne[#ac29ce c]tion terminated.", 5, 10, 35);
          this.game.pushPopup(popup);
          this.game.pushInputController(new InfoPopupController(this.game));
          this.disconnect();
        } else {
          const popup = new Popup("", "\nYou have been expunged.", 5, 10, 35);
          this.game.pushPopup(popup);
          this.game.pushInputController(new InfoPopupController(this.game));
        }
      }

      if (initiatedBy === HackInitiatedBy.Player) {
        this.computeFov();
        this.player.endTurn();
      }      
    });

    this.game.pushPopup(popup);
    this.game.pushInputController(controller);
  }

  private switchToRobot(robot: Robot): void {
    this.game.scheduler.remove(robot);
    this.robots = this.robots.filter(r => r !== robot);

    if (this.player.hackedRobot) {
      let prevRobot = this.player.hackedRobot;
      prevRobot.x = this.player.x;
      prevRobot.y = this.player.y;
      prevRobot.level = this.currLevel;
      this.robots.push(prevRobot);
      this.game.scheduler.add(prevRobot, true);
      this.player.previousRobots.push(prevRobot.id);
    }
       
    this.player.level = robot.level;
    this.player.x = robot.x;
    this.player.y = robot.y;
    this.player.ch = robot.ch;
    this.player.colour = robot.colour;
    this.player.hackedRobot = robot;
    this.player.currRobotId = robot.id;
    this.player.securityClearance = robot.securityClearance;
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
        if (this.player.currFirewall === 0) {
          this.addMessage("intrusion detected -- remote connection severed.");
          this.disconnect();
        }
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
