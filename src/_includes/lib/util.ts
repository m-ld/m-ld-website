import * as d3 from 'd3';

export function setAttr(selection: d3.Selection<d3.BaseType, unknown, d3.BaseType, unknown>, attrs: object) {
  Object.entries(attrs).forEach(([key, value]) => selection.attr(key, value));
}

export function shortId() {
  var d = new Date().getTime();
  return 'axxxxxxx'.replace(/[ax]/g, function (c) {
    return ((d + Math.random() * 16) % (c == 'a' ? 6 : 16) + (c == 'a' ? 10 : 0) | 0).toString(16);
  });
}