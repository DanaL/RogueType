import { InputController } from "./InputController";
import { Game } from "./Game";
import { Popup } from "./Popup";
import type { GameState } from "./GameState";
import type { Player } from "./Actor";
import { SoftwareCategory } from "./Software";

const MAIN_MENU = 0;
const DELETE_MENU = 1;
const INSTALL_MENU = 2;
const INSUFFICIENT_STORAGE = 3;
const DUPLICATE_PACKAGE = 4;

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
    e.preventDefault();


    if (this.state == MAIN_MENU && (e.key === 's' || e.key === 'ArrowDown' || e.key === 'j')) {      
      if (this.gs.player.hackedRobot) {
        this.row = (this.row + 1) % this.gs.player.hackedRobot.software.length;
        this.popup.selection = this.row;
      }
    } else if (this.state == MAIN_MENU && (e.key === 'w' || e.key === 'ArrowUp' || e.key === 'k')) {
      if (this.gs.player.hackedRobot) {
        this.row = this.row - 1;
        if (this.row < 0)
          this.row = this.gs.player.hackedRobot.software.length - 1;
        this.popup.selection = this.row;
      }
    } else if (this.state === MAIN_MENU && this.popup.options.has('e') && e.key === 'e') {
      this.state = DELETE_MENU;
    } else if (this.state === DELETE_MENU && e.key === 'n') {
      this.state = MAIN_MENU;
    } else if (this.state === DELETE_MENU && e.key === 'y') {
      this.eraseSelectedSoftware();      
    } else if (this.state === MAIN_MENU && this.popup.options.has('i') && e.key === 'i') {
      this.row = 0;
      this.popup.selection = 0;
      this.state = INSTALL_MENU;
    } else if (this.state === INSTALL_MENU && (e.key === 's' || e.key === 'ArrowDown' || e.key === 'j')) {
      if (this.gs.player.softwareArchive.length > 0) {
        this.row = (this.row + 1) % this.gs.player.softwareArchive.length;
        this.popup.selection = this.row;
      }
    } else if (this.state === INSTALL_MENU && e.key === "Escape") {
      this.state = MAIN_MENU;
    } else if (this.state === INSTALL_MENU && (e.key === 'w' || e.key === 'ArrowUp' || e.key === 'k')) {
      if (this.gs.player.softwareArchive.length > 0) {
        this.row = this.row - 1;
        if (this.row < 0)
          this.row = this.gs.player.softwareArchive.length - 1;
        this.popup.selection = this.row;
      }
    } else if (this.state === INSTALL_MENU && e.key === 'Enter') {
      this.installSelectedSoftware();
    } else if ((this.state === INSUFFICIENT_STORAGE || this.state === DUPLICATE_PACKAGE) && (e.key === 'Enter' || e.key === 'Escape')) {
      this.state = INSTALL_MENU;
    } else if (e.key === 'Escape') {
      this.game.popPopup();
      this.game.popInputController();

      return;
    }

    this.popup.setText(this.state);
  }

  private installSelectedSoftware(): void {
    if (!this.gs.player.hackedRobot)
      return;

    const pckg = this.gs.player.softwareArchive[this.row];
    this.row = 0;
    this.popup.selection = 0;

    const capacity = this.gs.player.hackedRobot.memorySize;
    const memUsed = this.gs.player.hackedRobot.software.reduce((sum, sw) => sum + sw.size, 0);
    if (pckg.size > capacity - memUsed) {
      this.state = INSUFFICIENT_STORAGE;  
      return;
    }

    for (const sw of this.gs.player.hackedRobot.software) {
      if (sw.name === pckg.name) {
        this.state = DUPLICATE_PACKAGE;
        return;
      }
    }

    this.gs.player.hackedRobot.software.push(pckg);
  }

  private eraseSelectedSoftware(): void {
    const deleted = this.gs.player.hackedRobot?.software[this.row];    
    this.gs.player.hackedRobot?.software.splice(this.row, 1);
    this.row = 0;
    this.popup.selection = 0;
    this.state = MAIN_MENU;

    let found = false;
    for (const sw of this.gs.player.softwareArchive) {
      if (sw.name === deleted?.name) {
        found = true;
        break;
      }
    }

    if (!found && deleted)
      this.gs.player.softwareArchive.push(deleted);
  }
}

class SWManagementPopup extends Popup {
  selection: number = 0;
  options = new Set<string>();
  private player: Player;
  
  constructor(player: Player) {
    const title = player.hackedRobot ? `*software system control [#add4fa ${player.hackedRobot.name}]*` : "";
    super(title, "", 1, 1, 90);
    this.player = player;
    this.setText(MAIN_MENU);
  }

  setText(state: number): void {
    if (state === MAIN_MENU)
      this.writeMainMenu();
    else if (state === DELETE_MENU)
      this.deleteMenu();
    else if (state === INSTALL_MENU)
      this.installMenu();
    else if (state === INSUFFICIENT_STORAGE) 
      this.text = "_____[#d93e48 insufficient storage for selected software package]";
    else if (state === DUPLICATE_PACKAGE) 
      this.text = "_____[#d93e48 software package already installed on remote device]";
  }

  private installMenu(): void {
    const archived = this.player.softwareArchive.map(sw => sw.name);
    const installed = this.player.hackedRobot!.software.map(sw => sw.name);
    const memUsed = this.player.hackedRobot!.software.reduce((sum, sw) => sum + sw.size, 0);
    const memSize = this.player.hackedRobot?.memorySize ?? 0;
    for (let j = memUsed; j < memSize; j++) {
      installed.push("[#767c98 ...]");
    }
    const count = Math.max(installed.length, archived.length);

    const archivedWidth = Math.max(10, ...archived.map(a => a.length));

    let s = "select p[#ac29ce ac]kage to i[[#ac29ce n]stall, then hit ente[#4e6ea8 r]\n\n";

    for (let j = 0; j < count; j++) {
      const bg = j === this.selection ? '#add4fa' : '#000';
      const fg = j === this.selection ? '#000' : '#009d4a';
      if (j < archived.length) {
        s += `[${fg},${bg} ${archived[j]}]`;
        for (let k = 0; k < archivedWidth - archived[j].length; k++)
          s += '[' + bg + ' _]';        
      } else {
        s += '[#000 _]'.repeat(archivedWidth);
      }

      s += j === this.selection ? '[#000 _]>[#000 _]' : '[#000 _][#000 _][#000 _]';

      if (j < installed.length) {
        s+= installed[j];
      }

      s+= '\n';
    }

    this.text = s;
  }

  private deleteMenu(): void {
    const sw = this.player.hackedRobot?.software[this.selection];
    let s = `Delete [#add4fa ${sw?.name}]?\n[#4a6b8a (software will remain available from aux databank)]`;
    s += "\n\n__[#fff (][#ac29ce y][#fff )]es [#fff (][#ac29ce n][#fff )]o";

    this.text = s;
  }

  private installedSoftwareLines(): string[] {
    const lines: string[] = [];
    
    if (!this.player.hackedRobot)
      return lines;

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
        [SoftwareCategory.Behaviour]: "#ac29ce",
        [SoftwareCategory.Data]: "#f9d071"
      }[sw.cat] ?? "#add4fa";
      

      line += `[#000,${bg} ${bl}]`;
      line += `[#000,${bg} ${sw.name}]`;
      line += `[#000,${bg} ${'_'.repeat(width - sw.name.length - 2)}${br}]\n`;
      lines.push(line);

      for (let j = 1; j < sw.size; j++) {
        line = `[${bg},${bg} ${'_'.repeat(width)}]\n`;
        lines.push(line);
      }

      slotsUsed += sw.size;
      ++swNum;
    }

    while (slotsUsed < capacity) {
      lines.push(`[#767c98,#767c98 ${'_'.repeat(width)}]\n`);
      ++slotsUsed;
    }

    return lines;
  }

  private writeMainMenu(): void {
    if (!this.player.hackedRobot)
      return;

    this.options = new Set<string>(['i']);

    const lines: string[] = this.installedSoftwareLines();

    lines[0] = lines[0].slice(0, -1) + "__[#fff (][#ac29ce i][#fff )]nstall software\n";
    if (this.player.hackedRobot.software.length > 0 && !this.player.hackedRobot.software[this.selection].firmware) {
      lines[1] = lines[1].slice(0, -1) + "__[#fff (][#ac29ce e][#fff )]rase selected\n";
      this.options.add('e');
    }
    this.text = lines.join("");
  }
}