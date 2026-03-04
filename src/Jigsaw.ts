import { InputController } from "./InputController";
import { Game } from "./Game";
import { Popup } from "./Popup";
import { Player } from "./Actor";

export class JigsawPiece {
  id: number;
  row: number = -1;
  text: string;

  constructor(id: number, text: string) {
    this.id = id;
    this.text = text;
  }
}

export class JigsawController extends InputController {
  private player: Player;
  private game: Game;
  private popup: JigsawPopup;

  constructor(p: Player, g: Game) {
    super();
    this.game = g;
    this.player = p; 
    this.popup = new JigsawPopup(p);

    g.pushPopup(this.popup);
  }

  handleInput(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      this.game.popPopup();
      this.game.popInputController();
    }
  }
}

export class JigsawPopup extends Popup {
  private player: Player;
  selected: number = -1;
  constructor(p: Player) {
    super("vped 4.0.4", "", 2, 2, 85);
    this.player = p;

    this.setText();
  }

  setText(): void {
    this.text = "select/deselect pieces with enter, use mv keys to sort\n";
    
    const placed = this.player.jigsawPieces.filter(j => j.row !== -1);
    const lines: string[] = Array(25).fill("\n");

    if (this.player.jigsawPieces.length > 0) {
      let selected = 9999;
      let row = 24;
      for (const piece of this.player.jigsawPieces.filter(j => j.row === -1)) {
        lines[row] = piece.text + "\n";
        piece.row = row;
        if (row < selected)
          selected = row;
        row -= 2;
      }

      for (const piece of this.player.jigsawPieces.filter(j => j.row !== -1)) {
        lines[piece.row] = piece.text + "\n";
        row = piece.row;
        if (row < selected)
          selected = row;
      }

      if (selected !== 9999) {
        this.selected = selected;
        lines[selected] = `[#fff ${lines[selected].trimEnd()}]\n`;
      }
    }

    this.text += lines.join("");
  }
}