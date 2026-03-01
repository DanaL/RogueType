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

export class Terminal extends Device {
  constructor() {
    super("Terminal", "A computer terminal. It will have local access functions and perhaps some interestsing files.", "=", "#fff");
  }
}