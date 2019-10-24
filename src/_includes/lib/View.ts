import * as d3 from 'd3';
import { Message } from './Message';

const MAGIC_DIV_SCALE: number = 10 / 9;

export class View {
  page: d3.Selection<SVGSVGElement, Message, HTMLElement, unknown>;

  constructor() {
    this.page = d3.select('#page');
    window.onresize = () => {
      // Coerce the viewbox to the aspect ratio of the screen but keep the zoom
      const [vBx, vBy, ,] = this.getViewBox(), width = window.innerWidth, height = window.innerHeight;
      const [right, bottom] = this.clientToSvg(width, height);
      this.setViewBox(vBx, vBy, right - vBx, bottom - vBy);
      View.setAttr(this.page, { width, height });
    };
    // Set the initial zoom to zero
    this.setViewBox(0, 0, window.innerWidth, window.innerHeight);
    View.setAttr(this.page, { width: window.innerWidth, height: window.innerHeight });
    // Set up wheel zoom
    this.page.on('wheel', () => {
      const [mx, my] = this.clientToSvg(d3.event.clientX, d3.event.clientY);
      // Scale the viewbox such that the mouse position is static
      const [vBx, vBy, vBw, vBh] = this.getViewBox();
      const px = (mx - vBx) / vBw, py = (my - vBy) / vBh, d = -d3.event.deltaY;
      const p = vBw / vBh, dx = (p * d) / (1 + p), dy = d / (1 + p);
      this.setViewBox(vBx - (px * dx), vBy - (py * dy), vBw + dx, vBh + dy);
      d3.event.preventDefault();
    });
    // Set up the drag pan
    this.page.call(d3.drag().on('drag', () => {
      const [, , vBw, vBh] = this.getViewBox();
      const [nx, ny] = this.clientToSvg(-d3.event.dx, -d3.event.dy);
      this.setViewBox(nx, ny, vBw, vBh);
    }).filter(() => {
      // Ignore events on child elements
      return document.elementFromPoint(
        d3.event.clientX, d3.event.clientY) == this.page.node();
    }));
  }

  public showMessages(data: Message[]) {
    const enter = this.messageSelection(data).enter().select(() => {
      const msgEl = <Element>(<Element>d3.select('#message-template').node()).cloneNode(true);
      return this.page.node().insertAdjacentElement('beforeend', msgEl);
    }).attr('id', d => d['@id']);
    enter.select('.shape').attr('x', msg => msg.x).attr('y', msg => msg.y);
    let view: View = this;
    enter.select('.content > div').text(msg => msg.text).on('input', function (this: Element, msg) {
      msg.text = this.textContent;
      view.sizeToContent(this);
    });
    enter.each(function (this: Element) {
      view.sizeToContent(this);
    });
  }

  private messageSelection(data: Message[]) {
    return this.page.selectAll('.message').data(data, function (this: Element, msg: Message) {
      return msg ? msg['@id'] : this.id;
    });
  }

  private getViewBox(): Array<number> {
    return this.page.attr('viewBox').split(/[\s,]+/).map(Number);
  }

  private setViewBox(x: number, y: number, width: number, height: number) {
    if (width > 0 && height > 0)
      this.page.attr('viewBox', [x, y, width, height].join(' '));
  }

  private clientToSvg(x: number, y: number): Array<number> {
    let pt = this.page.node().createSVGPoint();
    pt.x = x;
    pt.y = y;
    pt = pt.matrixTransform(this.page.node().getScreenCTM().inverse());
    return [pt.x, pt.y];
  }

  private sizeToContent(node: Element) {
    const messageGroup = d3.select(View.messageParent(node)),
      messageShape = messageGroup.select('.shape'),
      messageContent = messageGroup.select('.content');
    // Ensure the content is in the same position as the shape
    View.setAttr(messageContent, { x: messageShape.attr('x'), y: messageShape.attr('y') });
    const contentDiv = <Element>messageContent.select('div').node();
    // Size the shape to the content
    var { left, top, right, bottom } = contentDiv.getBoundingClientRect();
    var [left, top] = this.clientToSvg(left, top), [right, bottom] = this.clientToSvg(right, bottom);
    var width = (right - left) * MAGIC_DIV_SCALE, height = (bottom - top) * MAGIC_DIV_SCALE;
    View.setAttr(messageShape, { width, height });
    View.setAttr(messageContent, { width, height });
  }

  private static messageParent(node: Element): Element {
    if (node)
      return d3.select(node).classed('message') ? node : View.messageParent(node.parentElement);
  }

  private static setAttr(selection: d3.Selection<d3.BaseType, unknown, d3.BaseType, unknown>, attrs: object) {
    Object.entries(attrs).forEach(([key, value]) => selection.attr(key, value));
  }
}
