import { Game } from "./Game";

export abstract class InputController {
  abstract handleInput(e: KeyboardEvent): void;
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
