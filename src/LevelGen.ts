import * as ROT from "rot-js";
import { Terrain, TERRAIN_DEF } from "./Terrain";
import type { TerrainType } from "./Terrain";
import { Device } from "./Device";
import roomsText from '../Rooms.txt?raw';
import logJamsText from '../LogJams.txt?raw';
import { MAP_ROWS, MAP_WIDTH, rngRange as rndRange } from "./Utils";

export class LevelInfo {
  height: number;
  width: number;
  map: Record<string, TerrainType> = {};
  devices: Record<string, Device> = {};

  constructor(h: number, w: number) {
    this.height = h;
    this.width = w;
  }
}

export function debugDumpMap(level: LevelInfo): void {
  const rows: string[] = [];
  for (let y = 0; y < level.height; y++) {
    let row = '';
    for (let x = 0; x < level.width; x++) {
      const terrain = level.map[`${x},${y}`];
      row += terrain !== undefined ? TERRAIN_DEF[terrain].glyph : ' ';
    }
    rows.push(row);
  }
  console.log(rows.join('\n'));
}

function overlapsExistingRoom(level: LevelInfo, tiles: TerrainType[][], originRow: number, originCol: number): boolean {
  for (let r = 0; r < tiles.length; r++) {
    for (let c = 0; c < tiles[r].length; c++) {
      if (level.map[`${originCol + c},${originRow + r}`] !== Terrain.Wall)
        return true;
    }
  }

  return false;
}

function stampTiles(level: LevelInfo, tiles: TerrainType[][], originRow: number, originCol: number): void {
  for (let r = 0; r < tiles.length; r++) {
    for (let c = 0; c < tiles[r].length; c++) {
      level.map[`${originCol + c},${originRow + r}`] = tiles[r][c];
    }
  }
}

export function generateMap(h: number, w: number): LevelInfo {
  const level = new LevelInfo(h, w);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      level.map[`${x},${y}`] = Terrain.Wall;
    }
  }

  // place the chokePoint for the map
  const chokePoint = LOG_JAMS[rndRange(LOG_JAMS.length)];
  const row = MAP_ROWS / 2 - 5 + rndRange(10);
  const col = MAP_WIDTH / 2 - 5 + rndRange(10);
  stampTiles(level, chokePoint.tiles, row, col);

  // place 4 to 6 rooms on the 'arrival' side of the map
  const numRoooms = rndRange(4, 6);
  for (let j = 0; j < numRoooms; j++) {
    const roomTemplate = ROOMS[rndRange(ROOMS.length)];
    // Try up to 10 times to place room
    for (let k = 0; k < 10; k++) {
      let minCol: number, maxCol: number;    
      if (chokePoint.restricted == "East") {
        minCol = 1;
        maxCol = MAP_WIDTH / 2;
      } else {
        minCol = MAP_WIDTH / 2;
        maxCol = MAP_WIDTH - 1;
      }
      const minRow = 1;
      const maxRow = MAP_ROWS - roomTemplate.height - 1;

      const rc = rndRange(minCol, maxCol);
      const rr = rndRange(minRow, maxRow);

      if (!overlapsExistingRoom(level, roomTemplate.tiles, rr, rc)) {
        stampTiles(level, roomTemplate.tiles, rr, rc);
        break;
      }
    }
  }
  debugDumpMap(level);

  return level;
}

// Room coordinates are stored as (row, col) pairs in the template files.
export type RoomCoord = { row: number; col: number };

export interface RoomTemplate {
  width:     number;
  height:    number;
  tiles:     TerrainType[][];  // tiles[row][col]
  entrances: RoomCoord[];      // positions of door tiles that connect to other rooms
  terminals: RoomCoord[];      // positions of terminal devices (floor tile)
}

export interface LogJamTemplate {
  width:      number;
  height:     number;
  tiles:      TerrainType[][];  // tiles[row][col]
  entrances:  RoomCoord[];      // door tile entrances
  gate:       RoomCoord;        // gate tile position
  triggers:   RoomCoord[];      // positions where weapon triggers will be placed
  restricted: string;           // direction this logjam may not connect toward (e.g. "East")
}

const CHAR_TO_TERRAIN: Record<string, TerrainType> = {
  '#': Terrain.Wall,
  '.': Terrain.Floor,
  '=': Terrain.Floor,  // terminal device — floor tile, device placed separately
  '1': Terrain.Floor,  // trigger location — floor tile, trigger placed separately
  '+': Terrain.Door,
  'G': Terrain.Gate,
};

// Match all row,col pairs in a metadata value string.
// Using a regex handles both ';' and ':' as separators transparently.
function parseCoords(value: string): RoomCoord[] {
  return [...value.matchAll(/(\d+),(\d+)/g)]
    .map(m => ({ row: parseInt(m[1]), col: parseInt(m[2]) }));
}

function parseMeta(lines: string[]): Record<string, string> {
  const meta: Record<string, string> = {};
  for (const line of lines) {
    const i = line.indexOf(':');
    if (i > 0)
      meta[line.slice(0, i)] = line.slice(i + 1);
  }
  return meta;
}

export function parseRooms(text: string): RoomTemplate[] {
  return text.split('----------')
    .map(block => block.trim())
    .filter(block => block.length > 0)
    .map(block => {
      const lines = block.split('\n').filter(l => l.trim().length > 0);
      const gridLines = lines.filter(l => !/^\w+:/.test(l));
      const metaLines = lines.filter(l => /^\w+:/.test(l));
      const tiles = gridLines.map(l => [...l].map(ch => CHAR_TO_TERRAIN[ch] ?? Terrain.Wall));
      const meta = parseMeta(metaLines);
      return {
        width:     Math.max(...tiles.map(r => r.length)),
        height:    tiles.length,
        tiles,
        entrances: meta['Entrance'] ? parseCoords(meta['Entrance']) : [],
        terminals: meta['Terminal'] ? parseCoords(meta['Terminal']) : [],
      };
    });
}

export function parseLogJams(text: string): LogJamTemplate[] {
  return text.split('----------')
    .map(block => block.trim())
    .filter(block => block.length > 0)
    .map(block => {
      const lines = block.split('\n').filter(l => l.trim().length > 0);
      const gridLines = lines.filter(l => !/^\w+:/.test(l));
      const metaLines = lines.filter(l => /^\w+:/.test(l));
      const tiles = gridLines.map(l => [...l].map(ch => CHAR_TO_TERRAIN[ch] ?? Terrain.Wall));
      const meta = parseMeta(metaLines);
      const gateCoords = meta['Gate'] ? parseCoords(meta['Gate']) : [];
      return {
        width:      Math.max(...tiles.map(r => r.length)),
        height:     tiles.length,
        tiles,
        entrances:  meta['Entrance']   ? parseCoords(meta['Entrance'])  : [],
        gate:       gateCoords[0] ?? { row: 0, col: 0 },
        triggers:   meta['WTrigger']   ? parseCoords(meta['WTrigger'])  : [],
        restricted: meta['Restricted'] ?? '',
      };
    });
}

export const ROOMS    = parseRooms(roomsText);
export const LOG_JAMS = parseLogJams(logJamsText);