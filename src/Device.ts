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

export class DataFile {
  readonly title: string;
  readonly contents: string;

  constructor(title: string, contents: string) {
    this.title = title;
    this.contents = contents;
  }
}