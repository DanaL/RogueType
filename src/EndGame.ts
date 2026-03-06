import { Game } from "./Game";
import { GameState } from "./GameState";
import { InputController } from "./InputController";
import { Popup } from "./Popup";
import { Renderer } from "./Renderer";
import { randomTextExcerptSync } from "./Utils";
import { SoftwareCategory } from "./Software";

const PANEL_WIDTH = 36;
const SEP_WIDTH = 3;
const FIREWALL_BARS = 20;

const LAUNCH_SCREEN: number = 0;
const HACKING: number = 1;
const LOGIN_SCREEN: number = 2;

type PanelCell = { char: string; idx: number }; // idx === -1 means decorative dot

export class EndGamePopup extends Popup {
  playerPos: number = 0;
  robotFloatPos: number = 0;
  robotCurrFirewall: number;
  readonly robotMaxFirewall: number;
  playerErrorPos: number = -1;
  playerErrorUntil: number = 0;

  excerpt: string = "";
  playerStartIdx: number = 0;
  playerEndIdx: number = 0;
  robotStartIdx: number = 0;
  robotEndIdx: number = 0;

  state: number = LAUNCH_SCREEN;

  enteredPassword: string = "";
  attemptsRemaining: number = 3;

  constructor(row: number, col: number) {
    super('[#009d4a accessing ][#fff Facility mainframe FMS][#009d4a ...]', "", row, col, PANEL_WIDTH * 2 + SEP_WIDTH);
    this.robotCurrFirewall = 15;
    this.robotMaxFirewall = 15;
  }

  get robotPos(): number {
    return Math.min(Math.floor(this.robotFloatPos), this.robotEndIdx);
  }

  showPlayerError(pos: number): void {
    this.playerErrorPos = pos;
    this.playerErrorUntil = Date.now() + 250;
  }

  resetForNewRound(excerpt: string): void {
    this.excerpt = excerpt;
    this.playerStartIdx = excerpt.startsWith('...') ? 3 : 0;
    this.playerEndIdx = excerpt.endsWith('...') ? excerpt.length - 3 : excerpt.length;
    this.robotStartIdx = excerpt.startsWith('...') ? 3 : 0;
    this.robotEndIdx = excerpt.endsWith('...') ? excerpt.length - 3 : excerpt.length;
    this.playerPos = this.playerStartIdx;
    this.robotFloatPos = this.robotStartIdx;
    this.playerErrorPos = -1;
  }

  private layoutText(text: string, startIdx: number, endIdx: number): PanelCell[][] {
    const rows: PanelCell[][] = [];
    let row: PanelCell[] = [];

    const pushRow = () => { rows.push(row); row = []; };

    if (startIdx === 3)
      for (let j = 0; j < 3; j++) row.push({ char: '.', idx: -1 });

    let i = startIdx;
    while (i < endIdx) {
      let wordEnd = i;
      while (wordEnd < endIdx && text[wordEnd] !== ' ') wordEnd++;
      const wordLen = wordEnd - i;

      if (row.length > 0 && row.length + wordLen > PANEL_WIDTH) pushRow();

      for (let j = i; j < wordEnd; j++) row.push({ char: text[j], idx: j });
      i = wordEnd;

      if (i < endIdx && text[i] === ' ') {
        row.push({ char: ' ', idx: i });
        i++;
      }
    }

    if (endIdx < text.length) {
      if (row.length + 3 > PANEL_WIDTH) pushRow();
      for (let j = 0; j < 3; j++) row.push({ char: '.', idx: -1 });
    }

    if (row.length > 0) pushRow();
    return rows;
  }

  protected drawContent(renderer: Renderer, row: number): number {
    if (this.state === LAUNCH_SCREEN) {
      const blurb = "[#ff004e WARNING]: you are able to access Facility mainframe. You will need to hack through its firewalls before entering the admin password. If you fail you will likely be flatlined.\n\nTap ([#fff Y]) to engage Mainframe or [#fff ESC] if you are not ready.";
      this.text = blurb;
      row = super.drawContent(renderer, row);
    } else if (this.state === HACKING) {
      row = this.drawHackContent(renderer, row);
    } else if (this.state === LOGIN_SCREEN) {
      row = this.drawLoginScreen(renderer, row);
    }

    return row;
  }

  protected drawLoginScreen(renderer: Renderer, row: number): number {
    this.text = `\n__mainframe login> ${this.enteredPassword}[#009d4a,#009d4a _]\n\n__ `;
    if (this.attemptsRemaining > 1)
      this.text += "attempts remaining: " + this.attemptsRemaining;
    else
      this.text += `[ff004e attempts remaining: ${this.attemptsRemaining}]`;

    return super.drawContent(renderer, row);
  }

  protected drawHackContent(renderer: Renderer, row: number): number {
    const contentLeft = this.col + 2;
    const robotLeft = contentLeft + PANEL_WIDTH + SEP_WIDTH;

    row = this.drawTitle(renderer, row);

    let fwCol = this.openContentRow(renderer, row);
    for (const ch of "remote firewall: ")
      renderer.drawChar(row, fwCol++, ch, '#009d4a', '#000');
    const filled = this.robotMaxFirewall > 0
      ? Math.round(FIREWALL_BARS * this.robotCurrFirewall / this.robotMaxFirewall)
      : 0;
    for (let i = 0; i < FIREWALL_BARS; i++)
      renderer.drawChar(row, fwCol++, '=', i < filled ? '#ff6040' : '#4e6ea8', '#000');
    this.closeContentRow(renderer, row++, fwCol);

    this.drawBlankRow(renderer, row++);

    const now = Date.now();
    const playerRows = this.layoutText(this.excerpt, this.playerStartIdx, this.playerEndIdx);
    const robotRows = this.layoutText(this.excerpt, this.robotStartIdx, this.robotEndIdx);
    const numRows = Math.max(playerRows.length, robotRows.length);

    for (let r = 0; r < numRows; r++) {
      this.openContentRow(renderer, row);

      const pRow = playerRows[r] ?? [];
      const rRow = robotRows[r] ?? [];

      // Player panel
      for (let c = 0; c < PANEL_WIDTH; c++) {
        const cell = pRow[c];
        if (!cell) {
          renderer.drawChar(row, contentLeft + c, ' ', '#000', '#000');
          continue;
        }
        const { char, idx } = cell;
        if (idx === -1) {
          renderer.drawChar(row, contentLeft + c, char, '#4e6ea8', '#000');
          continue;
        }
        const pIsErr = idx === this.playerErrorPos && now < this.playerErrorUntil;
        const pIsCur = idx === this.playerPos;
        const pFg = (pIsErr || pIsCur) ? '#000' : idx < this.playerPos ? '#0aff52' : '#009d4a';
        const pBg = pIsErr ? '#ff004e' : pIsCur ? '#0aff52' : '#000';
        renderer.drawChar(row, contentLeft + c, char, pFg, pBg);
      }

      // Separator
      for (let s = 0; s < SEP_WIDTH; s++)
        renderer.drawChar(row, contentLeft + PANEL_WIDTH + s, ' ', '#000', '#000');

      // Robot panel
      const rPos = this.robotPos;
      for (let c = 0; c < PANEL_WIDTH; c++) {
        const cell = rRow[c];
        if (!cell) {
          renderer.drawChar(row, robotLeft + c, ' ', '#000', '#000');
          continue;
        }
        const { char, idx } = cell;
        if (idx === -1) {
          renderer.drawChar(row, robotLeft + c, char, '#4e6ea8', '#000');
          continue;
        }
        const rIsCur = idx === rPos;
        const rFg = rIsCur ? '#000' : idx < rPos ? '#ff6040' : '#8b3020';
        const rBg = rIsCur ? '#ff6040' : '#000';
        renderer.drawChar(row, robotLeft + c, char, rFg, rBg);
      }

      this.closeContentRow(renderer, row++, robotLeft + PANEL_WIDTH);
    }

    return row;
  }
}

export class EndGameController extends InputController {
  private game: Game;
  private gs: GameState;
  private excerpt: string = "";
  private wordCount: number = 25;
  private popup: EndGamePopup;
  private progressPerMs: number;
  private onComplete: (success: boolean) => void;
  private done: boolean = false;
  private state = LAUNCH_SCREEN;
  private mainframeFirewall = 15;
  private enteredPassword = "";
  private attemptsRemaining = 3;

  constructor(game: Game, gs: GameState, popup: EndGamePopup, onComplete: (success: boolean) => void) {
    super();
    this.game = game;
    this.gs = gs;
    this.popup = popup;
    this.setExcerpt();
    this.onComplete = onComplete;

    const wpm = game.wpm;

    const iceBreaker = gs.player.hackedRobot!.software
      .filter(sw => sw.cat === SoftwareCategory.ICEBreaker)
      .reduce((sum, sw) => sum + sw.level, 0);
    const acc = 1.1 - (iceBreaker * 0.05);
    this.progressPerMs = (wpm * 5 / 60_000) * acc;
  }

  handleInput(e: KeyboardEvent): void {
    if (this.done)
      return;

    if (this.state === LAUNCH_SCREEN && e.key === 'Escape') {
      this.game.popPopup();
      this.game.popInputController();

      return;
    } else if (this.state === LAUNCH_SCREEN && e.key === 'Y') {
      this.state = HACKING;
      this.popup.state = HACKING;
    } else if (this.state === HACKING) {
      const pos = this.popup.playerPos;
      if (e.key === this.excerpt[pos]) {
        this.popup.playerPos++;
        if (this.popup.playerPos >= this.popup.playerEndIdx)
          this.resolveRound(true);
      } else if (e.key !== 'Shift') {
        this.popup.showPlayerError(pos);
      }
    } else if (this.state === LOGIN_SCREEN && e.key === "Backspace") {
      this.enteredPassword = this.enteredPassword.length > 0 ? this.enteredPassword.slice(0, -1) : "";
      this.popup.enteredPassword = this.enteredPassword;
    } else if (this.state === LOGIN_SCREEN && e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key) && this.enteredPassword.length < 6) {
      this.enteredPassword += e.key.toUpperCase();
      this.popup.enteredPassword = this.enteredPassword;
    } else if (this.state === LOGIN_SCREEN && e.key === "Enter") {
      this.checkPassword();
    }
  }

  private checkPassword(): void {
    const correct = this.enteredPassword === this.game.mainFramePassword;
    if (correct) {
      this.endHack();
      this.onComplete(true);
    } else {
      --this.attemptsRemaining;
      this.popup.attemptsRemaining = this.attemptsRemaining;
      this.enteredPassword = "";
      this.popup.enteredPassword = "";
      if (this.attemptsRemaining === 0) {
        this.endHack();
        this.onComplete(false);
      }
    }    
  }

  update(deltaMs: number): void {
    if (this.done)
      return;

    if (this.state === HACKING) {
      this.popup.robotFloatPos += this.progressPerMs * deltaMs;
      if (this.popup.robotPos >= this.popup.robotEndIdx)
        this.resolveRound(false);
    }
  }

  private resolveRound(playerWon: boolean): void {
    this.done = true;

    if (playerWon) {
      this.mainframeFirewall = Math.max(0, this.mainframeFirewall - 5);
      this.popup.robotCurrFirewall = this.mainframeFirewall;
    } else {
      this.gs.player.currFirewall = Math.max(0, this.gs.player.currFirewall - 5);
    }

    if (this.mainframeFirewall <= 0) {
      this.state = LOGIN_SCREEN;
      this.popup.state = LOGIN_SCREEN;
    } if (this.gs.player.currFirewall <= 0) {
      this.endHack();
      this.onComplete(false);
    } else {
      // New round
      this.setExcerpt();
      this.done = false;
    }
  }

  private setExcerpt(): void {
    this.excerpt = randomTextExcerptSync(this.wordCount);
    this.popup.resetForNewRound(this.excerpt);
  }

  private endHack(): void {
    this.game.popPopup();
    this.game.popInputController();
  }
}
