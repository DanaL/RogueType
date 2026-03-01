import { LineScanner } from "./LineScanner";
import { Renderer } from "./Renderer";

export class Popup {
  protected title: string;
  protected text: string;
  protected maxWidth: number;
  protected row: number;
  protected col: number;

  constructor(title: string, text: string, row: number, col: number, maxWidth: number = -1){
    this.title = title;
    this.text = text;
    this.maxWidth = maxWidth;
    this.row = row;
    this.col = col;
  }

  draw(renderer: Renderer): void {
    let row = this.row;
    let col = this.col;

    renderer.drawChar(row, col++, '┌', "#fff", "#000");
    for (; col < this.col + this.maxWidth + 3; col++) {
      renderer.drawChar(row, col, '─', "#fff", "#000");
    }
    renderer.drawChar(row, col++, '┐', "#fff", "#000");
    ++row;

    row = this.drawContent(renderer, row);

    this.drawBlankRow(renderer, row++);

    col = this.col;
    renderer.drawChar(row, col++, '└', "#fff", "#000");
    for (; col < this.col + this.maxWidth + 3; col++) {
      renderer.drawChar(row, col, '─', "#fff", "#000");
    }
    renderer.drawChar(row, col++, '┘', "#fff", "#000");
  }

  protected drawContent(renderer: Renderer, row: number): number {
    const titleTokens = new LineScanner(this.title).scan();
    const textTokens = new LineScanner(this.text).scan();
    let col: number;

    if (this.title !== "") {
      col = this.col;
      renderer.drawChar(row, col++, '│', "#FFF", "#000");
      renderer.drawChar(row, col++, ' ', "#FFF", "#000");

      for (const token of titleTokens) {
        for (const ch of token.text) {
          renderer.drawChar(row, col++, ch, token.colour, "#000");
        }
      }

      while (col <= this.col + this.maxWidth + 2) {
        renderer.drawChar(row, col++, ' ', "#FFF", "#000");
      }
      renderer.drawChar(row, col++, '│', "#FFF", "#000");
      row++;
      this.drawBlankRow(renderer, row++);
    }

    col = this.openContentRow(renderer, row);
    for (const token of textTokens) {
      if (token.text === '\n') {
        this.closeContentRow(renderer, row++, col);
        col = this.openContentRow(renderer, row);
        continue;
      }

      if (col + token.text.length > this.col + this.maxWidth + 2) {
        this.closeContentRow(renderer, row++, col);
        col = this.openContentRow(renderer, row);
      }

      for (const ch of token.text) {
        renderer.drawChar(row, col++, ch, token.colour, "#000");
      }
    }
    this.closeContentRow(renderer, row++, col);

    return row;
  }

  protected openContentRow(renderer: Renderer, row: number): number {
    let col = this.col;
    renderer.drawChar(row, col++, '│', "#FFF", "#000");
    renderer.drawChar(row, col++, ' ', "#FFF", "#000");
    return col;
  }

  protected closeContentRow(renderer: Renderer, row: number, col: number): void {
    while (col <= this.col + this.maxWidth + 2) {
      renderer.drawChar(row, col++, ' ', "#FFF", "#000");
    }
    renderer.drawChar(row, col, '│', "#FFF", "#000");
  }

  protected drawBlankRow(renderer: Renderer, row: number): void {
    let col = this.col;
    renderer.drawChar(row, col++, '│', "#FFF", "#000");
    while (col <= this.col + this.maxWidth + 2) {
      renderer.drawChar(row, col++, ' ', "#FFF", "#000");
    }
    renderer.drawChar(row, col, '│', "#FFF", "#000");
  }
}
