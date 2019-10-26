import * as d3 from 'd3';
import { Message } from './Message';
import { setAttr } from './util';

export class BoardView {
  public readonly page: d3.Selection<SVGSVGElement, Message, HTMLElement, unknown>;

  constructor() {
    this.page = d3.select('#page');
    window.onresize = () => {
      // Coerce the viewbox to the aspect ratio of the screen but keep the zoom
      const [vBx, vBy, ,] = this.getViewBox(), [width, height] = BoardView.windowSize();
      const [right, bottom] = this.clientToSvg(width, height);
      this.setViewBox(vBx, vBy, right - vBx, bottom - vBy);
      setAttr(this.page, { width, height });
    };
    // Set the initial zoom to zero
    const [width, height] = BoardView.windowSize();
    this.setViewBox(0, 0, width, height);
    setAttr(this.page, { width, height });
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

  public append(el: Element): Element {
    return this.page.node().insertAdjacentElement('beforeend', el);
  }

  public clientToSvg(x: number, y: number): Array<number> {
    let pt = this.page.node().createSVGPoint();
    pt.x = x;
    pt.y = y;
    pt = pt.matrixTransform(this.page.node().getScreenCTM().inverse());
    return [pt.x, pt.y];
  }

  private getViewBox(): Array<number> {
    return this.page.attr('viewBox').split(/[\s,]+/).map(Number);
  }

  private setViewBox(x: number, y: number, width: number, height: number) {
    if (width > 0 && height > 0)
      this.page.attr('viewBox', [x, y, width, height].join(' '));
  }

  private static windowSize(): Array<number> {
    return [window.innerWidth, window.innerHeight];
  }
}
