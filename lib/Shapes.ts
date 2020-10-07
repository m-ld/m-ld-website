import { BBox } from 'rbush';
const InfiniteLine = require('line2');
const { checkIntersection, colinearPointWithinSegment } = require('line-intersect');

export interface Shape {
  readonly centre: [number, number];
  readonly area: number;
  intersect(line: Line): [number, number][];
  expand(pixels: number): Shape;
}

type vec2 = { x: number, y: number };

export class Circle implements Shape {
  readonly cx: number;
  readonly cy: number;
  readonly r: number;

  constructor([cx, cy]: [number, number], r: number) {
    this.cx = cx;
    this.cy = cy;
    this.r = r;
  }

  get centre(): [number, number] {
    return [this.cx, this.cy];
  }

  get area(): number {
    return Math.PI * this.r * this.r;
  }

  intersect(line: Line): [number, number][] {
    return line.infinite.intersectCircle({ x: this.cx, y: this.cy }, this.r)
      .filter(({ x, y }: vec2) => colinearPointWithinSegment(x, y, line.x1, line.y1, line.x2, line.y2))
      .map(({ x, y }: vec2) => [x, y]);
  }

  expand(pixels: number): Shape {
    return new Circle([this.cx, this.cy], this.r + pixels);
  }
}

export class Rectangle implements Shape, BBox {
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

  get position(): [number, number] {
    return [this.x, this.y];
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
    const points: [number, number][] = [];
    this.sides.forEach(side => {
      const intersect = side.intersect(line);
      if (intersect != null)
        points.push(intersect);
    })
    return points;
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
    return [this.x, this.maxY];
  }

  get bottomRight(): [number, number] {
    return [this.maxX, this.maxY];
  }

  get topRight(): [number, number] {
    return [this.maxX, this.y];
  }

  get points(): [number, number][] {
    return [this.topLeft, this.topRight, this.bottomRight, this.bottomLeft];
  }

  get minX(): number {
    return this.x;
  }

  get minY(): number {
    return this.y;
  }

  get maxX(): number {
    return this.x + this.width;
  }

  get maxY(): number {
    return this.y + this.height;
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

  get infinite() {
    return new InfiniteLine(this.x1, this.y1, this.x2, this.y2);
  }

  get length() {
    return Math.sqrt(Math.pow(this.x2 - this.x1, 2) + Math.pow(this.y2 - this.y1, 2));
  }

  intersect(that: Line): [number, number] | null {
    let i = checkIntersection(this.x1, this.y1, this.x2, this.y2, that.x1, that.y1, that.x2, that.y2);
    return i.type == 'intersecting' && i.point != null ? [i.point.x, i.point.y] : null;
  }
}