import { InputController } from "./InputController";
import { Game } from "./Game";
import { Popup } from "./Popup";

export type Examinable = { x: number; y: number; name: string; desc: string };

export class ExamineController extends InputController {
  private game: Game;
  private targets: Examinable[];
  private index: number;

  constructor(game: Game, targets: Examinable[]) {
    super();
    this.game = game;
    this.targets = targets;
    this.index = -1;
    game.pushPopup(this.makeInstructionsPopup());
  }

  private makeInstructionsPopup(): Popup {  
    return new Popup(
      "Examine",
      "Information about interesting objects in the game. [#00f7ff Tab] through items. [#00f7ff Esc] to exit.",
      3, 3, 40
    );
  }

  private makePopup(): Popup {
    const target = this.targets[this.index];
    const text = target.desc || "No description available.";
    const MAX_WIDTH = 40;
    const popupH = this.calcPopupHeight(text, MAX_WIDTH);
    const { camX, camY, vpW } = this.game.renderer.cameraFor(this.game.gs);
    const sx = target.x - camX;
    const sy = target.y - camY;
    const MAP_Y = this.game.renderer.MAP_Y;
    const popupRow = sy >= popupH ? sy + MAP_Y - popupH : sy + MAP_Y + 1;
    const popupCol = Math.max(0, Math.min(sx - Math.floor((MAX_WIDTH + 4) / 2), vpW - (MAX_WIDTH + 4)));

    return new Popup(`[#fff ${target.name}]`, text, popupRow, popupCol, MAX_WIDTH);
  }

  private calcPopupHeight(text: string, maxWidth: number): number {
    let lines = 1;
    let lineLen = 0;
    for (const segment of text.split('\n')) {
      if (lineLen > 0) { lines++; lineLen = 0; }
      for (const word of segment.split(' ')) {
        if (word === '') continue;
        const needed = lineLen > 0 ? word.length + 1 : word.length;
        if (lineLen > 0 && needed + lineLen > maxWidth) {
          lines++;
          lineLen = word.length;
        } else {
          lineLen += needed;
        }
      }
    }

    // top + title + blank + lines + trailing blank + bottom
    return lines + 5;
  }

  handleInput(e: KeyboardEvent): void {
    if (e.key === "Tab") {
      e.preventDefault();
      this.game.popPopup();
      if (this.index === -1) {
        this.index = 0;      
      } else {
        this.index = (this.index + 1) % this.targets.length;
      }
      const target = this.targets[this.index];
      this.game.gs.highlightedLoc = `${target.x},${target.y}`;
      this.game.pushPopup(this.makePopup());
    } else if (e.key === "Escape") {
      this.game.popPopup();
      this.game.popInputController();
      this.game.gs.highlightedLoc = "";
    }
  }
}