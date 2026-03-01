import { Game } from "./Game";
import { Player } from "./Player";
import { Terrain, type TerrainType } from "./Terrain";
import { MAP_ROWS, MAP_WIDTH } from "./Utils";

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

  overworld["49,15"] = Terrain.Wall;
  overworld["50,15"] = Terrain.Wall;
  overworld["49,16"] = Terrain.LiftDown;
  overworld["50,16"] = Terrain.Wall;
  overworld["49,17"] = Terrain.Wall;
  overworld["50,17"] = Terrain.Wall;

  game.state.maps.push(overworld);

  game.state.player = new Player(44, 16, 'b', "#005260");
}