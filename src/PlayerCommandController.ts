import { InputController } from "./InputController";
import { Game } from "./Game";
import type { Examinable } from "./ExamineController";
import { ExamineController } from "./ExamineController";
import { Terrain } from "./Terrain";
import { indefArticle, MOVE_KEYS } from "./Utils";

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

      if (targets.length > 0) {
        this.game.pushInputController(new ExamineController(this.game, targets));
      } else {
        gs.addMessage("There is nothing interesting to examine.");
      }
      return;
    }

    const dir = MOVE_KEYS[e.key];
    if (dir) {
      e.preventDefault();
      this.game.gs.tryMove(dir[0], dir[1], this.game, this.game.gs.player);
      this.game.gs.computeFov();
      this.game.gs.player.endTurn();
    } else if (e.key == ' ' || e.key == '.') {
      // A pass action
      this.game.gs.computeFov();
      this.game.gs.player.endTurn();
    }

    this.game.gs.computeFov();
    this.game.gs.player.endTurn();
  }
}
