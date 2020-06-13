import * as d3 from 'd3';
import { setAttr, svgPoint, SVG } from './util';
import { Rectangle } from './Shapes';

export abstract class InfiniteView {
  readonly svg: SVG;

  constructor(selectSvg: string) {
    this.svg = d3.select(selectSvg);
    window.onresize = () => {
      // Coerce the viewbox to the aspect ratio of the screen but keep the zoom
      const [vBx, vBy, ,] = this.getViewBox(), [width, height] = windowSize();
      const [right, bottom] = this.clientToSvg([width, height]);
      this.setViewBox([vBx, vBy], [right - vBx, bottom - vBy]);
      setAttr(this.svg, { width, height });
    };
    // Set the initial zoom to zero
    const [width, height] = windowSize();
    this.setViewBox([0, 0], [width, height]);
    setAttr(this.svg, { width, height });
    // Set up wheel zoom
    this.svg.on('wheel', () => {
      this.zoom(this.clientToSvg([d3.event.clientX, d3.event.clientY]), -d3.event.deltaY);
      d3.event.preventDefault();
    });
    // Set up double-click to zoom
    this.svg.on('dblclick', () => {
      if (d3.event.shiftKey) {
        // Shift double-click to see everything.
        this.zoomToExtent();
      } else {
        // Double-click to return to 1:1 zoom.
        this.zoom(this.clientToSvg([d3.event.clientX, d3.event.clientY]));
      }
      d3.event.preventDefault();
    });
    // Zoom controls, if present
    d3.select('#reset-zoom').on('click', () => {
      const { x, y, width, height } = this.contentExtent;
      this.zoom(new Rectangle([x, y], [width, height]).centre);
    });
    d3.select('#zoom-all').on('click', () => this.zoomToExtent());
    // Set up the drag pan
    this.svg.call(d3.drag().on('drag', () => {
      const [, , vBw, vBh] = this.getViewBox();
      const [nx, ny] = this.clientToSvg([-d3.event.dx, -d3.event.dy]);
      this.setViewBox([nx, ny], [vBw, vBh]);
    }).filter(() => {
      // Ignore events on child elements
      return document.elementFromPoint(
        d3.event.clientX, d3.event.clientY) == this.svg.node();
    }));
  }

  clientToSvg([x, y]: [number, number]): [number, number] {
    const pt = svgPoint(this.svg.node(), [x, y]).matrixTransform(this.svg.node().getScreenCTM().inverse());
    return [pt.x, pt.y];
  }

  svgRect(el: Element): Rectangle {
    var { left, top, right, bottom } = el.getBoundingClientRect();
    var [left, top] = this.clientToSvg([left, top]),
      [right, bottom] = this.clientToSvg([right, bottom]);
    return new Rectangle([left, top], [right - left, bottom - top]);
  }

  zoom([x, y]: [number, number], z?: number) {
    const [vBx, vBy, vBw, vBh] = this.getViewBox(), p = vBw / vBh;
    if (z == null) {
      // Zoom to 100%. We want the viewBox width to equal the window width.
      const [width,] = windowSize();
      // TODO: This was reverse-engineered from the below. Improve.
      z = (width - vBw) * (1 + p) / p;
    }
    // Scale the viewbox such that the mouse position is static
    const px = (x - vBx) / vBw, py = (y - vBy) / vBh;
    const dx = (p * z) / (1 + p), dy = z / (1 + p);
    this.setViewBox([vBx - (px * dx), vBy - (py * dy)], [vBw + dx, vBh + dy]);
  }

  zoomToExtent() {
    // We want the viewbox to contain the content extent, but not more
    // zoomed than 100% (i.e. window size).
    const { x, y, width: cw, height: ch } = this.contentExtent;
    const [ww, wh] = windowSize(), pw = ww / wh;
    const w = Math.max(ww, cw), h = Math.max(wh, ch), p = w / h;
    const vBw = pw > p ? w * pw / p : w, vBh = pw > p ? h : h * pw / p;
    this.setViewBox([x - (vBw - cw) / 2, y - (vBh - ch) / 2], [vBw, vBh]);
  }

  protected abstract get contentExtent(): DOMRect;

  private getViewBox(): number[] {
    return this.svg.attr('viewBox').split(/[\s,]+/).map(Number);
  }

  private setViewBox([x, y]: [number, number], [width, height]: [number, number]) {
    if (width > 0 && height > 0)
      this.svg.attr('viewBox', [x, y, width, height].join(' '));
  }
}

function windowSize(): [number, number] {
  return [window.innerWidth, window.innerHeight];
}
