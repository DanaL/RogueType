import { GameState } from "./GameState";
import * as Device from "./Device";
import { InputController } from "./InputController";
import { Popup } from "./Popup";
import { Renderer } from "./Renderer";

const MAIN_MENU = 0;
const LIFT_ACCESS = 1;
const FILE_SYSTEM = 2;

type TerminalFunction = { desc: string; flag: number };

export class TerminalController extends InputController {
  private state: number = MAIN_MENU;
  private gs: GameState;
  private term: Device.Terminal;
  private options: TerminalFunction[] = [];
  private currRow: number = 0;
  private popup: TerminalPopup;

  constructor(gs: GameState, term: Device.Terminal) {
    super();
    this.gs = gs;
    this.term = term;

    if ((term.functions & Device.LIFT_ACCESS) !== 0)
      this.options.push({ desc: "lift access", flag: LIFT_ACCESS });

    this.options.push({ desc: "local file system", flag: FILE_SYSTEM });

    this.popup = new TerminalPopup(gs, this.options.map(o => o.desc), 3, 20);
    this.gs.game.pushPopup(this.popup);
  }

  handleInput(e: KeyboardEvent): void {
    if (e.key === 's' || e.key === 'ArrowDown' || e.key === 'j') {
      this.currRow = Math.min(this.currRow + 1, this.options.length - 1);
      this.popup.currRow = this.currRow;
    } else if (e.key === 'w' || e.key === 'ArrowUp' || e.key === 'k') {
      this.currRow = Math.max(this.currRow - 1, 0);
      this.popup.currRow = this.currRow;
    } else if (e.key === 'Enter' && this.state === MAIN_MENU) {
      this.state = this.options[this.currRow].flag;
      this.popup.state = this.state;
    } else if (e.key === 'Enter' && this.state === LIFT_ACCESS) {
      this.gs.downLifts[this.gs.currLevel] = !this.gs.downLifts[this.gs.currLevel];
    } else if (e.key === 'Escape' && this.state === LIFT_ACCESS) {
      this.state = MAIN_MENU;
      this.popup.state = this.state;
    } else if (e.key === 'Escape') {
      this.gs.game.popPopup();
      this.gs.game.popInputController();
    }
  }
}

export class TerminalPopup extends Popup {
  public currRow: number = 0;
  public state: number = 0;
  private items: string[];
  private gs: GameState;

  constructor(gs: GameState, items: string[], row: number, col: number) {
    super("ultraD[#ac29ce O]S 3.7.2 [#fff ad][#ac29ce m][#fff in termina][#4e6ea8 l]", "", row, col, 40);
    this.items = items;
    this.gs = gs;
  }

  protected drawContent(renderer: Renderer, row: number): number {
    row = this.drawTitle(renderer, row);

    if (this.state === MAIN_MENU) {
      row = this.mainMenu(renderer, row);
    } else if (this.state === LIFT_ACCESS) {
      row = this.liftAccess(renderer, row);
    }

    return row;
  }

  private liftAccess(renderer: Renderer, row: number): number {
    this.drawBlankRow(renderer, row);
    let col = this.openContentRow(renderer, row);

    renderer.drawChar(row, col++, '>', '#009d4a', '#000');
    renderer.drawChar(row, col++, ' ', '#009d4a', '#000');

    const active = this.gs.downLifts[this.gs.currLevel];
    const msg = active ? "deactivate lift" : "activate lift";
    for (const ch of msg)
          renderer.drawChar(row, col++, ch, '#000', '#fff');

    this.closeContentRow(renderer, row++, col);

    return row;
  }

  private mainMenu(renderer: Renderer, row: number): number {
    for (let i = 0; i < this.items.length; i++) {
      const isSelected = i === this.currRow;
      let col = this.openContentRow(renderer, row);

      if (isSelected) {
        renderer.drawChar(row, col++, '>', '#009d4a', '#000');
        renderer.drawChar(row, col++, ' ', '#009d4a', '#000');
        for (const ch of this.items[i])
          renderer.drawChar(row, col++, ch, '#000', '#fff');
      } else {
        renderer.drawChar(row, col++, '>', '#009d4a', '#000');
        renderer.drawChar(row, col++, ' ', '#009d4a', '#000');
        for (const ch of this.items[i])
          renderer.drawChar(row, col++, ch, '#009d4a', '#000');
      }

      this.closeContentRow(renderer, row++, col);
    }

    return row;
  }
}
