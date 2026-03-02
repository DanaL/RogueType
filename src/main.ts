import { GameState } from "./GameState";
import { Game } from "./Game";
import { Renderer } from "./Renderer";
import { Popup } from "./Popup";
import { InfoPopupController } from "./InputController";
import { PlayerCommandController } from "./PlayerCommandController";
import { MAP_ROWS, MAP_WIDTH, warmTextCache } from "./Utils";
import { setupWorld } from "./WorldSetup";

const NUM_MSG_ROWS = 3;
const DISPLAY_HEIGHT = 1 + MAP_ROWS + NUM_MSG_ROWS;

const state = new GameState();
state.fovRadius = Math.ceil(Math.hypot(MAP_WIDTH / 2, MAP_ROWS / 2));
const renderer = new Renderer(MAP_WIDTH, DISPLAY_HEIGHT, 18);
const game = new Game(state, renderer);

setupWorld(game);
warmTextCache();

document.getElementById("app")!.appendChild(renderer.getContainer());

game.pushInputController(new PlayerCommandController(game));
//const txt = await randomTextExcerpt(15);
//const popup = new TypingTestPopup(txt, 3, 20, 50);
//const controller = new TypingTestController(game, 16_000, txt, popup);

// Greetings pop-up
const popup = new Popup("[#009d4a welcome to rogue type]", "> remote c[#ac29ce o]nnection established at 127.0.0.-1...\n> robot control prot[#ac29ce o]col active on remote h[#ac29ce o]st...\n> RO[#4e6ea8 V] class: Burrito B[#ac29ce o]t 3000\n\n-- press any key to begin infiltratio[#4e6ea8 n] --", 3, 10, 50);
game.pushPopup(popup);
game.pushInputController(new InfoPopupController(game));
game.state.computeFov();
game.start();

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
