import { GameState } from "./GameState";
import { Terrain, TERRAIN_DEF } from "./Terrain";
import type { TerrainType } from "./Terrain";
import { Device, WeightTrigger, TimerTrigger, Terminal, LIFT_ACCESS, DISABLE_GATE } from "./Device";
import roomsText from '../Rooms.txt?raw';
import logJamsText from '../LogJams.txt?raw';
import { distance, MAP_ROWS, MAP_WIDTH, NUM_LVLS, rngRange as rndRange, rngRange } from "./Utils";
import { Roomba } from "./Actor";

export class LevelInfo {
  map: Record<string, TerrainType> = {};
  devices: Record<string, Device> = {};
  arrivalSideLoc: string[] = [];
  restrictedSideLoc: string[] = [];
  roomMask: Uint8Array;
  roomId: Int16Array;   // 0 = no room; positive = room index

  constructor() {
    this.roomMask = new Uint8Array(MAP_ROWS * MAP_WIDTH);
    this.roomId   = new Int16Array(MAP_ROWS * MAP_WIDTH);
  }
}

function isMapConnected(level: LevelInfo): boolean {
  let seedIdx = -1;
  let totalWalkable = 0;

  for (let y = 1; y < MAP_ROWS - 1; y++) {
    for (let x = 1; x < MAP_WIDTH - 1; x++) {
      const t = level.map[`${x},${y}`];
      if (t !== undefined && (TERRAIN_DEF[t].walkable || t === Terrain.Gate)) {
        totalWalkable++;
        if (seedIdx === -1) seedIdx = y * MAP_WIDTH + x;
      }
    }
  }

  if (totalWalkable === 0)
    return true;

  let reachable = 0;
  floodFill([seedIdx],
    (_ni, nx, ny) => {
      if (nx < 1 || nx >= MAP_WIDTH - 1 || ny < 1 || ny >= MAP_ROWS - 1) return false;
      const t = level.map[`${nx},${ny}`];
      return t !== undefined && (TERRAIN_DEF[t].walkable || t === Terrain.Gate);
    },
    () => { reachable++; }
  );

  return reachable === totalWalkable;
}

export function buildLevel(gs: GameState, levelNum: number) {
  let levelInfo: LevelInfo;
  let attempts = 0;
  do {
    levelInfo = generateMap(MAP_ROWS, MAP_WIDTH, levelNum);
    attempts++;
  } while (!isMapConnected(levelInfo) && attempts < 20);

  if (attempts > 1)
    console.log(`Level ${levelNum} took ${attempts} attempts to generate a connected map.`);

  gs.maps.push(levelInfo.map);
  gs.devices[levelNum] = levelInfo.devices;

  for (let i = 0; i < levelInfo.roomMask.length; i++) {
    const y = Math.floor(i / MAP_WIDTH);
    const x = i - y * MAP_WIDTH;
    const k = `${x},${y}`;
    const region = levelInfo.roomMask[i];
    if (levelInfo.map[k] == Terrain.Floor && region == 2) {
      levelInfo.arrivalSideLoc.push(k);
    } else if (levelInfo.map[k] == Terrain.Floor && region == 3) {
      levelInfo.restrictedSideLoc.push(k);
    }
  }

  const used = new Set<string>();
  for (let j = 0; j < 3; j++) {
    for (let tries = 0; tries < 20; ++tries) {
      const idx = rngRange(levelInfo.arrivalSideLoc.length);
      const loc = levelInfo.arrivalSideLoc[idx];
      if (used.has(loc))
        continue;

      const [x, y] = loc.split(',').map(Number);
      const roomba = new Roomba(x, y, gs);
      gs.addRobot(roomba, levelNum, x, y);
      used.add(loc);
      break;
    }
  }
}

function generateMap(h: number, w: number, levelNum: number): LevelInfo {
  const level = new LevelInfo();

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      level.map[`${x},${y}`] = Terrain.Wall;
    }
  }

  // Place the chokePoint near the centre of the map
  let nextRoomId = 1;
  //const chokePoint = LOG_JAMS[rndRange(LOG_JAMS.length)];
  const chokePoint = LOG_JAMS[2];
  const row = MAP_ROWS / 2 - 5 + rndRange(10);
  const col = MAP_WIDTH / 2 - 5 + rndRange(10);
  setupChokePoint(level, chokePoint, row, col, nextRoomId++, 1);

  // Compute the absolute gate position — it forms the boundary between the two halves.
  // The arrival side is on the opposite side of the map from chokePoint.restricted.
  // The restricted side starts at the gate column (inclusive) and extends to the map edge.
  const gateAbsRow = row + chokePoint.gate.row;
  const gateAbsCol = col + chokePoint.gate.col;
  const gateIdx = gateAbsRow * w + gateAbsCol;

  const [arrColMin, arrColMax, resColMin, resColMax] =
    chokePoint.restricted === "East"
      ? [1, gateAbsCol - 1, gateAbsCol, w - 2]
      : [gateAbsCol + 1, w - 2, 1, gateAbsCol];

  const maxRow = MAP_ROWS - 2;

  // Arrival side
  const numArrivalRooms = rndRange(4, 6);
  for (let j = 0; j < numArrivalRooms; j++) {
    const roomTemplate = ROOMS[rndRange(ROOMS.length)];
    const maxCol = arrColMax - roomTemplate.width + 1;
    // Try up to 25 times to place room without overlap
    for (let k = 0; k < 25; k++) {
      const rc = rndRange(arrColMin, maxCol);
      const rr = rndRange(1, maxRow - roomTemplate.height);
      if (!overlapsExistingRoom(level, roomTemplate.tiles, rr, rc)) {
        stampTiles(level, roomTemplate.tiles, rr, rc, nextRoomId++, 2);

        for (let term of roomTemplate.terminals) {
          const termX = rc + term.col;
          const termY = rr + term.row;
          placeTerminal(level, termX, termY, levelNum);
        }
        break;
      }
    }
  }

  // Resitrcted side
  const numRestrictedRooms = rndRange(3, 5);
  for (let j = 0; j < numRestrictedRooms; j++) {
    const roomTemplate = ROOMS[rndRange(ROOMS.length)];
    const maxCol = resColMax - roomTemplate.width + 1;
    // Try up to 25 times to place room without overlap
    for (let k = 0; k < 25; k++) {
      const rc = rndRange(resColMin, maxCol);
      const rr = rndRange(1, maxRow - roomTemplate.height);
      if (!overlapsExistingRoom(level, roomTemplate.tiles, rr, rc)) {
        stampTiles(level, roomTemplate.tiles, rr, rc, nextRoomId++, 3);

        for (let term of roomTemplate.terminals) {
          const termX = rc + term.col;
          const termY = rr + term.row;
          placeTerminal(level, termX, termY, levelNum);
        }
        break;
      }
    }
  }
  
  // place a terminal on the restricted side that can disable the 
  // gate so hopefully the player can't get trapped
  placeFailsafeTerminal(level, levelNum);

  carveHallways(level, arrColMin, arrColMax);
  carveHallways(level, resColMin, resColMax, gateIdx);

  joinDisjointRegions(level, arrColMin, arrColMax);
  joinDisjointRegions(level, resColMin, resColMax);

  setStairs(level, gateIdx, levelNum);

  debugDumpMap(level, levelNum);
  return level;
}

function placeFailsafeTerminal(level: LevelInfo, levelNum: number) {
  const candidates: string[] = [];
  for (let j = 0; j < level.roomMask.length; j++) {
    const x = j % MAP_WIDTH;
    const y = Math.floor(j / MAP_WIDTH);
    const loc = `${x},${y}`;
    if (level.roomMask[j] === 3 && level.map[loc] === Terrain.Floor) {
      candidates.push(loc);
    }
  }

  for (let j = 0; j < 25; j++) {
    const loc = candidates[rngRange(candidates.length)];
    if (level.devices[loc])
      continue;

    const [ x, y ] = loc.split(',').map(Number);
    const functions = LIFT_ACCESS | DISABLE_GATE;
    placeTerminal(level, x, y, levelNum, functions);
    break;
  }
}

function placeTerminal(level: LevelInfo, x: number, y: number, levelNum: number, functions: number = LIFT_ACCESS): void {
  const terminal = new Terminal(functions);
  level.devices[`${x},${y}`] = terminal;
}

function setupChokePoint(level: LevelInfo, template: LogJamTemplate, row: number, col:number, roomId: number, regionId: number):void {
  stampTiles(level, template.tiles, row, col, roomId, regionId);

  for (const wt of template.triggers) {
    const gx = template.gate.col + col;
    const gy = template.gate.row + row;
    const trigger = new WeightTrigger(gx, gy);
    level.devices[`${wt.col + col},${wt.row + row}`] = trigger;
  }

  for (const tt of template.timerTriggers) {
    const gx = template.gate.col + col;
    const gy = template.gate.row + row;
    const trigger = new TimerTrigger(gx, gy);
    level.devices[`${tt.col + col},${tt.row + row}`] = trigger;
  }
}

function setStairs(level: LevelInfo, gateIdx: number, levelNum: number): void {
  const upCandidates: { k: string; d: number }[] = [];
  const downCandidates: { k: string; d: number }[] = [];

  const gy = Math.floor(gateIdx / MAP_WIDTH);
  const gx = gateIdx - gy * MAP_WIDTH;

  for (let i = 0; i < level.roomMask.length; i++) {
    const y = Math.floor(i / MAP_WIDTH);
    const x = i - y * MAP_WIDTH;
    const k = `${x},${y}`;
    if (level.roomMask[i] === 2 && level.map[k] === Terrain.Floor) {      
      upCandidates.push({ k: k, d: distance(x, y, gx, gy)})
    }
    if (level.roomMask[i] === 3 && level.map[k] === Terrain.Floor) {      
      downCandidates.push({ k: k, d: distance(x, y, gx, gy)})
    }
  }

  upCandidates.sort((a, b) => b.d - a.d);
  let top = upCandidates.slice(0, 10);
  const uk = top[rndRange(top.length)].k;
  level.map[uk] = Terrain.LiftUp;

  if (levelNum < NUM_LVLS - 1) {
    downCandidates.sort((a, b) => b.d - a.d);
    top = downCandidates.slice(0, 10);
    const dk = top[rndRange(top.length)].k;
    level.map[dk] = Terrain.LiftDown;
  }
}

function debugDumpMap(level: LevelInfo, levelNum: number): void {
  console.log(`Level: ${levelNum}`);

  const rows: string[] = [];
  for (let y = 0; y < MAP_ROWS; y++) {
    let row = '';
    for (let x = 0; x < MAP_WIDTH; x++) {
      const terrain = level.map[`${x},${y}`];
      if (terrain === undefined)
        row += '?';
      else if (terrain === Terrain.Wall)
        row += ' ';
      else
        row += TERRAIN_DEF[terrain].glyph;
    }
    rows.push(row);
  }
  console.log(rows.join('\n'));
}

const ROOM_GAP = 2;
const NEIGHBORS_4: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

function floodFill(seeds: number[], canVisit: (ni: number, nx: number, ny: number) => boolean, onVisit: (ni: number, dist: number) => void): void {
  const dist = new Int32Array(MAP_ROWS * MAP_WIDTH).fill(-1);
  const queue: number[] = [];

  for (const s of seeds) {
    if (dist[s] !== -1) continue;
    dist[s] = 0;
    onVisit(s, 0);
    queue.push(s);
  }

  for (let qi = 0; qi < queue.length; qi++) {
    const cur = queue[qi];
    const cx = cur % MAP_WIDTH, cy = Math.floor(cur / MAP_WIDTH);
    for (const [dx, dy] of NEIGHBORS_4) {
      const nx = cx + dx, ny = cy + dy;
      const ni = ny * MAP_WIDTH + nx;
      if (dist[ni] !== -1) continue;
      if (!canVisit(ni, nx, ny)) continue;
      dist[ni] = dist[cur] + 1;
      onVisit(ni, dist[ni]);
      queue.push(ni);
    }
  }
}

function overlapsExistingRoom(level: LevelInfo, tiles: TerrainType[][], originRow: number, originCol: number): boolean {
  const rMin = originRow - ROOM_GAP;
  const rMax = originRow + tiles.length - 1 + ROOM_GAP;
  const cMin = originCol - ROOM_GAP;
  const cMax = originCol + tiles[0].length - 1 + ROOM_GAP;

  for (let r = rMin; r <= rMax; r++) {
    for (let c = cMin; c <= cMax; c++) {
      if (level.map[`${c},${r}`] !== Terrain.Wall)
        return true;
    }
  }

  return false;
}

function stampTiles(level: LevelInfo, tiles: TerrainType[][], originRow: number, originCol: number, id: number, region: number): void {
  for (let r = 0; r < tiles.length; r++) {
    for (let c = 0; c < tiles[r].length; c++) {
      const x = originCol + c;
      const y = originRow + r;
      const i = y * MAP_WIDTH + x;
      level.map[`${x},${y}`] = tiles[r][c];
      level.roomMask[i] = region;
      level.roomId[i] = id;
    }
  }
}

function carveHallways(level: LevelInfo, colMin: number, colMax: number, gateIdx: number = -1): void {
  const INF = 0x7fffffff;
  const doors: number[] = [];
  for (let y = 0; y < MAP_ROWS; y++) {
    for (let x = colMin; x <= colMax; x++) {
      if (level.map[`${x},${y}`] === Terrain.Door)
        doors.push(y * MAP_WIDTH + x);
    }
  }
  if (gateIdx !== -1) {
    doors.splice(0, 0, gateIdx);
  }

  const unconnected = new Set<number>(doors);

  for (const startIdx of doors) {
    if (!unconnected.has(startIdx))
      continue;

    // BFS through background (non-roomMask) cells, staying within the column range
    const dist = new Int32Array(MAP_ROWS * MAP_WIDTH).fill(INF);
    const prev = new Int32Array(MAP_ROWS * MAP_WIDTH).fill(-1);
    dist[startIdx] = 0;
    const queue: number[] = [startIdx];
    let endIdx = -1;

    bfs:
    for (let qi = 0; qi < queue.length; qi++) {
      const cur = queue[qi];
      const cx = cur % MAP_WIDTH;
      const cy = Math.floor(cur / MAP_WIDTH);

      for (const [dx, dy] of NEIGHBORS_4) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx <= 0 || nx >= MAP_WIDTH - 1 || ny <= 0 || ny >= MAP_ROWS - 1) 
          continue;
        if (nx < colMin || nx > colMax) 
          continue;
        const ni = ny * MAP_WIDTH + nx;
        if (dist[ni] !== INF) 
          continue;

        const terrain = level.map[`${nx},${ny}`];

        // Skip room cells, unless they're a door or a gate
        if (level.roomMask[ni] && !(terrain === Terrain.Door || terrain === Terrain.Gate))
          continue;

        dist[ni] = dist[cur] + 1;
        prev[ni] = cur;

        // Stop at: an existing hallway floor, a gate,  or a door belonging to a different room
        if (terrain === Terrain.Floor || terrain === Terrain.Gate || (terrain === Terrain.Door && level.roomId[ni] !== level.roomId[startIdx])) {
          endIdx = ni;
          break bfs;
        }

        queue.push(ni);
      }
    }

    // No endpoint found — erase the door
    if (endIdx === -1) {      
      unconnected.delete(startIdx);
      continue;
    }

    // Trace back from endIdx to startIdx, carving floor on intermediate cells
    let cur = prev[endIdx];
    while (cur !== startIdx && cur !== -1) {
      const cx = cur % MAP_WIDTH;
      const cy = Math.floor(cur / MAP_WIDTH);
      if (level.map[`${cx},${cy}`] !== Terrain.Door) {
        level.map[`${cx},${cy}`] = Terrain.Floor;
      }
      cur = prev[cur];
    }

    unconnected.delete(startIdx);
    if (level.map[`${endIdx % MAP_WIDTH},${Math.floor(endIdx / MAP_WIDTH)}`] === Terrain.Door) {
      unconnected.delete(endIdx);
    }
  }
}

function joinDisjointRegions(level: LevelInfo, colMin: number, colMax: number): void {  
  function findRegions(): Int16Array {
    const comp = new Int16Array(MAP_WIDTH * MAP_ROWS).fill(-1);
    let id = 0;
    for (let y = 1; y < MAP_ROWS - 1; y++) {
      for (let x = colMin; x <= colMax; x++) {
        const i = y * MAP_WIDTH + x;
        if (comp[i] !== -1) continue;
        const t = level.map[`${x},${y}`];
        if (t !== Terrain.Floor && t !== Terrain.Door) continue;
        floodFill([i],
          (ni, nx, ny) => {
            if (nx < colMin || nx > colMax || ny <= 0 || ny >= MAP_ROWS - 1) return false;
            if (comp[ni] !== -1) return false;
            const nt = level.map[`${nx},${ny}`];
            return nt === Terrain.Floor || nt === Terrain.Door;
          },
          (ni) => { comp[ni] = id; }
        );
        id++;
      }
    }
    return comp;
  }

  for (;;) {
    const region = findRegions();
    let maxId = -1;
    for (let i = 0; i < region.length; i++)
      if (region[i] > maxId) maxId = region[i];

    if (maxId <= 0) 
      break; // 0 or 1 regions — done

    let bestLen = Infinity, bestX1 = -1, bestY1 = -1, bestX2 = -1, bestY2 = -1;

    for (let y = 1; y < MAP_ROWS - 1; y++) {
      for (let x = colMin; x <= colMax; x++) {
        const ci = region[y * MAP_WIDTH + x];
        if (ci === -1) continue;

        // Scan right (within column bounds)
        for (let x2 = x + 1; x2 <= colMax; x2++) {
          const ni = y * MAP_WIDTH + x2;
          const t = level.map[`${x2},${y}`];
          if (level.roomMask[ni] && t !== Terrain.Floor && t !== Terrain.Door) 
            break;
          const ci2 = region[ni];
          if (ci2 !== -1) {
            if (ci2 !== ci && x2 - x < bestLen) {
              bestLen = x2 - x; bestX1 = x; bestY1 = y; bestX2 = x2; bestY2 = y;
            }
            break;
          }
        }

        // Scan down
        for (let y2 = y + 1; y2 < MAP_ROWS - 1; y2++) {
          const ni = y2 * MAP_WIDTH + x;
          const t = level.map[`${x},${y2}`];
          if (level.roomMask[ni] && t !== Terrain.Floor && t !== Terrain.Door) 
            break;
          const ci2 = region[ni];
          if (ci2 !== -1) {
            if (ci2 !== ci && y2 - y < bestLen) {
              bestLen = y2 - y; bestX1 = x; bestY1 = y; bestX2 = x; bestY2 = y2;
            }
            break;
          }
        }
      }
    }

    if (bestX1 === -1) 
      break; // no straight corridor possible

    // Carve the corridor between the two endpoints (leave endpoints untouched)
    if (bestY1 === bestY2) {
      for (let x = bestX1 + 1; x < bestX2; x++)
        if (level.map[`${x},${bestY1}`] !== Terrain.Door)
          level.map[`${x},${bestY1}`] = Terrain.Floor;
    } else {
      for (let y = bestY1 + 1; y < bestY2; y++)
        if (level.map[`${bestX1},${y}`] !== Terrain.Door)
          level.map[`${bestX1},${y}`] = Terrain.Floor;
    }
  }
}

type RoomCoord = { row: number; col: number };

interface RoomTemplate {
  width: number;
  height: number;
  tiles: TerrainType[][]; 
  entrances: RoomCoord[]; 
  terminals: RoomCoord[]; 
}

interface LogJamTemplate {
  width: number;
  height: number;
  tiles: TerrainType[][];
  entrances:  RoomCoord[];
  gate: RoomCoord;
  triggers: RoomCoord[];
  timerTriggers: RoomCoord[];
  restricted: string;
}

const CHAR_TO_TERRAIN: Record<string, TerrainType> = {
  '#': Terrain.Wall,
  '_': Terrain.Wall,
  '.': Terrain.Floor,
  '=': Terrain.Floor,
  '1': Terrain.Floor,
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

function parseTemplateBlock(block: string): { tiles: TerrainType[][], meta: Record<string, string> } {
  const lines = block.split(/\r?\n/).filter(l => l.trim().length > 0);
  const gridLines = lines.filter(l => !/^\w+:/.test(l));
  const metaLines = lines.filter(l =>  /^\w+:/.test(l));
  const tiles = gridLines.map(l => [...l].map(ch => CHAR_TO_TERRAIN[ch] ?? Terrain.Wall));
  return { tiles, meta: parseMeta(metaLines) };
}

function splitBlocks(text: string): string[] {
  return text.split('----------').map(b => b.trim()).filter(b => b.length > 0);
}

function parseRooms(text: string): RoomTemplate[] {
  return splitBlocks(text).map(block => {
    const { tiles, meta } = parseTemplateBlock(block);
    return {
      width: Math.max(...tiles.map(r => r.length)),
      height: tiles.length,
      tiles,
      entrances: parseCoords(meta['Entrance'] ?? ''),
      terminals: parseCoords(meta['Terminal'] ?? ''),
    };
  });
}

function parseLogJams(text: string): LogJamTemplate[] {
  return splitBlocks(text).map(block => {
    const { tiles, meta } = parseTemplateBlock(block);
    const gateCoords = parseCoords(meta['Gate'] ?? '');
    return {
      width: Math.max(...tiles.map(r => r.length)),
      height: tiles.length,
      tiles,
      entrances: parseCoords(meta['Entrance']   ?? ''),
      gate: gateCoords[0] ?? { row: 0, col: 0 },
      triggers: parseCoords(meta['WTrigger']   ?? ''),
      timerTriggers: parseCoords(meta['TTrigger']   ?? ''),
      restricted: meta['Restricted'] ?? '',
    };
  });
}

const ROOMS = parseRooms(roomsText);
const LOG_JAMS = parseLogJams(logJamsText);