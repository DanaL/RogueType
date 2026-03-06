const SoftwareCategory = {
  ICE: 0, ICEBreaker: 1, Behaviour: 2, Data: 3
}
type SoftwareCategory = (typeof SoftwareCategory)[keyof typeof SoftwareCategory];

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

export class Software extends DataFile {
  cat: SoftwareCategory;
  firmware: boolean;
  level: number;
  size: number;

  constructor(title: string, cat: SoftwareCategory, firmware: boolean, level: number, size: number) {
    super(title, "");
    this.cat = cat;
    this.firmware = firmware;
    this.level = level;
    this.size = size;
  }
}

export { SoftwareCategory }