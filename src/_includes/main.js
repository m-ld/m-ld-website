const d3 = require('d3');

const MAGIC_DIV_SCALE = 10 / 9;
const data = [
  { '@id': '12345678', text: 'Hello!', x: 200, y: 100 },
  { '@id': '12445678', text: 'Well hello!', x: 300, y: 300 }
];

window.onload = function () {
  const page = d3.select('#page');
  window.addEventListener('resize', function () {
    // Coerce the viewbox to the aspect ratio of the screen but keep the zoom
    var [vBx, vBy, ,] = getViewBox(), width = window.innerWidth, height = window.innerHeight;
    var [right, bottom] = clientToSvg(width, height);
    setViewBox(vBx, vBy, right - vBx, bottom - vBy);
    setAttr(page, { width, height });
  });
  // Set the initial zoom to zero
  setViewBox(0, 0, window.innerWidth, window.innerHeight);
  setAttr(page, { width: window.innerWidth, height: window.innerHeight });

  page.on('wheel', function () {
    var [mx, my] = clientToSvg(d3.event.clientX, d3.event.clientY);
    // Scale the viewbox such that the mouse position is static
    var [vBx, vBy, vBw, vBh] = getViewBox();
    var px = (mx - vBx) / vBw, py = (my - vBy) / vBh, d = -d3.event.deltaY;
    var p = vBw / vBh, dx = (p * d) / (1 + p), dy = d / (1 + p);
    setViewBox(vBx - (px * dx), vBy - (py * dy), vBw + dx, vBh + dy);
    d3.event.preventDefault();
  });

  const messages = page.selectAll('.message').data(data, d => d ? d['@id'] : this.id);
  const newMessages = messages.enter().select(function () {
    page.node().insertAdjacentHTML('beforeend', `<g class="message" id="@id">
  <rect class="shape" x="0" y="0" width="0" height="0" rx="10" style="fill: lightgrey" />
  <foreignObject class="content" x="0" y="0" width="0" height="0">
    <div xmlns="http://www.w3.org/1999/xhtml" contenteditable="true"
      style="display: inline-block; padding: 15px; white-space: nowrap">
    </div>
  </foreignObject>
</g>`);
    return page.node().lastChild;
  }).attr('id', d => d['@id']);
  newMessages.select('.shape').attr('x', d => d.x).attr('y', d => d.y);
  newMessages.select('.content > div').text(d => d.text).on('input', function (d) {
    d.text = this.textContent;
    sizeToContent.apply(this);
  });
  newMessages.each(sizeToContent);

  function getViewBox() {
    return page.attr('viewBox').split(/[\s,]+/).map(Number);
  }

  function setViewBox(x, y, width, height) {
    if (width > 0 && height > 0)
      page.attr('viewBox', [x, y, width, height].join(' '));
  }

  function setAttr(selection, attrs) {
    for (key in attrs)
      selection.attr(key, attrs[key]);
  }

  function clientToSvg(x, y) {
    var pt = page.node().createSVGPoint();
    pt.x = x;
    pt.y = y;
    pt = pt.matrixTransform(page.node().getScreenCTM().inverse());
    return [pt.x, pt.y];
  }

  function messageParent(node) {
    if (node)
      return d3.select(node).classed('message') ? node : messageParent(node.parentElement)
  }

  function sizeToContent() {
    const message = d3.select(messageParent(this)),
      s = message.select('.shape'),
      c = message.select('.content');
    // Ensure the content is in the same position as the shape
    setAttr(c, { x: s.attr('x'), y: s.attr('y') });
    // Size the shape to the content
    var { left, top, right, bottom } = c.select('div').node().getBoundingClientRect();
    var [left, top] = clientToSvg(left, top), [right, bottom] = clientToSvg(right, bottom);
    var width = (right - left) * MAGIC_DIV_SCALE, height = (bottom - top) * MAGIC_DIV_SCALE;
    setAttr(s, { width, height });
    setAttr(c, { width, height });
  }
}