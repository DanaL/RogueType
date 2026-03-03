import { InputController } from "./InputController";
import { Game } from "./Game";
import { Popup } from "./Popup";
import type { GameState } from "./GameState";
import { MAP_WIDTH } from "./Utils";
import type { Player } from "./Actor";
import { Software, SoftwareCategory } from "./Software";

export class SWManagementController extends InputController {
  private gs: GameState;
  private game: Game;
  private row: number = 0;
  private popup: SWManagementPopup;
  constructor(gs: GameState, game: Game) {
    super();
    this.gs = gs;
    this.game = game;
    this.popup = new SWManagementPopup(gs.player, game);

    game.pushPopup(this.popup);
  }

  handleInput(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.game.popPopup();
      this.game.popInputController();
    } else if (e.key === 's' || e.key === 'ArrowDown' || e.key === 'j') {
      e.preventDefault();
      if (this.gs.player.hackedRobot) {
        this.row = (this.row + 1) % this.gs.player.hackedRobot.software.length;
        this.popup.selection = this.row;
        this.popup.setText();
      }
    } else if (e.key === 'w' || e.key === 'ArrowUp' || e.key === 'k') {
      e.preventDefault();
      if (this.gs.player.hackedRobot) {
        this.row = (this.row - 1)
        if (this.row < 0)
          this.row = this.gs.player.hackedRobot.software.length - 1;
        this.popup.selection = this.row;
        this.popup.setText();
      }
    }
  }
}

class SWManagementPopup extends Popup {
  selection: number = 0;
  private player: Player;
  private game: Game;

  constructor(player: Player, game: Game) {
    const title = player.hackedRobot ? `*software system control [#add4fa ${player.hackedRobot.name}]*` : "";
    super(title, "", 1, MAP_WIDTH / 2 - 26, 60);
    this.game = game;
    this.player = player;
    this.setText();
  }

  setText(): void {
    if (!this.player.hackedRobot)
      return;

    let s = "";
    const capactiy = this.player.hackedRobot.memorySize;
    const width = Math.max(10, ...this.player.hackedRobot.software.map(sw => sw.name.length)) + 2;

    let slotsUsed = 0;
    let swNum = 0;    
    for (const sw of this.player.hackedRobot.software) {
      let bl = swNum == this.selection ? '>' : '_';
      let br = swNum == this.selection ? '<' : '_';
      const bg = {
        [SoftwareCategory.ICE]: "#009d4a",
        [SoftwareCategory.ICEBreaker]: "#ff004e",
        [SoftwareCategory.Behaviour]: "#005260",
        [SoftwareCategory.Data]: "#f9d071"
      }[sw.cat] ?? "#add4fa";
      

      s += `[#fff,${bg} ${bl}]`;
      s += `[#000,${bg} ${sw.name}]`;
      s += `[#fff,${bg} ${'_'.repeat(width - sw.name.length - 2)}${br}]\n`;

      for (let j = 1; j < sw.size; j++) {
        s += `[#fff,${bg} ${bl}]`;
        s += `[${bg},${bg} ${'_'.repeat(width - 2)}]`;
        s += `[#fff,${bg} ${br}]\n`;      
      }

      slotsUsed += sw.size;
      ++swNum;
    }


    while (slotsUsed < capactiy) {
      s += `[#add4fa,#add4fa ${'_'.repeat(width)}]\n`;
      ++slotsUsed;
    }

    this.text = s;
  }
}