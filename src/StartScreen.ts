import { Game } from "./Game";
import { InputController } from "./InputController";
import { Renderer } from "./Renderer";
import { Popup } from "./Popup";

export class StartScreenPopup extends Popup {
  private game: Game;

  constructor(game: Game) {
    super("[#009d4a welcome to rogue type]", "", 3, 5, 85);
    this.game = game;
  }

  protected drawContent(renderer: Renderer, row: number): number {
    const msg = 
  `> remote c[#ac29ce o]nnection established at 127.0.0.-1...
   > robot control prot[#ac29ce o]col active on remote h[#ac29ce o]st...
   > RO[#4e6ea8 V] class: Burrito B[#ac29ce o]t 3000
   
   In rogue type, you are a hacker infiltrating Facility, whose AI has gone rogue in
   in a mad quest to conquer the world in the name of efficient paperclip production.
   To progress, you will need to hack into robots and terminals to overcome obstacles
   until you reach the bottom level, where the mainframe housing the AI is. Along the 
   way, search for snippets of the Facility mainframe admin password. You will be able 
   to view and arrange the snippets you find by tapping '[#fff v]'.

   Hacking challenges are played as typing contests. Please select your difficulty:
   (expressed in typing speed WPM)

   ________________________________ [#add4fa <] [#fff ${this.game.wpm}] [#add4fa >]

    -- press ENTER to begin infiltratio[#4e6ea8 n] --`;
    this.text = msg;

    return super.drawContent(renderer, row);
  }
}

export class StartScreenController extends InputController {
  private game: Game;
  private popup: Popup;

  constructor(game: Game) {
    super();
    this.game = game;
    
    this.popup = new StartScreenPopup(game);
    game.pushPopup(this.popup);
  }

  handleInput(e: KeyboardEvent): void {
    if (e.key === "Enter") {
      this.game.popPopup();
      this.game.popInputController();
    } else if (e.key === 'a' || e.key === 'h' || e.key === 'ArrowLeft') {
      if (this.game.wpm > 10)
        this.game.wpm -= 10;
    }
    else if (e.key === 'd' || e.key === 'l' || e.key === 'ArrowRight') {
      if (this.game.wpm < 280)
        this.game.wpm += 10;
    }
  }

  private writeText() {

  }
}