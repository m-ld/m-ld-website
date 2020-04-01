import { checkIntersection } from 'line-intersect';

export class Rectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;

  constructor([x, y]: [number, number], [width, height]: [number, number]) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
  get size(): [number, number] {
    return [this.width, this.height];
  }

  get area(): number {
    return this.width * this.height;
  }

  get centre(): [number, number] {
    return [this.x + this.width / 2, this.y + this.height / 2];
  }

  get sides(): Line[] {
    return [this.top, this.right, this.bottom, this.left];
  }

  intersect(line: Line): [number, number][] {
    return this.sides.map(side => side.intersect(line)).filter(point => point);
  }

  intersects(that: Rectangle): boolean {
    return !!that.points.filter(p => this.contains(p)).length;
  }

  contains([x, y]: [number, number]): boolean {
    const [right, bottom] = this.bottomRight;
    return x >= this.x && y >= this.y && x <= right && y <= bottom;
  }

  get left(): Line {
    return new Line(this.bottomLeft, this.topLeft);
  }

  get bottom(): Line {
    return new Line(this.bottomRight, this.bottomLeft);
  }

  get right(): Line {
    return new Line(this.topRight, this.bottomRight);
  }

  get top(): Line {
    return new Line(this.topLeft, this.topRight);
  }

  get topLeft(): [number, number] {
    return [this.x, this.y];
  }

  get bottomLeft(): [number, number] {
    return [this.x, this.y + this.height];
  }

  get bottomRight(): [number, number] {
    return [this.x + this.width, this.y + this.height];
  }

  get topRight(): [number, number] {
    return [this.x + this.width, this.y];
  }

  get points(): [number, number][] {
    return [this.topLeft, this.topRight, this.bottomRight, this.bottomLeft];
  }

  expand(pixels: number): Rectangle {
    return new Rectangle([this.x - pixels, this.y - pixels],
      [this.width + pixels * 2, this.height + pixels * 2]);
  }
}

export class Line {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;

  constructor([x1, y1]: [number, number], [x2, y2]: [number, number]) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
  }

  intersect(that: Line): [number, number] {
    let i = checkIntersection(this.x1, this.y1, this.x2, this.y2, that.x1, that.y1, that.x2, that.y2);
    return i.type == 'intersecting' ? [i.point.x, i.point.y] : null;
  }
}