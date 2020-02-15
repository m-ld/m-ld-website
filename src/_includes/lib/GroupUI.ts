import * as d3 from 'd3';
import { svgPoint, svgRound } from './util';

export class GroupUI<D = any> {
  readonly group: d3.Selection<SVGGElement, D, HTMLElement, unknown>;

  constructor(node: SVGGElement) {
    this.group = d3.select(node);
  }

  get position(): [number, number] {
    const pos = this.group.attr('transform')
      .match(/translate\(([-0-9\.]+),\s+([-0-9\.]+)\)/)
      .slice(1).map(Number);
    return [pos[0], pos[1]];
  }

  set position([x, y]: [number, number]) {
    this.group.attr('transform', `translate(${x}, ${y})`);
  }
}