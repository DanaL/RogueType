import { GameState } from "./GameState";
import { Game } from "./Game";
import { Renderer } from "./Renderer";
import { StartScreenController } from "./StartScreen";
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
  g.pushInputController(new StartScreenController(g));

  g.gs.computeFov();
  g.gs.onRestart = startGame;
  g.start();

  game = g;
}

startGame();

window.addEventListener("keydown", (e) => {
  if (e.key === "Tab" || e.key === "/" || e.key === "'" || e.key === " ") e.preventDefault();
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
