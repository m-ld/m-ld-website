import * as d3 from 'd3';

export type SVG = d3.Selection<SVGSVGElement, unknown, HTMLElement, unknown>;

export function setAttr(selection: d3.Selection<d3.BaseType, unknown, d3.BaseType, unknown>, attrs: object) {
  Object.entries(attrs).forEach(([key, value]) => {
    selection.attr(key, value);
  });
}

export function getAttr<T>(selection: d3.Selection<d3.BaseType, unknown, d3.BaseType, unknown>,
  coerce: (attr: string) => T, ...names: string[]): T[] {
  return names.map(name => selection.attr(name)).map(coerce);
}

export function svgPoint(el: SVGElement, [x, y]: [number, number]): SVGPoint {
  const svg = el instanceof SVGSVGElement ? el : el.ownerSVGElement;
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
}

export function idNotInFilter(ids: string[]): (this: Element) => boolean {
  return function (this: Element) {
    return !ids.includes(this.id);
  };
}
