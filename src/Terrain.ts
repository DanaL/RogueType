const Terrain = {
  Floor: 0,
  Wall:  1,
  Gate: 2,
  LiftDown: 3,
  LiftUp: 4,
  Door : 5,
  OpenGate: 6,
  DeactivatedGate: 7,
  DataBank: 8,
  Mainframe: 9,
} as const;

type TerrainType = typeof Terrain[keyof typeof Terrain];

interface TerrainDef {
  glyph:    string;
  fg:       string;
  walkable: boolean;
  opaque:   boolean;
}

const TERRAIN_DEF: Record<TerrainType, TerrainDef> = {
  [Terrain.Floor]: { glyph: '.', fg: '#646365', walkable: true, opaque: false },
  [Terrain.Wall]:  { glyph: '#', fg: '#646365', walkable: false, opaque: true },
  [Terrain.Gate]: { glyph: 'ǁ', fg: '#add4fa', walkable: false, opaque: false },
  [Terrain.LiftDown]: { glyph: '>', fg: '#add4fa', walkable: true, opaque: false },
  [Terrain.LiftUp]: { glyph: '<', fg: '#add4fa', walkable: true, opaque: false },
  [Terrain.Door]: { glyph: '+', fg: '#add4fa', walkable: true, opaque: true },
  [Terrain.OpenGate]: { glyph: '\\', fg: '#add4fa', walkable: true, opaque: false },
  [Terrain.DeactivatedGate]: { glyph: '\\', fg: '#add4fa', walkable: true, opaque: false },
  [Terrain.DataBank]: { glyph: '▤', fg: '#add4fa', walkable: false, opaque: true },
  [Terrain.Mainframe]: { glyph: '=', fg: '#ff004e', walkable: true, opaque: false },
};

export { Terrain, type TerrainType, TERRAIN_DEF };
