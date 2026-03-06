import * as ROT from "rot-js";
import { GameState } from "./GameState";
import { Renderer } from "./Renderer";
import { InputController } from "./InputController";
import { Popup } from "./Popup";
import type Scheduler from "rot-js/lib/scheduler/scheduler";

export class Game {
  readonly gs: GameState;
  readonly renderer: Renderer;

  private controllerStack: InputController[] = [];
  private popupStack: Popup[] = [];
  private inputQueue: KeyboardEvent[] = [];
  private engine: ROT.Engine;
  readonly scheduler: Scheduler;
  readonly wpm: number;
  mainFramePassword: string = "";
  
  constructor(state: GameState, renderer: Renderer) {
    this.gs = state;
    this.renderer = renderer;
    state.game = this;

    this.scheduler = new ROT.Scheduler.Simple();
    this.engine = new ROT.Engine(this.scheduler);

    this.wpm = 40;
  }

  start(): void {
    this.scheduler.add({ act: () => { this.gs.roundEnd(); return Promise.resolve(); } }, true);
    this.engine.start();
  }

  pushInputController(controller: InputController): void {
    this.controllerStack.push(controller);
  }

  popInputController(): void {
    this.controllerStack.pop();
  }

  pushPopup(popup: Popup): void {
    this.popupStack.push(popup);
  }

  popPopup(): void {
    this.popupStack.pop();
  }

  get hasPopup(): boolean { return this.popupStack.length > 0; }

  get currentController(): InputController | undefined {
    return this.controllerStack.at(-1);
  }

  render(): void {
    this.renderer.drawGameArea(this.gs);
    this.renderer.drawUI(this.gs);
    for (const popup of this.popupStack) {
      popup.draw(this.renderer);
    }
  }

  queueInput(e: KeyboardEvent): void {
    this.inputQueue.push(e);
  }

  get isAnimating(): boolean {
    return this.gs.isAnimating;
  }

  update(_deltaMs: number): void {
    this.currentController?.update(_deltaMs);

    if (!this.isAnimating && this.inputQueue.length > 0) {
      const e = this.inputQueue.shift()!;
      this.currentController?.handleInput(e);
    }
  }
}
