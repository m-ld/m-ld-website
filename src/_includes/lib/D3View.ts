import * as d3 from 'd3';
import { d3Selection } from './util';

export class D3View<E extends Element = Element, D = unknown> {
  constructor(
    readonly d3: d3Selection<E, D>) {
  }

  get element(): E {
    const element = this.d3.node();
    if (element == null)
      throw new Error('Missing element');
    return element;
  }
}

export class GroupView<D = unknown> extends D3View<SVGGElement, D> {
  constructor(node: SVGGElement) {
    super(d3.select(node));
  }

  get position(): [number, number] {
    const match = this.d3.attr('transform')
      .match(/translate\(([-0-9\.]+),\s+([-0-9\.]+)\)/);
    const pos = match?.slice(1).map(Number) ?? [];
    return [pos[0], pos[1]];
  }

  set position([x, y]: [number, number]) {
    if (validCoordinate(x, y))
      this.d3.attr('transform', `translate(${x}, ${y})`);
  }
}

function validCoordinate(...cs: number[]): boolean {
  return cs.every(c => {
    const ok = Number.isFinite(c) && !Number.isNaN(c);
    if (!ok) {
      console.warn(`Coordinate ${c} is not valid`);
      debugger;
    }
    return ok;
  });
}