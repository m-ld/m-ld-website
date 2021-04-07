import * as d3 from 'd3';
import { setAttr, d3Selection, node, fromTemplate } from './d3Util';
import { BoardView } from './BoardView';
import { Rectangle } from '../Shapes';
import { GroupView } from './D3View';
import { LinkView } from './LinkView';
import { MIN_MESSAGE_SIZE } from '../BoardIndex';
import { MessageSubject, MessageItem } from '../Message';
import { HtmlList } from './HtmlList';

/** @see https://github.com/d3/d3-selection#local-variables */
const VIEW_LOCAL = d3.local<MessageView>();

export class MessageView extends GroupView {
  /** @see {@link msg} */
  private _msg: MessageItem;
  readonly content: HtmlList;

  /**
   * Must be followed by a call to {@link update}, to initialise message
   * content.
   * @param id identity of the Message being viewed
   */
  constructor(
    readonly src: MessageSubject,
    readonly boardView: BoardView) {
    super(fromTemplate<SVGGElement>('board-message'));
    // We don't yet know the message size
    this._msg = new MessageItem(src);
    this.d3.classed('board-message', true).attr('id', src['@id']);
    this.box.classed('new-message', true);
    this.content = new HtmlList(this.body.select('div'));
    this.content.element.id = MessageSubject.textId(src['@id']);
    VIEW_LOCAL.set(this.element, this);
  }

  /**
   * @param node any child node of a message view node
   * @returns the child's parent message view
   */
  static get(node: Element) {
    return VIEW_LOCAL.get(node);
  }

  /**
   * Canonicalised Message being viewed, with conflicts resolved. This lags the
   * actual view content while the model is being updated, until {@link update}
   * is called.
   */
  get msg() {
    return this._msg;
  }

  get box(): d3Selection<SVGRectElement> {
    return this.d3.select('.board-message-box');
  }

  get body(): d3Selection<SVGForeignObjectElement> {
    return this.d3.select('.board-message-body');
  }

  getButton(name: 'close' | 'add' | 'move' | 'code') {
    return this.d3.select(`.board-message-${name} circle`);
  }

  async update(dirty?: 'dirty'): Promise<void> {
    if (dirty) {
      // This will also update the nested list
      this._msg = new MessageItem(this.src);
      // Detect if the message has become invalid (deleted)
      if (this._msg.deleted) {
        this.d3.remove();
        // Remove all link-lines from and to the removed message
        LinkView.remove(this.allOutLinks);
        LinkView.remove(this.allInLinks);
        return; // Nothing else to do
      } else {
        // Update the visible text
        this.content.update(this._msg.textList);
        // Update the position
        this.position = this._msg.position;
      }
    }
    // We push the re-sizing to at least the next frame because Firefox
    // sometimes hasn't updated the bounding client rect yet.
    const images = this.content.d3.selectAll<HTMLImageElement, unknown>('img').nodes();
    if (images.length)
      await Promise.all(images.map(img =>
        img.complete ? Promise.resolve() : new Promise((resolve, reject) => {
          img.addEventListener('load', resolve);
          img.addEventListener('error', resolve); // Ignore failed image load
        })));
    else
      await new Promise(resolve => window.requestAnimationFrame(resolve));

    // Size the shape to the content
    const textRect = this.boardView.svgRect(this.content.element);
    // Chromium bug: The computed effective zoom is currently force-set to 1.0
    // for foreignObjects. We can detect by comparing the body to the box,
    // because they are locked to having the same width attributes.
    // https://bugs.chromium.org/p/chromium/issues/detail?id=976224
    const zoomScale = navigator.userAgent.indexOf("AppleWebKit") > -1 ?
      node(this.box).getBoundingClientRect().width /
      node(this.body).getBoundingClientRect().width : 1;

    const [minWidth, minHeight] = MIN_MESSAGE_SIZE;
    const width = Math.max(textRect.width * zoomScale, minWidth),
      height = Math.max(textRect.height * zoomScale, minHeight);
    setAttr(this.box, { width, height });
    setAttr(this.body, { width, height });
    this._msg = new MessageItem(this.src, [width, height]);

    if (dirty) // i.e. data has changed
      await this.syncLinks();

    // Update the position of all link lines
    this.allOutLinks.forEach(link =>
      this.withThat(link.toId, that => link.update(this.rect, that.rect)));
    this.allInLinks.forEach(link =>
      this.withThat(link.fromId, that => link.update(that.rect, this.rect)));

    // No longer new
    this.box.classed('new-message', false);
  }

  private async syncLinks() {
    const outLinks = this._msg.linkTo.map(ref => ref['@id']);
    // Remove non-existent outbound link-lines
    LinkView.remove(this.allOutLinks.filter(link => !outLinks.includes(link.toId)));
    // Create outbound link-lines if missing
    outLinks.forEach(thatId => this.withThat(thatId, that => this.link(that)));

    const inLinks = await this.boardView.linksTo(this._msg['@id']);
    // Remove non-existent inbound link-lines
    LinkView.remove(this.allInLinks.filter(link_1 => !inLinks.includes(link_1.fromId)));
    // Create inound link-lines if missing
    inLinks.forEach(thatId_2 => this.withThat(thatId_2, that_2 => that_2.link(this)));
  }

  set active(active: boolean) {
    this.d3.classed('active', active);
  }

  get text(): string {
    return this.content.toString();
  }

  private get allOutLinks() {
    return LinkView.fromLinkLines(this.boardView.svg, this._msg['@id']);
  }

  private get allInLinks() {
    return LinkView.toLinkLines(this.boardView.svg, this._msg['@id']);
  }

  private link(that: MessageView) {
    return LinkView.init(this.boardView.svg, this._msg['@id'], that._msg['@id']);
  }

  private withThat(thatId: string, action: (mv: MessageView) => any) {
    return this.boardView.withThatMessage(thatId, action);
  }

  get rect(): Rectangle {
    return new Rectangle(this.position, this.size);
  }

  get size(): [number, number] {
    return [Number(this.box.attr('width')), Number(this.box.attr('height'))];
  }

  static same(mv1?: MessageView, mv2?: MessageView) {
    return (!mv1 && !mv2) || (mv1 && mv2 && mv1._msg['@id'] == mv2._msg['@id']);
  }
}