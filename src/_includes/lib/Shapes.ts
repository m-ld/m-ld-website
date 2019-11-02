const { checkIntersection } = require('line-intersect');

export class Rectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;

  constructor([x, y]: number[], [width, height]: number[]) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  size(): number[] {
    return [this.width, this.height];
  }

  area(): number {
    return this.width * this.height;
  }

  centre(): number[] {
    return [this.x + this.width / 2, this.y + this.height / 2];
  }

  sides(): Line[] {
    return [this.top(), this.right(), this.bottom(), this.left()];
  }

  intersect(line: Line): number[][] {
    return this.sides().map(side => side.intersect(line)).filter(point => point);
  }

  left(): Line {
    return new Line(this.bottomLeft(), this.topLeft());
  }

  bottom(): Line {
    return new Line(this.bottomRight(), this.bottomLeft());
  }

  right(): Line {
    return new Line(this.topRight(), this.bottomRight());
  }

  top(): Line {
    return new Line(this.topLeft(), this.topRight());
  }

  topLeft(): number[] {
    return [this.x, this.y];
  }

  bottomLeft(): number[] {
    return [this.x, this.y + this.height];
  }

  bottomRight(): number[] {
    return [this.x + this.width, this.y + this.height];
  }

  topRight(): number[] {
    return [this.x + this.width, this.y];
  }
}

export class Line {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;

  constructor([x1, y1]: number[], [x2, y2]: number[]) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
  }

  intersect(that: Line): number[] {
    let i = checkIntersection(this.x1, this.y1, this.x2, this.y2, that.x1, that.y1, that.x2, that.y2);
    return i.type == 'intersecting' ? [i.point.x, i.point.y] : null;
  }
}