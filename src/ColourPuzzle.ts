


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
// T, L, B, R switch tile to the right (counter clockwise)
//
// B→BR, R->TR, T→TL, L→BL
//
// To generate a puzzle, work back from a winning state six or 
// seven random moves

const RED:number = 0;
const YELLOW:number = 1;
const GREEN:number = 2;
const BLUE:number = 3;
const PURPLE:number = 5;

const colours = [RED, YELLOW, GREEN, BLUE, PURPLE];