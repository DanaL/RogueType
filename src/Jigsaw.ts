import { InputController } from "./InputController";
import { Game } from "./Game";
import { Popup } from "./Popup";
import { Player } from "./Actor";
import { DataFile } from "./Device";

export class JigsawPiece extends DataFile {
  id: number;
  row: number = -1;

  constructor(id: number, text: string) {
    super("file snippet", text, true);
    this.id = id;
  }
}

const NUM_LINES: number = 25;

export class JigsawController extends InputController {
  cursor: number = -1;
  selectedId: number = -1;

  private player: Player;
  private game: Game;
  private popup: JigsawPopup;
  
  constructor(p: Player, g: Game) {
    super();
    this.game = g;
    this.player = p; 
    this.popup = new JigsawPopup(p, this);

    g.pushPopup(this.popup);
  }

  handleInput(e: KeyboardEvent): void {
    
    if (e.key === 's' || e.key === 'ArrowDown' || e.key === 'j') {  
      this.cursor = (this.cursor + 1) %  NUM_LINES;
    } else if (e.key === 'w' || e.key === 'ArrowUp' || e.key === 'k') {  
      this.cursor = this.cursor === 0 ? NUM_LINES - 1 : this.cursor - 1;
    } else if (e.key === "Enter" && this.selectedId !== -1) {
      this.placePiece();
    } else if (e.key === "Enter") {
      this.selectPiece();
    } else if (e.key === "Escape" && this.selectedId !== -1) {
      this.selectedId = -1;
    } else if (e.key === "Escape") {
      this.game.popPopup();
      this.game.popInputController();

      return;
    }

    this.popup.setText();
  }

  private placePiece() {
    const selectedPiece = this.player.jigsawPieces.find(p => p.id === this.selectedId);
    if (selectedPiece) {
      if (!this.player.jigsawPieces.some(p => p.row === this.cursor)) {
        selectedPiece.row = this.cursor;
        this.selectedId = -1;
      }
    }    
  }

  private selectPiece() {
    for (const p of this.player.jigsawPieces) {
      if (p.row === this.cursor)
        this.selectedId = p.id;
    }
  }
}

export class JigsawPopup extends Popup {
  private player: Player;
  private controller: JigsawController;

  constructor(p: Player, jc: JigsawController) {
    super("vped 4.0.4", "", 2, 2, 85);
    this.player = p;
    this.controller = jc;

    this.setText();
  }

  setText(): void {
    const prefix = (row: number): string =>
      row === this.controller.cursor ? "[#fff >]_" : "__";

    this.text = "select/deselect pieces with enter, use mv keys to sort\n\n";

    const lines: string[] = Array(NUM_LINES).fill("");
    let selectedText = "";
    let selectedRow = -1;
    if (this.player.jigsawPieces.length > 0) {
      let cursorDefault = 9999;
      let row = 24;
      for (const piece of this.player.jigsawPieces.filter(j => j.row === -1)) {
        lines[row] = piece.contents;
        piece.row = row;
        if (row < cursorDefault)
          cursorDefault = row;
        row -= 2;

        if (piece.id === this.controller.selectedId) {
          selectedRow = row;
          selectedText = piece.contents;
        }
      }

      for (const piece of this.player.jigsawPieces.filter(j => j.row !== -1)) {
        lines[piece.row] = piece.contents;
        row = piece.row;
        if (row < cursorDefault)
          cursorDefault = row;
        if (piece.id === this.controller.selectedId) {
          selectedRow = row;
          selectedText = piece.contents;
        }
      }

      if (this.controller.cursor === -1 && cursorDefault !== 9999) {
        this.controller.cursor = cursorDefault;
      }

      for (let j = 0; j < NUM_LINES; j++) {
        if (lines[j] === "" || j === selectedRow) {
          lines[j] = prefix(j) + `[#222,#222 ${'_'.repeat(48)}]`;          
        } else if (j !== selectedRow) {
          let s: string = "";
          for (const c of lines[j]) {
            s += c === '.' ? "[#222,#222 _]" : "[#fff,#222 ▆]";            
          }
          lines[j]= prefix(j) + s;
        }
        lines[j] += '\n';
      }

      if (selectedRow !== -1) {
        const cursor = this.controller.cursor;
        let s: string = "";
        for (const c of selectedText) {
          s += c === '.' ? "[#222,#222 _]" : "[#f9d071,#222 ▆]";            
        }
        lines[cursor]= prefix(cursor) + s + "\n";
      }

      lines[this.controller.cursor] = lines[this.controller.cursor];
    }

    this.text += lines.join("");    
  }
}