import { GameState } from "./GameState";
import { Game } from "./Game";
import { Renderer } from "./Renderer";
import { Popup } from "./Popup";
import { InfoPopupController } from "./InputController";
import { PlayerCommandController } from "./PlayerCommandController";
import { MAP_ROWS, MAP_WIDTH, warmTextCache, warmFontCache } from "./Utils";
import { setupWorld } from "./WorldSetup";

const NUM_MSG_ROWS = 3;
const DISPLAY_HEIGHT = 1 + MAP_ROWS + NUM_MSG_ROWS;

await warmTextCache();
await warmFontCache();

const renderer = new Renderer(MAP_WIDTH, DISPLAY_HEIGHT, 18);
document.getElementById("app")!.appendChild(renderer.getContainer());

let game: Game;

function startGame(): void {
  const state = new GameState();
  state.fovRadius = Math.ceil(Math.hypot(MAP_WIDTH / 2, MAP_ROWS / 2));
  const g = new Game(state, renderer);

  setupWorld(g);

  g.pushInputController(new PlayerCommandController(g));

  // Greetings pop-up
  const popup = new Popup("[#009d4a welcome to rogue type]", "> remote c[#ac29ce o]nnection established at 127.0.0.-1...\n> robot control prot[#ac29ce o]col active on remote h[#ac29ce o]st...\n> RO[#4e6ea8 V] class: Burrito B[#ac29ce o]t 3000\n\n-- press any key to begin infiltratio[#4e6ea8 n] --", 3, 10, 50);
  g.pushPopup(popup);
  g.pushInputController(new InfoPopupController(g));
  g.gs.computeFov();
  g.gs.onRestart = startGame;
  g.start();

  game = g;
}

startGame();

window.addEventListener("keydown", (e) => {
  if (e.key === "Tab" || e.key === "/" || e.key === "'") e.preventDefault();
  game.queueInput(e);
});

let lastTime = 0;
function gameLoop(timestamp: number): void {
  const deltaMs = timestamp - lastTime;
  lastTime = timestamp;
  game.update(deltaMs);
  game.render();
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
