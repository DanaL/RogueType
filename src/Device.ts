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

export const LIFT_ACCESS    = 0b000000001;
export const DISABLE_GATE   = 0b000000010;
export const VENT_RADIATION = 0b000000100;
export const LIGHT_SOURCE   = 0b000001000;

export class Terminal extends Device {
  readonly functions: number = 0;
  readonly files: DataFile[] = [];
  accessFailures: number = 0;

  constructor(functions: number) {    
    super("terminal", "A computer terminal. It will have local access functions and perhaps some interesting files.", "=", "#fff");
    this.functions = functions;
  }

  public addFile(file: DataFile): void {
    this.files.push(file);
  }
}

export class WeightTrigger extends Device {
  readonly gateX: number;
  readonly gateY: number;
  weighted: boolean = false;

  constructor(gx: number, gy: number) {
    super("trigger", "A trigger that reacts to weight on it.", '•', '#646365');
    this.gateX = gx;
    this.gateY = gy;
  }
}

export class TimerTrigger extends Device {
  readonly gateX: number;
  readonly gateY: number;
  countDown: number = 0;

  constructor(gx: number, gy: number) {
    super("timer trigger", "A trigger that will be engaged by stepping on it.", '•', '#646365');
    this.gateX = gx;
    this.gateY = gy;
  }
}

export class LightTrigger extends Device {
  readonly gateX: number;
  readonly gateY: number;

  constructor(gx: number, gy: number) {
    super("large crystal", "It is built into a pedestal and glint slightly in the low lighting.", '♢', '#fff');
    this.gateX = gx;
    this.gateY = gy;
  }
}

export class Crate extends Device {
  constructor() {
    super("crate", "A large, heavy wooden box with a paperclip stamped on it.", '▧', '#c47231' );
  }
}

export class Mirror extends Device {
  flipped: boolean = false;

  constructor() {
    super("mirror", "A polished surface mounted on a swivel. It reflects beams of light at 90 degrees.", '╱', '#8af');
  }

  rotate(): void {
    this.flipped = !this.flipped;
    this.ch = this.flipped ? '╲' : '╱';
  }
}

export class LightSource extends Device {
  readonly dirX: number;
  readonly dirY: number;
  on: boolean = false;

  constructor(dirX: number, dirY: number) {
    super("light source", "A focused emitter. It projects a concentrated beam in one direction.", '★', '#ff0');
    this.dirX = dirX;
    this.dirY = dirY;
  }
}

export class DataFile {
  readonly title: string;
  readonly contents: string;
  readonly puzzleSnippet: boolean;

  constructor(title: string, contents: string, snippet: boolean = false) {
    this.title = title;
    this.contents = contents;
    this.puzzleSnippet = snippet;
  }
}