export abstract class Actor {
  x: number;
  y: number;
  ch: string;
  colour: string;
  
  constructor(x: number, y: number, ch: string, colour: string) {
    this.x = x;
    this.y = y;
    this.ch = ch;
    this.colour = colour;
  }
}