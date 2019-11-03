import * as d3 from 'd3';
import { Message } from './Message';
import { setAttr } from './util';
import { Board } from './Board';

export class BoardView {
  readonly board: Board;
  readonly svg: d3.Selection<SVGSVGElement, Message, HTMLElement, unknown>;

  constructor(selector: string, board: Board) {
    this.board = board;
    this.svg = d3.select(selector);
    window.onresize = () => {
      // Coerce the viewbox to the aspect ratio of the screen but keep the zoom
      const [vBx, vBy, ,] = this.getViewBox(), [width, height] = BoardView.windowSize();
      const [right, bottom] = this.clientToSvg(width, height);
      this.setViewBox(vBx, vBy, right - vBx, bottom - vBy);
      setAttr(this.svg, { width, height });
    };
    // Set the initial zoom to zero
    const [width, height] = BoardView.windowSize();
    this.setViewBox(0, 0, width, height);
    setAttr(this.svg, { width, height });
    // Set up wheel zoom
    this.svg.on('wheel', () => {
      const [mx, my] = this.clientToSvg(d3.event.clientX, d3.event.clientY);
      // Scale the viewbox such that the mouse position is static
      const [vBx, vBy, vBw, vBh] = this.getViewBox();
      const px = (mx - vBx) / vBw, py = (my - vBy) / vBh, d = -d3.event.deltaY;
      const p = vBw / vBh, dx = (p * d) / (1 + p), dy = d / (1 + p);
      this.setViewBox(vBx - (px * dx), vBy - (py * dy), vBw + dx, vBh + dy);
      d3.event.preventDefault();
    });
    // Set up the drag pan
    this.svg.call(d3.drag().on('drag', () => {
      const [, , vBw, vBh] = this.getViewBox();
      const [nx, ny] = this.clientToSvg(-d3.event.dx, -d3.event.dy);
      this.setViewBox(nx, ny, vBw, vBh);
    }).filter(() => {
      // Ignore events on child elements
      return document.elementFromPoint(
        d3.event.clientX, d3.event.clientY) == this.svg.node();
    }));
  }

  public append(el: Element): Element {
    return this.svg.node().insertAdjacentElement('beforeend', el);
  }

  public clientToSvg(x: number, y: number): Array<number> {
    let pt = this.svg.node().createSVGPoint();
    pt.x = x;
    pt.y = y;
    pt = pt.matrixTransform(this.svg.node().getScreenCTM().inverse());
    return [pt.x, pt.y];
  }

  private getViewBox(): Array<number> {
    return this.svg.attr('viewBox').split(/[\s,]+/).map(Number);
  }

  private setViewBox(x: number, y: number, width: number, height: number) {
    if (width > 0 && height > 0)
      this.svg.attr('viewBox', [x, y, width, height].join(' '));
  }

  private static windowSize(): Array<number> {
    return [window.innerWidth, window.innerHeight];
  }
}
