import { Actor } from "./Actor";

export class Player extends Actor {
  maxHull: number = 0;
  currHull: number = 0;
  maxFirewall: number = 0;
  currFirewall: number = 0;
  securityClearance: number = 0;
  
  // not sure if this will be needed for rogue type
  private _endTurn: (() => void) | null = null;

  endTurn(): void {
    this._endTurn?.();
  }
}