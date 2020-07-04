import { SVG, setAttr, d3Selection } from './util';
import { Shape, Line } from './Shapes';
import * as d3 from 'd3';
import { D3View } from './D3View';

export class LinkView extends D3View<SVGLineElement> {
  private constructor(
    readonly d3: d3Selection<SVGLineElement>) {
    super(d3);
  }

  static init(svg: SVG, fromId: string, toId: string) {
    const line = svg.select<SVGLineElement>(`#${LinkView.linkId(fromId, toId)}`);
    return new LinkView(line.empty() ? LinkView.createLinkLine(svg, fromId, toId) : line);
  }

  get fromId(): string {
    return this.d3.attr('id').split('-')[0];
  }

  get toId(): string {
    return this.d3.attr('id').split('-')[1];
  }

  update(fromShape: Shape, toShape: Shape) {
    if (fromShape.area && toShape.area) {
      const centreLine = new Line(fromShape.centre, toShape.centre);
      const begin = fromShape.intersect(centreLine),
        end = toShape.expand(5).intersect(centreLine);
      if (begin.length && end.length) {
        this.d3.attr('visibility', null);
        setAttr(this.d3, new Line(begin[0], end[0]));
      } else { // Messages overlap
        this.d3.attr('visibility', 'hidden');
      }
    }
  }

  static remove(links: LinkView[]) {
    links.forEach(link => link.d3.remove());
  }

  static linkId(fromId: string, toId: string) {
    return `${fromId}-${toId}`;
  }

  static fromLinkLines(svg: SVG, id: string) {
    return svg.selectAll<SVGLineElement, unknown>(`.link-line[id^="${id}-"]`)
      .nodes().map(node => new LinkView(d3.select(node)));
  }

  static toLinkLines(svg: SVG, id: string) {
    return svg.selectAll<SVGLineElement, unknown>(`.link-line[id$="-${id}"]`)
      .nodes().map(node => new LinkView(d3.select(node)));
  }

  private static createLinkLine(svg: SVG, fromId: string, toId: string) {
    return svg.selectAll('#link-lines')
      .append(LinkView.createLinkLineNode)
      .classed('link-line', true)
      .attr('id', LinkView.linkId(fromId, toId));
  }

  private static createLinkLineNode(): SVGLineElement {
    return <SVGLineElement>(<Element>d3.select('#link-line-template').node()).cloneNode(true);
  }
}