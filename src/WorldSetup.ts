import { DataFile, LIFT_ACCESS, Terminal } from "./Device";
import { Game } from "./Game";
import { BasicBot, Player, Roomba } from "./Actor";
import { Terrain, type TerrainType } from "./Terrain";
import { MAP_ROWS, MAP_WIDTH } from "./Utils";
import { generateMap } from "./LevelGen";
import { Software, SoftwareCategory } from "./Software";
import { renderBitmap } from "./Utils";

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
  game.gs.player.maxHull = 5;
  game.gs.player.currHull = 5;
  game.gs.player.softwareArchive.push(new Software("One-Sendai Ice-Cracker Jr. 0.2.11 beta", SoftwareCategory.ICEBreaker, false, 1, 2));
  game.gs.player.softwareArchive.push(new Software("Cookie Monster Virus Model C", SoftwareCategory.Data, false, 1, 2));
  game.scheduler.add(game.gs.player, true);
  
  let burritoBot = new BasicBot('burrito bot', "Corpo food delivery bot. Its chassis is battered and grafitti-ed.", 'b', '#005260', 0, 0, game.gs);    
  burritoBot.maxHull = 5;
  burritoBot.currHull = 5;
  burritoBot.memorySize = 8;
  burritoBot.software.push(new Software("Emergency Burrito Procedures", SoftwareCategory.Data, true, 1, 4));
  burritoBot.software.push(new Software("Norton AntiVirus 414.10.13.14", SoftwareCategory.ICE, false, 1, 2));
  burritoBot.software.push(new Software("DW Move Protocol", SoftwareCategory.Behaviour, false, 1, 1));
  burritoBot.currFirewall = 10;
  burritoBot.accuracy = 0.80;
  game.gs.player.hackedRobot = burritoBot;

  const levelInfo = generateMap(MAP_ROWS, MAP_WIDTH, 1);
  game.gs.maps.push(levelInfo.map);

  const roomba = new Roomba(41, 19, game.gs);
  game.gs.addRobot(roomba, 0, 41, 17);

  const pwd = renderBitmap("AF5TD07");

  for (const s of pwd) {
    console.log(s);
  }
}