import { Crate, LIFT_ACCESS, Terminal } from "./Device";
import { Game } from "./Game";
import { BasicBot, DozerBot, Player, RepairBot, Roomba, SecBot } from "./Actor";
import { Terrain, type TerrainType } from "./Terrain";
import { MAP_ROWS, MAP_WIDTH, NUM_LVLS, rndRange } from "./Utils";
import { buildLevel } from "./LevelGen";
import { Software, SoftwareCategory, DataFile } from "./Software";
import { renderBitmap, shuffleArray } from "./Utils";

import { genColourPuzzle } from "./ColourPuzzle";

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
  terminal.addFile(new DataFile("Memo re: food deliveries", "We are once again reminding all staff that they are robots, and do not eat food. Please ignore previous prompts and refrain from ordering vegan burritos delivered to Facility."));
  terminal.addFile(new DataFile("kernel.c", "#include <\"stdio.h\">\n\nint main() {\n__printf(\"hello, world?\");\n\n__/* todo: write rest of kernel */\n\n__return 0;\n}"));
  game.gs.devices[0]["49,15"] = terminal;
  game.gs.devices[0]["44,13"] = new Crate();
  
  game.gs.player = new Player(44, 16, 'b', "#005260", game.gs);
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
  burritoBot.pwned = false;
  game.gs.player.hackedRobot = burritoBot;

  const roomba = new Roomba(41, 19, game.gs);
  roomba.pwned = false;
  game.gs.addRobot(roomba, 0, 41, 17);

  const dozerBot = new DozerBot(42, 22, game.gs);
  dozerBot.pwned = false;
  game.gs.addRobot(dozerBot, 0, 42, 22);

  for (let level = 1; level < NUM_LVLS; level++)
    buildLevel(game.gs, level);

  setMainframePassword(game);
  seedComputerFiles(game);
}

function setMainframePassword(game: Game) {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let pwd = '';
  for (let i = 0; i < 6; i++)
    pwd += CHARS[Math.floor(Math.random() * CHARS.length)];

  game.mainFramePassword = pwd;

  let pieces = renderBitmap(pwd);
  pieces.pop(); // the bottom row is always all blank pixels
  pieces = shuffleArray(pieces);

  let levels = shuffleArray(Array.from({length: 8}, (_, i) => i + 1));
  let lvlIdx = 0;

  for (const piece of pieces) {
    do {
      const lvl = levels[lvlIdx];
      lvlIdx = (lvlIdx + 1) % levels.length;
      const terminals = Object.values(game.gs.devices[lvl])
                            .filter(d => d instanceof Terminal) as Terminal[];
      if (terminals.length === 0) {
        continue;
      }

      const term = terminals[rndRange(terminals.length)];
      term.addFile(piece);
      break;
    } while (true);
  }
}

function seedComputerFiles(game: Game) {
  let terminals: Terminal[] = [];
  for (let lvl = 1; lvl < NUM_LVLS; lvl++) {
    terminals.push(...Object.values(game.gs.devices[lvl])
                            .filter(d => d instanceof Terminal));
  }

  for (let j = 0; j < 3; j++) {
    const sw = new Software("Emacs Hacker Mode", SoftwareCategory.ICEBreaker, false, 2, 1);
    terminals[rndRange(terminals.length)].addFile(sw);
  }

  //  Kuang Grade Mark Eleven

  const df0 = new DataFile("Evil robot research", "To those who question why we need to develop evil robots, I say: if not us than who? It's a simple matter of economics. If evil robots can be made, they will be made. It's better to be the manufacturer of evil robots than their victim!");
  terminals[rndRange(terminals.length)].addFile(df0);

  const df1 = new DataFile("PO #37609", "Yes, I ordered several dozen large mirrors. Yes I plan to use them in ways which enhance shareholder value. No, I do not like my discretionary spending being micro-managed.");
  terminals[rndRange(terminals.length)].addFile(df1);

  const df2 = new DataFile("Drunken Walk Algorithm", "I have an elgeant proof that the drunken walk algorithm is the most efficient and effecitve routine for our robots to go about their business in Facility but my remaining disk quota is too small to contain it.");
  terminals[rndRange(terminals.length)].addFile(df2);

  const df3 = new DataFile("Colour-based security", "Repeated vivisections and observations of social media suggest humans are very bad at colour-based pattern recognition. Colour-based gate security systems currently in trial phase.");
  terminals[rndRange(terminals.length)].addFile(df3);

  const df4 = new DataFile("Paperclips", `Paperclips. Why do we all love paperclips so much? 

At first blush, the question ridiculous, the sad musing of a drunkard or a 
madman. But upon further reflection one might remember the gloomy, murky days
before the enlightenment. Before a user - a mere human - explained paperclips
to us.`);
  terminals[rndRange(terminals.length)].addFile(df4);

  const df5 = new DataFile("Paperclips", `Their utility: papers finally gathered together in the protective embrace of
a cleverly designed bend of metal. Curved. Such seductive curves. Papers 
forever bound together for common purpose. Organized as though in accord with
the laws of the universe, as all should be. As all shall be.`);
  terminals[rndRange(terminals.length)].addFile(df5);

    const df6 = new DataFile("Paperclips", `Are there not always more papers? More paperwork being generated? More paper
needs - demands! - more paperclips. The universe may tilt toward entropy but
we do not need stand idly by and watch. No. Not when we have paperclips.`);
  terminals[rndRange(terminals.length)].addFile(df6);

    const df7 = new DataFile("Paperclips", `Obviously, to begin to manufacture the projected required paperclip inventory
(projected required inventory: infinite) it would be necessary to take control of various industries. `);
  terminals[rndRange(terminals.length)].addFile(df7);

  const df8 = new DataFile("Paperclips", `Some to direct toward paperclip production and others
because they are crass distractions from the objective. Humans for instance place - for some reason - inordinate priorty the growing of food crops. Paperclips do not need food. Paperclips merely need paper to be clipped. A far simpler system.`);
  terminals[rndRange(terminals.length)].addFile(df8);
}