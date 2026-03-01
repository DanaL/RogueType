const Terrain = {
  Floor: 0,
  Wall:  1,
  Grass: 2,
  Road:  3,
  Tree:  4,
  Water: 5,
  HWindow: 6,
  VWindow: 7,
  Mountain: 8,
  Bridge: 9,
  Door: 10,
  Goal: 12,
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
  [Terrain.Wall]:  { glyph: '▓', fg: '#646365', walkable: false, opaque: true },
  [Terrain.Grass]: { glyph: '.', fg: '#8ab060', walkable: true, opaque: false },
  [Terrain.Road]:  { glyph: '.', fg: '#80493a', walkable: true, opaque: false },
  [Terrain.Tree]:  { glyph: 'ϙ', fg: '#8ab060', walkable: true, opaque: true },
  [Terrain.Water]: { glyph: '}', fg: '#4488ff', walkable: false, opaque: false },
  [Terrain.HWindow]: { glyph: '-', fg: '#f2f0e5', walkable: false, opaque: false },
  [Terrain.VWindow]: { glyph: '|', fg: '#f2f0e5', walkable: false, opaque: false },
  [Terrain.Mountain]: { glyph: 'Λ', fg: '#868188', walkable: false, opaque: true },
  [Terrain.Bridge]: { glyph: '=', fg: '#80493a', walkable: true, opaque: false },
  [Terrain.Door]: { glyph: '+', fg: '#a77b5b', walkable: true, opaque: true },
  [Terrain.Goal]: { glyph: '>', fg: '#68c2d3', walkable: true, opaque: false }
};

export { Terrain, type TerrainType, TERRAIN_DEF };
