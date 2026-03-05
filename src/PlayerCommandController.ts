import { InfoPopupController, InputController } from "./InputController";
import { Game } from "./Game";
import type { Examinable } from "./ExamineController";
import { ExamineController } from "./ExamineController";
import { Terrain } from "./Terrain";
import { capitalize, indefArticle, MOVE_KEYS, ActionResult } from "./Utils";
import { SWManagementController } from "./SWManagementController";
import { Popup } from "./Popup";
import { JigsawController } from "./Jigsaw";
import { ForkLifter } from "./Actor";
import { Mirror } from "./Device";

export class PlayerCommandController extends InputController {
  private game: Game;

  constructor(game: Game) {
    super();
    this.game = game;
  }

  handleInput(e: KeyboardEvent): void {
    if (e.key === "x") {
      const { gs } = this.game;
      
      const targets: Examinable[] = Object.entries(gs.devices[gs.currLevel])
        .filter(([key]) => gs.visible[`${gs.currLevel},${key}`] || gs.explored[`${gs.currLevel},${key}`])
        .map(([key, device]) => {
          const [x, y] = key.split(',').map(Number);
          return { x, y, name: device.name, desc: device.desc };
        });

      for (const [key, terrain] of Object.entries(gs.maps[gs.currLevel])) {
        if (!(gs.visible[`${gs.currLevel},${key}`] || gs.explored[`${gs.currLevel},${key}`]))
          continue;

        const [x, y] = key.split(',').map(Number);
        switch (terrain) {
          case Terrain.LiftDown:
            targets.push({ x, y, name: "Down Elevator", desc: "For security reasons, elevators in the Facility only go between two floors each." });
            break;
          case Terrain.LiftUp:
            targets.push({ x, y, name: "Up Elevator", desc: "For security reasons, elevators in the Facility only go between two floors each." });
            break;
        }
      }

      for (const robot of gs.robots) {
        const key = `${robot.level},${robot.x},${robot.y}`;
        if (gs.visible[key]) {
          const n = capitalize(indefArticle(robot.name));
          targets.push({ x: robot.x, y: robot.y, name: n, desc: robot.desc})
        }
      }

      if (targets.length > 0) {
        this.game.pushInputController(new ExamineController(this.game, targets));
      } else {
        gs.addMessage("There is nothing interesting to examine.");
      }
      return;
    } else if (e.key === "m") {
      const swm = new SWManagementController(this.game.gs, this.game);
      this.game.pushInputController(swm);
      
      return;
    } else if (e.key === "v") {
      const vped = new JigsawController(this.game.gs.player, this.game);
      this.game.pushInputController(vped);

      return;
    } else if (e.key === "u") {
      const { gs } = this.game;
      const robot = gs.player.hackedRobot;

      if (robot instanceof ForkLifter) {
        const loc = `${gs.player.x},${gs.player.y}`;
        if (robot.carriedDevice !== null) {
          if (gs.devices[gs.currLevel][loc]) {
            gs.addMessage("There is already something here.");
          } else {
            gs.devices[gs.currLevel][loc] = robot.carriedDevice;
            gs.addMessage(`You place the ${robot.carriedDevice.name}.`);
            robot.carriedDevice = null;
            gs.player.endTurn();
          }
        } else {
          const device = gs.devices[gs.currLevel][loc];
          if (device instanceof Mirror) {
            robot.carriedDevice = device;
            delete gs.devices[gs.currLevel][loc];
            gs.addMessage(`You pick up the ${device.name}. Press [r] to rotate it.`);
            gs.player.endTurn();
          } else if (device) {
            gs.addMessage(`You can't pick up the ${device.name}.`);
          } else {
            gs.addMessage("There is nothing here to pick up.");
          }
        }
      } else {
        gs.addMessage("This bot has no extra functions.");
      }
      return;
    } else if (e.key === "r") {
      const { gs } = this.game;
      const robot = gs.player.hackedRobot;
      if (robot instanceof ForkLifter && robot.carriedDevice instanceof Mirror) {
        robot.carriedDevice.rotate();
        gs.addMessage(`You rotate the mirror (now ${robot.carriedDevice.ch}).`);
      }
      return;
    } else if (e.key === "D") {
      this.game.gs.disconnectCurrentRobot();
      return;
    } else if (e.key === "Q") {
      this.game.gs.quit();
      return;
    }

    const dir = MOVE_KEYS[e.key];
    if (dir) {
      e.preventDefault();
      const result = this.game.gs.tryMove(dir[0], dir[1], this.game, this.game.gs.player);
      this.game.gs.computeFov();
      if (result !== ActionResult.Pending)
        this.game.gs.player.endTurn();
    } else if (e.key == ' ' || e.key == '.') {
      // A pass action
      this.game.gs.computeFov();
      this.game.gs.player.endTurn();
    }
  }
}
