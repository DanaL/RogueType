import { Actor } from "./Actor";

export class Player extends Actor {
  // not sure if this will be needed for rogue type
  private _endTurn: (() => void) | null = null;

  endTurn(): void {
    this._endTurn?.();
  }
}