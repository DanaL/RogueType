import { Game } from "./Game";
import { GameState } from "./GameState";
import { Robot } from "./Actor";
import { InputController } from "./InputController";
import { Popup } from "./Popup";
import { Renderer } from "./Renderer";
import { randomTextExcerptSync, rndRange } from "./Utils";
import { SoftwareCategory } from "./Software";

const PANEL_WIDTH = 36;
const SEP_WIDTH = 3;
const FIREWALL_BARS = 20;

const ROBOT_WPM_SCALE = [0.80, 1.00, 1.10, 1.25]; // indexed by ICELevel value

function truncateExcerpt(excerpt: string, wordCount: number): string {
  const hasLeading = excerpt.startsWith('...');
  const start = hasLeading ? 3 : 0;
  const hasTrailing = excerpt.endsWith('...');
  const end = hasTrailing ? excerpt.length - 3 : excerpt.length;
  const words = excerpt.slice(start, end).trim().split(' ');
  if (words.length <= wordCount) return excerpt;
  return (hasLeading ? '...' : '') + words.slice(0, wordCount).join(' ') + '...';
}

type PanelCell = { char: string; idx: number }; // idx === -1 means decorative dot

export class RobotHackPopup extends Popup {
  playerPos: number = 0;
  robotFloatPos: number = 0;
  robotCurrFirewall: number;
  readonly robotMaxFirewall: number;
  playerErrorPos: number = -1;
  playerErrorUntil: number = 0;

  playerText: string = "";
  robotText: string = "";
  playerStartIdx: number = 0;
  playerEndIdx: number = 0;
  robotStartIdx: number = 0;
  robotEndIdx: number = 0;
  taunt: string = "";

  constructor(robotName: string, robotCurrFirewall: number, robotMaxFirewall: number, row: number, col: number) {
    super(`[#009d4a accessing ][#fff ${robotName}][#009d4a ...]`, "", row, col, PANEL_WIDTH * 2 + SEP_WIDTH);
    this.robotCurrFirewall = robotCurrFirewall;
    this.robotMaxFirewall = robotMaxFirewall;
  }

  get robotPos(): number {
    return Math.min(Math.floor(this.robotFloatPos), this.robotEndIdx);
  }

  showPlayerError(pos: number): void {
    this.playerErrorPos = pos;
    this.playerErrorUntil = Date.now() + 250;
  }

  resetForNewRound(playerText: string, robotText: string): void {
    this.playerText = playerText;
    this.robotText = robotText;
    this.playerStartIdx = playerText.startsWith('...') ? 3 : 0;
    this.playerEndIdx = playerText.endsWith('...') ? playerText.length - 3 : playerText.length;
    this.robotStartIdx = robotText.startsWith('...') ? 3 : 0;
    this.robotEndIdx = robotText.endsWith('...') ? robotText.length - 3 : robotText.length;
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
    const playerRows = this.layoutText(this.playerText, this.playerStartIdx, this.playerEndIdx);
    const robotRows = this.layoutText(this.robotText, this.robotStartIdx, this.robotEndIdx);
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

    if (this.taunt !== "") {
      this.drawBlankRow(renderer, row++);
      this.drawBlankRow(renderer, row++);
      const padding = ' '.repeat(this.maxWidth / 2 - this.taunt.length / 2 - 2);
      const s = padding + this.taunt;
      let col = this.openContentRow(renderer, row);
      for (const ch of s) {
        renderer.drawChar(row, col++, ch, "#ff004e", '#000');
      }
      this.closeContentRow(renderer, row++, col);
    }

    return row;
  }
}

export class RobotHackController extends InputController {
  private game: Game;
  private gs: GameState;
  private robot: Robot;
  private playerExcerpt: string = "";
  private wordCount: number;
  private popup: RobotHackPopup;
  private progressPerMs: number;
  private onComplete: (success: boolean) => void;
  private done: boolean = false;
  taunt: string = "";

  constructor(game: Game, gs: GameState, robot: Robot, popup: RobotHackPopup, wordCount: number, taunt: string, onComplete: (success: boolean) => void) {
    super();
    this.game = game;
    this.gs = gs;
    this.robot = robot;
    this.wordCount = wordCount;
    this.popup = popup;
    popup.taunt = taunt;
    this.setExcerpts(robot.previouslyHacked);
    this.onComplete = onComplete;

    const scale = ROBOT_WPM_SCALE[robot.ice] ?? 1.0;
    const robotWpm = game.wpm * scale;

    const iceBreaker = gs.player.hackedRobot!.software
      .filter(sw => sw.cat === SoftwareCategory.ICEBreaker)
      .reduce((sum, sw) => sum + sw.level, 0);
    const acc = robot.accuracy - (iceBreaker * 0.05);
    this.progressPerMs = (robotWpm * 5 / 60_000) * acc;
  }

  handleInput(e: KeyboardEvent): void {
    if (this.done)
      return;

    const pos = this.popup.playerPos;
    if (e.key === this.playerExcerpt[pos]) {
      this.popup.playerPos++;
      if (this.popup.playerPos >= this.popup.playerEndIdx)
        this.resolveRound(true);
    } else if (e.key !== 'Shift') {
      this.popup.showPlayerError(pos);
    }
  }

  update(deltaMs: number): void {
    if (this.done)
      return;

    this.popup.robotFloatPos += this.progressPerMs * deltaMs;
    if (this.popup.robotPos >= this.popup.robotEndIdx)
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

    if (this.robot.currFirewall <= 0) {
      this.endHack();
      this.onComplete(true);
    } if (this.gs.player.currFirewall <= 0) {
      this.endHack();
      this.onComplete(false);
    } else {
      // New round
      this.setExcerpts(this.robot.previouslyHacked);
      this.done = false;
    }
  }

  private setExcerpts(previouslyHacked: boolean): void {
    const playerScale = previouslyHacked ? 0.5 : 1.0;
    const robotScale = 1.0;
    const pLen = Math.max(1, Math.round(this.wordCount * playerScale));
    const rLen = Math.max(1, Math.round(this.wordCount * robotScale));
    const fullExcerpt = randomTextExcerptSync(Math.max(pLen, rLen));
    this.playerExcerpt = pLen < rLen ? truncateExcerpt(fullExcerpt, pLen) : fullExcerpt;
    const robotExcerpt = rLen < pLen ? truncateExcerpt(fullExcerpt, rLen) : fullExcerpt;
    this.popup.resetForNewRound(this.playerExcerpt, robotExcerpt);
  }

  private endHack(): void {
    this.game.popPopup();
    this.game.popInputController();
  }
}
