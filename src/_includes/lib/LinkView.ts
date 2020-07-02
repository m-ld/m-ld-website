import { SVG, setAttr } from './util';
import { Shape, Line } from './Shapes';
import * as d3 from 'd3';

export class LinkView {
  constructor(
    private readonly svg: SVG,
    readonly fromId: string,
    readonly toId: string) {
  }

  get line() {
    return this.svg.select(`#${LinkView.linkId(this.fromId, this.toId)}`);
  }

  update(fromShape: Shape, toShape: Shape) {
    if (fromShape.area && toShape.area) {
      const link = this.ensureExists();
      const centreLine = new Line(fromShape.centre, toShape.centre);
      const begin = fromShape.intersect(centreLine),
        end = toShape.expand(5).intersect(centreLine);
      if (begin.length && end.length) {
        setAttr(link, new Line(begin[0], end[0]));
      } else { // Messages overlap
        link.remove();
      }
    }
  }

  private ensureExists() {
    const link = this.line;
    if (link.empty()) {
      return this.svg.selectAll('#link-lines')
        .append(LinkView.createLinkLineNode)
        .classed('link-line', true)
        .attr('id', LinkView.linkId(this.fromId, this.toId));
    } else {
      return link;
    }
  }

  static linkIds(id: string): { fromId: string, toId: string } {
    const [fromId, toId] = id.split('-');
    return { fromId, toId };
  }

  static linkId(fromId: string, toId: string) {
    return `${fromId}-${toId}`;
  }

  static createLinkLineNode(): SVGLineElement {
    return <SVGLineElement>(<Element>d3.select('#link-line-template').node()).cloneNode(true);
  }
}