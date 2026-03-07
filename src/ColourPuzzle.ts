import { rndRange } from "./Utils";

// Light puzzle

// Switch colours to make them all the same.
//   Colour order is: red -> yellow -> green -> blue -> purple -> red
//
// Puzzles are 3x3 grids with centre tile indicating goal
//
// TL    T    TR
// L     C    R
// BL    B    BR
//
// Corner tiles switch both tiles adjacent so:
//
// ie:   L
//       ↑
//       BL→B
//
// T, L, B, R switch tile to the right (clockwise)
//
// B→BR, R->TR, T→TL, L→BL
//
// To generate a puzzle, work back from a winning state six or 
// seven random moves

const RED:number = 0;
const YELLOW:number = 1;
const GREEN:number = 2;
const BLUE:number = 3;
const PURPLE:number = 4;

const colourPuzzleMoves: Record<number, number[]> = {
  0: [1, 3], // top-left
  1: [0], // top
  2: [1, 5], // top-right
  3: [6], // left
  5: [2], // right
  6: [3, 7], // bottom-left
  7: [8], // bottom
  8: [5, 7] // bottom-right
};

export function colourToRGB(colour: number): string {
  switch (colour) {
    case RED:
      return "#ff004e";
    case YELLOW:
      return "#f9d071";
    case GREEN:
      return "#009d4a";
    case BLUE:
      return "#008ac5";
    default:
      return "#ac29ce";
  }
}

export function genColourPuzzle(numMoves: number): number[] {
  const colour = rndRange(5);
  const puzzle = Array(9).fill(colour);
  
  const keys = Object.keys(colourPuzzleMoves).map(Number);
  for (let j = 0; j < numMoves; j++) {
    const mv = keys[rndRange(keys.length)];
    console.log("move: " + (mv));
    let s = "";
    for (const sq of colourPuzzleMoves[mv]) {
      s += "  " + sq;
      puzzle[sq] = (puzzle[sq] + 4) % 5;
    }
    console.log(s);
  }

  return puzzle;
}