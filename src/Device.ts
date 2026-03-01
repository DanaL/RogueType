export abstract class Device {
  name: string;
  desc: string;
  ch: string;
  colour: string;
  
  constructor(name: string, desc: string, ch: string, colour: string) {
    this.name = name;
    this.desc = desc;
    this.ch = ch;
    this.colour = colour;
  }
}

export const LIFT_ACCESS = 0b000000001;

export class Terminal extends Device {
  readonly functions: number = 0;
  accessFailures: number = 0;
  
  constructor(functions: number) {    
    super("Terminal", "A computer terminal. It will have local access functions and perhaps some interestsing files.", "=", "#fff");
    this.functions = functions;
  }
}