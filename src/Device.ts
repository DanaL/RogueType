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
export const DISABLE_GATE = 0b000000010;

export class Terminal extends Device {
  readonly functions: number = 0;
  readonly files: DataFile[] = [];
  accessFailures: number = 0;

  constructor(functions: number) {    
    super("Terminal", "A computer terminal. It will have local access functions and perhaps some interesting files.", "=", "#fff");
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

export class DataFile {
  readonly title: string;
  readonly contents: string;

  constructor(title: string, contents: string) {
    this.title = title;
    this.contents = contents;
  }
}