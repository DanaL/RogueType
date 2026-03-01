export interface Token {
  colour: string;
  text: string;
}

export class LineScanner {
  private source: string;
  private tokens: Token[] = [];
  private start = 0;
  private current = 0;
  private currentColour: string;
  private readonly defaultColour: string;

  constructor(source: string, defaultColour: string = "#fff") {
    this.source = source;
    this.currentColour = defaultColour;
    this.defaultColour = defaultColour;
  }

  scan(): Token[] {
    while (!this.isAtEnd()) {
      this.start = this.current;
      this.tokenize();
    }
    
    return this.tokens;
  }

  private tokenize(): void {
    const c = this.advance();
    switch (c) {
      case '[':
        this.scanColor();
        break;
      case ']':
        this.currentColour = this.defaultColour;
        break;
      case ' ':
        break; // spaces consumed; words include their trailing space
      case '\n':
        this.tokens.push({ colour: this.currentColour, text: '\n' });
        break;
      case '\t':
        this.tokens.push({ colour: this.currentColour, text: '\t' });
        break;
      case '\\':
        if (this.peek() === 'n') {
          this.tokens.push({ colour: this.currentColour, text: '\n' });
          this.advance();
        } else {
          this.tokens.push({ colour: this.currentColour, text: c });
        }
        break;
      case '_':
        this.tokens.push({ colour: this.currentColour, text: ' ' });
        break;
      default:
        this.scanWord();
        break;
    }
  }

  private scanColor(): void {
    this.start = this.current;
    while (/[a-zA-Z0-9#]/.test(this.peek())) 
      this.advance();
    this.currentColour = this.source.slice(this.start, this.current);
  }

  private scanWord(): void {
    while (!this.isAtEnd() && this.peek() !== '[' && this.peek() !== ']' && !/\s/.test(this.peek())) {
      this.advance();
    }

    let word = this.source.slice(this.start, this.current);
    // Keep trailing space with the word to avoid orphaned spaces at line-wrap boundaries
    if (this.peek() === ' ') {
      word += ' ';
      this.advance();
    } else if (this.peek() === ']' && this.peekNext() === ' ') {
      word += ' ';
    }
    this.tokens.push({ colour: this.currentColour, text: word });
  }

  private peek(): string {
    return this.isAtEnd() ? '\0' : this.source[this.current];
  }

  private peekNext(): string {
    return this.current + 1 >= this.source.length ? '\0' : this.source[this.current + 1];
  }

  private advance(): string {
    return this.source[this.current++];
  }

  private isAtEnd(): boolean {
    return this.current >= this.source.length;
  }
}
