import * as d3 from 'd3';

export function setAttr(selection: d3.Selection<d3.BaseType, unknown, d3.BaseType, unknown>, attrs: object) {
  Object.entries(attrs).forEach(([key, value]) => selection.attr(key, value));
}