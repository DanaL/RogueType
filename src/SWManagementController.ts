import { InputController } from "./InputController";
import { Game } from "./Game";
import { Popup } from "./Popup";
import type { GameState } from "./GameState";
import { MAP_WIDTH } from "./Utils";
import type { Player } from "./Actor";

export class SWManagementController extends InputController {
  private gs: GameState;
  private game: Game;

  constructor(gs: GameState, game: Game) {
    super();
    this.gs = gs;
    this.game = game;

    game.pushPopup(new SWManagementPopup(gs.player, game));
  }

  handleInput(e: KeyboardEvent): void {
    this.game.popPopup();
    this.game.popInputController();
  }
}

class SWManagementPopup extends Popup {
  private player: Player;
  private game: Game;

  constructor(player: Player, game: Game) {
    super("[ software system control ]", "", 1, MAP_WIDTH / 2 - 26, 50);
    this.game = game;
    this.player = player;
    this.setText();
  }

  private setText(): void {
    if (!this.player.hackedRobot)
      return;

    let s = "";
    const capactiy = this.player.hackedRobot.memorySize;
    const width = Math.max(10, ...this.player.hackedRobot.software.map(sw => sw.name.length));

    let slot = 0;
        
    while (slot++ < capactiy) {
      s += `[#4e6ea8 ${'█'.repeat(width)}]\n`;
    }

    this.text = s;
  }
}