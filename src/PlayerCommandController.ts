import { InputController } from "./InputController";
import { Game } from "./Game";
import { indefArticle, MOVE_KEYS } from "./Utils";

export class PlayerCommandController extends InputController {
  private game: Game;

  constructor(game: Game) {
    super();
    this.game = game;
  }

  handleInput(e: KeyboardEvent): void {    
    const dir = MOVE_KEYS[e.key];
    if (dir) {
      e.preventDefault();
      this.game.state.tryMove(dir[0], dir[1], this.game, this.game.state.player);
      this.game.state.computeFov();
      this.game.state.player.endTurn();
    } else if (e.key == ' ' || e.key == '.') {
      // A pass action
      this.game.state.computeFov();
      this.game.state.player.endTurn();
    }

    this.game.state.computeFov();
    this.game.state.player.endTurn();
  }
}
