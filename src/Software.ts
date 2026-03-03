const SoftwareCategory = {
  ICE: 0, ICEBreaker: 1, Behaviour: 2, Data: 3
}
type SoftwareCategory = (typeof SoftwareCategory)[keyof typeof SoftwareCategory];

export class Software {
  name: string;
  cat: SoftwareCategory;
  firmware: boolean;
  level: number;
  size: number;

  constructor(name: string, cat: SoftwareCategory, firmware: boolean, level: number, size: number) {
    this.name = name;
    this.cat = cat;
    this.firmware = firmware;
    this.level = level;
    this.size = size;
  }
}

export { SoftwareCategory }