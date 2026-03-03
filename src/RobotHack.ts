import { Game } from "./Game";
import { GameState } from "./GameState";
import { Robot } from "./Actor";
import { InputController } from "./InputController";
import { Popup } from "./Popup";
import { Renderer } from "./Renderer";
import { randomTextExcerptSync } from "./Utils";

const PANEL_WIDTH = 36;
const SEP_WIDTH = 3;
const FIREWALL_BARS = 20;

const ROBOT_WPM_SCALE = [0.80, 1.00, 1.10, 1.25]; // indexed by ICELevel value

export class RobotHackPopup extends Popup {
  playerPos: number = 0;
  robotFloatPos: number = 0;
  robotCurrFirewall: number;
  readonly robotMaxFirewall: number;
  playerErrorPos: number = -1;
  playerErrorUntil: number = 0;
  startIdx: number = 0;
  endIdx: number = 0;

  constructor(robotName: string, robotCurrFirewall: number, robotMaxFirewall: number, row: number, col: number) {
    super(`[#009d4a accessing ][#fff ${robotName}][#009d4a ...]`, "", row, col, PANEL_WIDTH * 2 + SEP_WIDTH);
    this.robotCurrFirewall = robotCurrFirewall;
    this.robotMaxFirewall = robotMaxFirewall;
  }

  get robotPos(): number {
    return Math.min(Math.floor(this.robotFloatPos), this.endIdx);
  }

  showPlayerError(pos: number): void {
    this.playerErrorPos = pos;
    this.playerErrorUntil = Date.now() + 250;
  }

  resetForNewRound(text: string): void {
    this.text = text;
    this.startIdx = text.startsWith('...') ? 3 : 0;
    this.endIdx = text.endsWith('...') ? text.length - 3 : text.length;
    this.playerPos = this.startIdx;
    this.robotFloatPos = this.startIdx;
    this.playerErrorPos = -1;
  }

  protected drawContent(renderer: Renderer, row: number): number {
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

    // Text panels
    const now = Date.now();
    let panelCol = 0;
    let i = this.startIdx;

    const closeTextRow = () => {
      while (panelCol < PANEL_WIDTH) {
        renderer.drawChar(row, contentLeft + panelCol, ' ', '#000', '#000');
        renderer.drawChar(row, robotLeft   + panelCol, ' ', '#000', '#000');
        panelCol++;
      }
      for (let s = 0; s < SEP_WIDTH; s++)
        renderer.drawChar(row, contentLeft + PANEL_WIDTH + s, ' ', '#000', '#000');
      this.closeContentRow(renderer, row++, robotLeft + PANEL_WIDTH);
      panelCol = 0;
    };

    this.openContentRow(renderer, row);

    // Leading ...
    if (this.startIdx === 3) {
      for (let j = 0; j < 3; j++) {
        renderer.drawChar(row, contentLeft + panelCol, '.', '#4e6ea8', '#000');
        renderer.drawChar(row, robotLeft   + panelCol, '.', '#4e6ea8', '#000');
        panelCol++;
      }
    }

    while (i < this.endIdx) {
      let wordEnd = i;
      while (wordEnd < this.endIdx && this.text[wordEnd] !== ' ') wordEnd++;
      const wordLen = wordEnd - i;

      if (panelCol > 0 && panelCol + wordLen > PANEL_WIDTH) {
        closeTextRow();
        this.openContentRow(renderer, row);
      }

      for (let j = i; j < wordEnd; j++) {
        const c = this.text[j];
        const rPos = this.robotPos;

        const pIsErr = j === this.playerErrorPos && now < this.playerErrorUntil;
        const pIsCur = j === this.playerPos;
        const pFg = (pIsErr || pIsCur) ? '#000' : j < this.playerPos ? '#0aff52' : '#009d4a';
        const pBg = pIsErr ? '#ff004e' : pIsCur ? '#0aff52' : '#000';
        renderer.drawChar(row, contentLeft + panelCol, c, pFg, pBg);

        const rIsCur = j === rPos;
        const rFg = rIsCur ? '#000' : j < rPos ? '#ff6040' : '#8b3020';
        const rBg = rIsCur ? '#ff6040' : '#000';
        renderer.drawChar(row, robotLeft + panelCol, c, rFg, rBg);

        panelCol++;
      }
      i = wordEnd;

      if (i < this.endIdx && this.text[i] === ' ') {
        const rPos = this.robotPos;
        const pIsErr = i === this.playerErrorPos && now < this.playerErrorUntil;
        const pBg = pIsErr ? '#ff004e' : i === this.playerPos ? '#0aff52' : '#000';
        const rBg = i === rPos ? '#ff6040' : '#000';
        renderer.drawChar(row, contentLeft + panelCol, ' ', '#009d4a', pBg);
        renderer.drawChar(row, robotLeft   + panelCol, ' ', '#8b3020', rBg);
        panelCol++;
        i++;
      }
    }

    // Trailing ...
    if (this.endIdx < this.text.length) {
      if (panelCol + 3 > PANEL_WIDTH) {
        closeTextRow();
        this.openContentRow(renderer, row);
      }
      for (let j = 0; j < 3; j++) {
        renderer.drawChar(row, contentLeft + panelCol, '.', '#4e6ea8', '#000');
        renderer.drawChar(row, robotLeft   + panelCol, '.', '#4e6ea8', '#000');
        panelCol++;
      }
    }

    closeTextRow();
    return row;
  }
}

export class RobotHackController extends InputController {
  private game: Game;
  private gs: GameState;
  private robot: Robot;
  private excerpt: string = "";
  private popup: RobotHackPopup;
  private progressPerMs: number;
  private onComplete: (success: boolean) => void;
  private done: boolean = false;

  constructor(game: Game, gs: GameState, robot: Robot, popup: RobotHackPopup, onComplete: (success: boolean) => void) {
    super();
    this.game = game;
    this.gs = gs;
    this.robot = robot;
    this.setExcerpt();
    this.popup = popup;
    this.popup.resetForNewRound(this.excerpt);
    this.onComplete = onComplete;

    const scale = ROBOT_WPM_SCALE[robot.ice] ?? 1.0;
    const robotWpm = game.wpm * scale;
    // Characters per ms, reduced by accuracy (mistakes cost extra time)
    this.progressPerMs = (robotWpm * 5 / 60_000) * robot.accuracy;
  }

  handleInput(e: KeyboardEvent): void {
    if (this.done) 
      return;

    const pos = this.popup.playerPos;
    if (e.key === this.excerpt[pos]) {
      this.popup.playerPos++;
      if (this.popup.playerPos >= this.popup.endIdx)
        this.resolveRound(true);
    } else if (e.key !== 'Shift') {
      this.popup.showPlayerError(pos);
    }
  }

  update(deltaMs: number): void {
    if (this.done) 
      return;

    this.popup.robotFloatPos += this.progressPerMs * deltaMs;
    if (this.popup.robotPos >= this.popup.endIdx)
      this.resolveRound(false);
  }

  private resolveRound(playerWon: boolean): void {
    this.done = true;

    if (playerWon) {
      this.robot.currFirewall = Math.max(0, this.robot.currFirewall - 5);
      this.popup.robotCurrFirewall = this.robot.currFirewall;
    } else {
      this.gs.player.currFirewall = Math.max(0, this.gs.player.currFirewall - 5);
    }

    if (this.gs.player.currFirewall <= 0) {
      this.endHack();
      this.onComplete(false);
      
    } else if (this.robot.currFirewall <= 0) {
      this.endHack();
      this.onComplete(true);
    } else {
      // New round
      this.setExcerpt();
      this.popup.resetForNewRound(this.excerpt);
      this.done = false;
    }
  }

  private setExcerpt(): void {
    this.excerpt = randomTextExcerptSync(Math.round(this.game.wpm / 4));
  }

  private endHack(): void {
    this.game.popPopup();
    this.game.popInputController();
  }
}
