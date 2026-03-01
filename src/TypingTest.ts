import { Game } from "./Game";
import { InputController } from "./InputController";
import { Popup } from "./Popup";
import { Renderer } from "./Renderer";
import { LineScanner } from "./LineScanner";

export class TypingTestController extends InputController {
  private deadline: number;
  private pos: number;
  private text: string;
  private popup: TypingTestPopup;

  constructor(game: Game, timeLimitMS: number, text: string, popup: TypingTestPopup) {
    super();
    this.deadline = Date.now() + timeLimitMS;
    this.pos = text.startsWith("...") ? 3 : 0;
    this.text = text;
    this.popup = popup;
    this.popup.pos = this.pos;
  }

  handleInput(e: KeyboardEvent): void {
    if (e.key == this.text[this.pos]) {
      ++this.pos;
      this.popup.pos = this.pos;
    } else {
      this.popup.showError(this.pos);
    }
  }

  update(deltaMs: number): void {
    // check if we are past the deadline
  }
}

export class TypingTestPopup extends Popup {
  pos: number;
  private errorPos: number = -1;
  private errorUntil: number = 0;

  constructor(text: string, row: number, col: number, maxWidth: number) {
    super("[#009d4a >] [#ac29ce hack the system:]", text, row, col, maxWidth);
    this.pos = text.startsWith('...') ? 3 : 0;
  }

  showError(pos: number): void {
    this.errorPos = pos;
    this.errorUntil = Date.now() + 250;
  }

  protected drawContent(renderer: Renderer, row: number): number {
    let col = this.col;
    if (this.title != "") {
      const titleTokens = new LineScanner(this.title).scan();
      col = this.col;
      renderer.drawChar(row, col++, '│', "#009d4a", "#000");
      renderer.drawChar(row, col++, ' ', "#009d4a", "#000");

      for (const token of titleTokens) {
        for (const ch of token.text) {
          renderer.drawChar(row, col++, ch, token.colour, "#000");
        }
      }

      while (col <= this.col + this.maxWidth + 2) {
        renderer.drawChar(row, col++, ' ', "#009d4a", "#000");
      }
      renderer.drawChar(row, col++, '│', "#009d4a", "#000");
      row++;
      this.drawBlankRow(renderer, row++);
    }

    col = this.openContentRow(renderer, row);
    let i = 0;

    if (this.text.startsWith('...')) {
      for (let j = 0; j < 3; j++)
        renderer.drawChar(row, col++, '.', '#4e6ea8', '#000');
      i = 3;
    }

    while (i < this.text.length) {
      // Find end of next word
      let wordEnd = i;
      while (wordEnd < this.text.length && this.text[wordEnd] !== ' ' && this.text[wordEnd] !== '\n') {
        wordEnd++;
      }
      const word = this.text.slice(i, wordEnd);

      // Word-wrap if needed
      if (word.length > 0 && col + word.length > this.col + this.maxWidth + 2) {
        this.closeContentRow(renderer, row++, col);
        col = this.openContentRow(renderer, row);
      }

      // Draw word character by character
      for (let j = 0; j < word.length; j++) {
        const idx = i + j;
        const isError = idx === this.errorPos && Date.now() < this.errorUntil;
        const isCursor = idx === this.pos;

        const fg = isError || isCursor ? '#000' : idx < this.pos ? '#0aff52' : '#009d4a';
        const bg = isError ? '#ff004e' : isCursor ? '#0aff52' : '#000';

        renderer.drawChar(row, col++, word[j], fg, bg);
      }
      i = wordEnd;

      if (this.text[i] == ' ') {
        const isError = i === this.errorPos && Date.now() < this.errorUntil;
        const bg = isError ? '#ff004e' : i === this.pos ? '#0aff52' : '#000';
        renderer.drawChar(row, col++, ' ', '#009d4a', bg);
        ++i;
      }
    }

    this.closeContentRow(renderer, row++, col);

    return row;
  }
}