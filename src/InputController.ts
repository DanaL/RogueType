import { Game } from "./Game";
import { Popup } from "./Popup";
import { MOVE_KEYS } from "./Utils";

export abstract class InputController {
  abstract handleInput(e: KeyboardEvent): void;
  update(_deltaMs: number): void {}
}

export class YesNoController extends InputController {
  private game: Game;
  private onChoice: (yes: boolean) => void;

  constructor(game: Game, onChoice: (yes: boolean) => void) {
    super();
    this.game = game;
    this.onChoice = onChoice;
  }

  handleInput(e: KeyboardEvent): void {
    if (e.key === 'y' || e.key === 'n' || e.key === 'Escape') {
      this.game.popPopup();
      this.game.popInputController();
      this.onChoice(e.key === 'y');
    }
  }
}

export class DirectionController extends InputController {
  private game: Game;
  private onChoice: (x: number, y: number) => void;

  constructor(game: Game, title: string, text: string, onChoice: (x: number, y: number) => void) {
    super();
    this.game = game;
    this.onChoice = onChoice;
    game.pushPopup(new Popup(title, text, 5, 30, 25));
  }

  handleInput(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.game.popPopup();
      this.game.popInputController();
      return;
    }

    const dir = MOVE_KEYS[e.key];
    if (dir) {
      e.preventDefault();
      this.game.popPopup();
      this.game.popInputController();
      this.onChoice(dir[0], dir[1]);
    }
  }
}

export class InfoPopupController extends InputController {
  private game: Game;
  private onDismiss: (() => void) | null;
  private requireConfirmKey: boolean;

  constructor(game: Game, onDismiss: (() => void) | null = null, requireConfirmKey: boolean = false) {
    super();
    this.game = game;
    this.onDismiss = onDismiss;
    this.requireConfirmKey = requireConfirmKey;
  }

  handleInput(e: KeyboardEvent): void {
    if (this.requireConfirmKey && e.key !== 'Enter' && e.key !== 'Escape')
      return;
    this.game.popPopup();
    this.game.popInputController();
    this.onDismiss?.();
  }
}
