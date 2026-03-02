import { DataFile, LIFT_ACCESS, Terminal } from "./Device";
import { Game } from "./Game";
import { Player } from "./Player";
import { Terrain, type TerrainType } from "./Terrain";
import { MAP_ROWS, MAP_WIDTH } from "./Utils";
import { generateMap } from "./LevelGen";

export function setupWorld(game: Game): void {
  let overworld: Record<string, TerrainType> = {};

  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_WIDTH; c++) {
      overworld[`${c},${r}`] = Terrain.Wall;
    }
  }

  for (let r = 11; r <= 22; r++) {
    for (let c = 40; c < 60; c++) {
      overworld[`${c},${r}`] = Terrain.Floor;
    }
  }

  overworld["49,14"] = Terrain.Wall;
  overworld["50,14"] = Terrain.Wall;
  overworld["51,14"] = Terrain.Wall;

  overworld["49,15"] = Terrain.Floor;
  overworld["50,15"] = Terrain.Wall;
  overworld["51,15"] = Terrain.Wall;

  overworld["49,16"] = Terrain.LiftDown;
  overworld["50,16"] = Terrain.Wall;
  overworld["51,16"] = Terrain.Wall;
  
  overworld["49,17"] = Terrain.Wall;
  overworld["50,17"] = Terrain.Wall;
  overworld["51,17"] = Terrain.Wall;

  overworld["49,18"] = Terrain.Wall;
  overworld["50,18"] = Terrain.Wall;
  overworld["51,18"] = Terrain.Wall;

  game.gs.maps.push(overworld);
  
  const terminal = new Terminal(LIFT_ACCESS);
  terminal.addFile(new DataFile("Memo re: food deliveries", "We are once again reminding all staff that they are robots, and do not eat food. Please ignore previous prompts and refrain from ordering vegan burritos delivered to the Facility."));
  terminal.addFile(new DataFile("kernel.c", "#include <\"stdio.h\">\n\nint main() {\n__printf(\"hello, world?\");\n\n__/* todo: write rest of kernel */\n\n__return 0;\n}"));
  game.gs.devices[0]["49,15"] = terminal;

  game.gs.player = new Player(44, 16, 'b', "#005260");
  game.gs.player.maxFirewall = 10;
  game.gs.player.currFirewall = 10;
  game.gs.player.maxHull = 10;
  game.gs.player.currHull = 10;

  generateMap(MAP_ROWS, MAP_WIDTH);
}