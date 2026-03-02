import { GameState } from "./GameState";
import * as Device from "./Device";
import { InputController } from "./InputController";
import { LineScanner } from "./LineScanner";
import { Popup } from "./Popup";
import { Renderer } from "./Renderer";

const MAIN_MENU   = 0;
const LIFT_ACCESS = 1;
const FILE_SYSTEM = 2;
const FILE_VIEW   = 3;

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

    this.popup = new TerminalPopup(gs, term, this.options.map(o => o.desc), 3, 20);
    this.gs.game.pushPopup(this.popup);
  }

  private get navLimit(): number {
    if (this.state === FILE_SYSTEM) 
      return this.term.files.length - 1;
    if (this.state === MAIN_MENU)   
      return this.options.length - 1;

    return 0;
  }

  private setState(state: number): void {
    this.state = state;
    this.currRow = 0;
    this.popup.state = state;
    this.popup.currRow = 0;
  }

  handleInput(e: KeyboardEvent): void {
    if (e.key === 's' || e.key === 'ArrowDown' || e.key === 'j') {
      this.currRow = Math.min(this.currRow + 1, this.navLimit);
      this.popup.currRow = this.currRow;
    } else if (e.key === 'w' || e.key === 'ArrowUp' || e.key === 'k') {
      this.currRow = Math.max(this.currRow - 1, 0);
      this.popup.currRow = this.currRow;
    } else if (e.key === 'Enter' && this.state === MAIN_MENU) {
      this.setState(this.options[this.currRow].flag);
    } else if (e.key === 'Enter' && this.state === LIFT_ACCESS) {
      this.gs.downLifts[this.gs.currLevel] = !this.gs.downLifts[this.gs.currLevel];
      const s = this.gs.downLifts[this.gs.currLevel] ? "Elevator enabled" : "Elevator disabled";
      this.gs.addMessage(s);
    } else if (e.key === 'Enter' && this.state === FILE_SYSTEM) {
      this.popup.selectedFile = this.currRow;
      this.setState(FILE_VIEW);
    } else if (e.key === 'Escape' && this.state === FILE_VIEW) {
      this.setState(FILE_SYSTEM);
    } else if (e.key === 'Escape' && this.state !== MAIN_MENU) {
      this.setState(MAIN_MENU);
    } else if (e.key === 'Escape') {
      this.gs.game.popPopup();
      this.gs.game.popInputController();
    }
  }
}

export class TerminalPopup extends Popup {
  public currRow: number = 0;
  public state: number = 0;
  public selectedFile: number = 0;
  private items: string[];
  private gs: GameState;
  private term: Device.Terminal;

  constructor(gs: GameState, term: Device.Terminal, items: string[], row: number, col: number) {
    super("ultraD[#ac29ce O]S 3.7.2 [#fff ad][#ac29ce m][#fff in termina][#4e6ea8 l]", "", row, col, 40);
    this.items = items;
    this.gs = gs;
    this.term = term;
  }

  protected drawContent(renderer: Renderer, row: number): number {
    row = this.drawTitle(renderer, row);

    if (this.state === MAIN_MENU)        
      row = this.drawMenu(renderer, row, this.items);
    else if (this.state === LIFT_ACCESS) 
      row = this.liftAccess(renderer, row);
    else if (this.state === FILE_SYSTEM) 
      row = this.fileSystem(renderer, row);
    else if (this.state === FILE_VIEW)   
      row = this.fileView(renderer, row);

    return row;
  }

  private drawMenu(renderer: Renderer, row: number, items: string[]): number {
    if (items.length === 0) {
      let col = this.openContentRow(renderer, row);
      for (const ch of "No files found.")
        renderer.drawChar(row, col++, ch, '#009d4a', '#000');
      this.closeContentRow(renderer, row++, col);

      return row;
    }

    for (let i = 0; i < items.length; i++) {
      const selected = i === this.currRow;
      let col = this.openContentRow(renderer, row);
      renderer.drawChar(row, col++, '>', '#009d4a', '#000');
      renderer.drawChar(row, col++, ' ', '#009d4a', '#000');
      for (const ch of items[i])
        renderer.drawChar(row, col++, ch, selected ? '#000' : '#009d4a', selected ? '#fff' : '#000');
      this.closeContentRow(renderer, row++, col);
    }

    return row;
  }

  private liftAccess(renderer: Renderer, row: number): number {
    const msg = this.gs.downLifts[this.gs.currLevel] ? "deactivate lift" : "activate lift";
    let col = this.openContentRow(renderer, row);
    renderer.drawChar(row, col++, '>', '#009d4a', '#000');
    renderer.drawChar(row, col++, ' ', '#009d4a', '#000');
    for (const ch of msg)
      renderer.drawChar(row, col++, ch, '#000', '#fff');
    this.closeContentRow(renderer, row++, col);

    return row;
  }

  private fileSystem(renderer: Renderer, row: number): number {
    return this.drawMenu(renderer, row, this.term.files.map(f => f.title));
  }

  private fileView(renderer: Renderer, row: number): number {
    const file = this.term.files[this.selectedFile];

    let col = this.openContentRow(renderer, row);
    for (const ch of file.title)
      renderer.drawChar(row, col++, ch, '#fff', '#000');
    this.closeContentRow(renderer, row++, col);
    this.drawBlankRow(renderer, row++);

    const tokens = new LineScanner(file.contents).scan();
    col = this.openContentRow(renderer, row);
    for (const token of tokens) {
      if (token.text === '\n') {
        this.closeContentRow(renderer, row++, col);
        col = this.openContentRow(renderer, row);
        continue;
      }
      if (col + token.text.length > this.col + this.maxWidth + 2) {
        this.closeContentRow(renderer, row++, col);
        col = this.openContentRow(renderer, row);
      }
      for (const ch of token.text)
        renderer.drawChar(row, col++, ch, token.colour, '#000');
    }
    this.closeContentRow(renderer, row++, col);

    return row;
  }
}
