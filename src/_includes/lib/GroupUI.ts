import * as d3 from 'd3';

export class GroupUI<D = unknown> {
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
    if (validCoordinate(x, y))
      this.group.attr('transform', `translate(${x}, ${y})`);
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