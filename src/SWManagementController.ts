import { InputController } from "./InputController";
import { Game } from "./Game";
import { Popup } from "./Popup";
import type { GameState } from "./GameState";
import { MAP_WIDTH } from "./Utils";
import type { Player } from "./Actor";
import { SoftwareCategory } from "./Software";

const MAIN_MENU = 0;
const DELETE_MENU = 1;

export class SWManagementController extends InputController {
  private gs: GameState;
  private game: Game;
  private row: number = 0;
  private popup: SWManagementPopup;
  private state: number = MAIN_MENU;

  constructor(gs: GameState, game: Game) {
    super();
    this.gs = gs;
    this.game = game;
    this.popup = new SWManagementPopup(gs.player);

    game.pushPopup(this.popup);
  }

  handleInput(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.game.popPopup();
      this.game.popInputController();

      return;
    } else if (this.state == MAIN_MENU && (e.key === 's' || e.key === 'ArrowDown' || e.key === 'j')) {
      e.preventDefault();
      if (this.gs.player.hackedRobot) {
        this.row = (this.row + 1) % this.gs.player.hackedRobot.software.length;
        this.popup.selection = this.row;
      }
    } else if (this.state == MAIN_MENU && (e.key === 'w' || e.key === 'ArrowUp' || e.key === 'k')) {
      e.preventDefault();
      if (this.gs.player.hackedRobot) {
        this.row = (this.row - 1)
        if (this.row < 0)
          this.row = this.gs.player.hackedRobot.software.length - 1;
        this.popup.selection = this.row;
      }
    } else if (this.state === MAIN_MENU && this.popup.options.has('e') && e.key === 'e') {
      this.state = DELETE_MENU;
    } else if (this.state === DELETE_MENU && e.key === 'n') {
      this.state = MAIN_MENU;
    } else if (this.state === DELETE_MENU && e.key === 'y') {
      this.gs.player.hackedRobot?.software.splice(this.row, 1);
      this.row = 0;
      this.popup.selection = 0;
      this.state = MAIN_MENU;
    }

    this.popup.setText(this.state);
  }
}

class SWManagementPopup extends Popup {
  selection: number = 0;
  options = new Set<string>();
  private player: Player;
  
  constructor(player: Player) {
    const title = player.hackedRobot ? `*software system control [#add4fa ${player.hackedRobot.name}]*` : "";
    super(title, "", 1, MAP_WIDTH / 2 - 26, 60);
    this.player = player;
    this.setText(MAIN_MENU);
  }

  setText(state: number): void {
    if (state === MAIN_MENU)
      this.writeMainMenu();
    else if (state === DELETE_MENU)
      this.deleteMenu();
  }

  private deleteMenu(): void {
    const sw = this.player.hackedRobot?.software[this.selection];
    let s = `Delete [#add4fa ${sw?.name}]?\n[#4a6b8a (software will remain available from aux databank)]`;
    s += "\n\n__[#fff (][#ac29ce y][#fff )]es [#fff (][#ac29ce n][#fff )]o";

    this.text = s;
  }

  private writeMainMenu(): void {
    if (!this.player.hackedRobot)
      return;

    this.options = new Set<string>(['u']);

    const lines: string[] = [];
    const capacity = this.player.hackedRobot.memorySize;
    const width = Math.max(10, ...this.player.hackedRobot.software.map(sw => sw.name.length)) + 2;

    let slotsUsed = 0;
    let swNum = 0;    
    for (const sw of this.player.hackedRobot.software) {
      let line = "";
      let bl = swNum === this.selection ? '>' : '_';
      let br = swNum === this.selection ? '<' : '_';
      const bg = {
        [SoftwareCategory.ICE]: "#009d4a",
        [SoftwareCategory.ICEBreaker]: "#ff004e",
        [SoftwareCategory.Behaviour]: "#005260",
        [SoftwareCategory.Data]: "#f9d071"
      }[sw.cat] ?? "#add4fa";
      

      line += `[#fff,${bg} ${bl}]`;
      line += `[#000,${bg} ${sw.name}]`;
      line += `[#fff,${bg} ${'_'.repeat(width - sw.name.length - 2)}${br}]\n`;
      lines.push(line);

      for (let j = 1; j < sw.size; j++) {
        line = `[#fff,${bg} ${bl}]`;
        line += `[${bg},${bg} ${'_'.repeat(width - 2)}]`;
        line += `[#fff,${bg} ${br}]\n`;      
        lines.push(line);
      }

      slotsUsed += sw.size;
      ++swNum;
    }

    while (slotsUsed < capacity) {
      lines.push(`[#add4fa,#add4fa ${'_'.repeat(width)}]\n`);
      ++slotsUsed;
    }

    lines[0] = lines[0].slice(0, -1) + "__[#fff (][#ac29ce u][#fff )]pload software\n";
    if (this.player.hackedRobot.software.length > 0 && !this.player.hackedRobot.software[this.selection].firmware) {
      lines[1] = lines[1].slice(0, -1) + "__[#fff (][#ac29ce e][#fff )]rase selected\n";
      this.options.add('e');
    }
    this.text = lines.join("");
  }
}