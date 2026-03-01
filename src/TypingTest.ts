import { Game } from "./Game";
import { InputController } from "./InputController";
import { Popup } from "./Popup";
import { Renderer } from "./Renderer";

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
      this.popup .pos = this.pos;
    }
  }

  update(deltaMs: number): void {
    // check if we are past the deadline
  }
}

export class TypingTestPopup extends Popup {
  pos: number;

  constructor(text: string, row: number, col: number, maxWidth: number) {
    super("", text, row, col, maxWidth);
    this.pos = text.startsWith('...') ? 3 : 0;
  }

  protected drawContent(renderer: Renderer, row: number): number {
    const startEllipses = this.text.startsWith('...') ? 3 : 0;
    const endEllipses = this.text.endsWith('...') ? this.text.length - 3 : this.text.length;

    let col = this.openContentRow(renderer, row);
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
        let fg = '#009d4a';
        if (i + j == this.pos)
          fg = '#000';
        else if (i + j < this.pos)
          fg = '#0aff52';

        const bg = i + j == this.pos ? '#0aff52' : '#000';

        renderer.drawChar(row, col++, word[j], fg, bg);
      }
      i = wordEnd;

      if (this.text[i] == ' ') {
        const bg = i == this.pos ? '#0aff52' : '#000';
        renderer.drawChar(row, col++, ' ', '#009d4a', bg);
        ++i;
      }
    }

    this.closeContentRow(renderer, row++, col);
    return row;
  }
}