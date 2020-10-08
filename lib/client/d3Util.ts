import * as d3 from 'd3';

export type SVG = d3.Selection<SVGSVGElement, unknown, HTMLElement, unknown>;

export type d3Selection<E extends d3.BaseType = d3.BaseType, D = unknown> =
  d3.Selection<E, D, d3.BaseType, unknown>;

export function node<E extends d3.BaseType>(selection: d3Selection<E>): E {
  const node = selection.node();
  if (node == null)
    throw new Error('Node expected');
  return node;
}

export function fromTemplate<E extends Element>(type: string): () => E {
  return () => {
    const node = <E>d3.select<E, unknown>(`#${type}-template`).node()?.cloneNode(true);
    if (node == null)
      throw `Missing ${type} template`;
    return node;
  }
}

export function setAttr(selection: d3Selection, attrs: object) {
  Object.entries(attrs).forEach(([key, value]) => selection.attr(key, value));
}

export function getAttr<T>(selection: d3Selection,
  coerce: (attr: string) => T, ...names: string[]): T[] {
  return names.map(name => selection.attr(name)).map(coerce);
}

export function svgPoint(el: SVGElement, [x, y]: [number, number]): SVGPoint {
  const svg = el instanceof SVGSVGElement ? el : el.ownerSVGElement;
  if (svg == null)
    throw new Error('SVG ancestor expected');
  const pt = svg.createSVGPoint();
  pt.x = x;
  pt.y = y;
  return pt;
}

export function svgRound(amount: number, decimals: number = 2) {
  return Number(Math.round(Number(`${amount}e${decimals}`)) + `e-${decimals}`);
}

export function svgParent(el: SVGElement): SVGElement {
  if (el.parentElement instanceof SVGElement)
    return el.parentElement;
  else
    throw new Error('SVG parent expected');
}

export function parentWithClass<T extends Element>(node: Element | null, className: string): T {
  if (node == null)
    throw new Error('Parent expected');
  return d3.select(node).classed(className) ?
    <T>node : parentWithClass(node.parentElement, className);
}

