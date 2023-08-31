import * as d3 from 'd3';
import { d3Selection, fromTemplate, node, setAttr } from './d3Util';
import { BoardView } from './BoardView';
import { Rectangle } from '../Shapes';
import { GroupView } from './D3View';
import { LinkView } from './LinkView';
import { MessageRect, MIN_MESSAGE_SIZE } from '../BoardIndex';
import { ElementSpliceText } from '@m-ld/m-ld/ext/html';
import { GraphSubject, propertyValue, Reference, SubjectLike } from '@m-ld/m-ld';

/** @see https://github.com/d3/d3-selection#local-variables */
const VIEW_LOCAL = d3.local<MessageView>();

export class MessageView extends GroupView {
  readonly src: SubjectLike & Reference;

  /**
   * Must be followed by a call to {@link update}, to initialise message
   * content.
   */
  constructor(
    src: GraphSubject,
    readonly boardView: BoardView
  ) {
    super(fromTemplate<SVGGElement>('board-message'));
    const mv = this;
    let textContent: ElementSpliceText<HTMLDivElement>;
    this.src = Object.assign({
      get text() {
        return textContent;
      },
      set text(text: string | ElementSpliceText<HTMLDivElement>) {
        if (typeof text == 'string') {
          textContent = new ElementSpliceText(
            node(mv.content),
            propertyValue(src, 'text', String),
            splices => boardView.updateMessage(mv, splices)
          );
          textContent.element.id = `${src['@id']}_text`;
        }
      }
    }, src);
    this.d3.classed('board-message', true).attr('id', src['@id']);
    this.box.classed('new-message', true);
    VIEW_LOCAL.set(this.element, this);
  }

  /**
   * @param node any child node of a message view node
   * @returns the child's parent message view
   */
  static get(node: Element) {
    return VIEW_LOCAL.get(node);
  }

  get box(): d3Selection<SVGRectElement> {
    return this.d3.select('.board-message-box');
  }

  get body(): d3Selection<SVGForeignObjectElement> {
    return this.d3.select('.board-message-body');
  }

  get content(): d3Selection<HTMLDivElement> {
    return this.body.select('div');
  }

  getButton(name: 'close' | 'add' | 'move' | 'code') {
    return this.d3.select(`.board-message-${name} circle`);
  }

  get deleted() {
    return this.src['@type'] == null;
  }

  get linkTo(): Reference[] {
    return propertyValue(this.src, 'linkTo', Array, Reference);
  }

  async update(dataChanged = false): Promise<void> {
    if (dataChanged) {
      // Detect if the message has become invalid (deleted)
      if (this.deleted) {
        this.d3.remove();
        // Remove all link-lines from and to the removed message
        LinkView.remove(this.allOutLinks);
        LinkView.remove(this.allInLinks);
        return; // Nothing else to do
      }
      // Update the position
      this.position = [
        Math.min(...propertyValue(this.src, 'x', Array, Number)),
        Math.min(...propertyValue(this.src, 'y', Array, Number))
      ];
    }
    // Size the shape to the content
    const textRect = this.boardView.svgRect(node(this.content));
    // Chromium bug: The computed effective zoom is currently force-set to 1.0
    // for foreignObjects. We can detect by comparing the body to the box,
    // because they are locked to having the same width attributes.
    // https://bugs.chromium.org/p/chromium/issues/detail?id=976224
    const zoomScale = navigator.userAgent.indexOf('AppleWebKit') > -1 ?
      node(this.box).getBoundingClientRect().width /
      node(this.body).getBoundingClientRect().width : 1;

    const [minWidth, minHeight] = MIN_MESSAGE_SIZE;
    const width = Math.max(textRect.width * zoomScale, minWidth),
      height = Math.max(textRect.height * zoomScale, minHeight);
    setAttr(this.box, { width, height });
    setAttr(this.body, { width, height });

    if (dataChanged)
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
    const outLinks = this.linkTo.map(ref => ref['@id']);
    // Remove non-existent outbound link-lines
    LinkView.remove(this.allOutLinks.filter(link => !outLinks.includes(link.toId)));
    // Create outbound link-lines if missing
    outLinks.forEach(thatId => this.withThat(thatId, that => this.link(that)));

    const inLinks = await this.boardView.linksTo(this.src['@id']);
    // Remove non-existent inbound link-lines
    LinkView.remove(this.allInLinks.filter(link_1 => !inLinks.includes(link_1.fromId)));
    // Create inbound link-lines if missing
    inLinks.forEach(thatId_2 => this.withThat(thatId_2, that_2 => that_2.link(this)));
  }

  set active(active: boolean) {
    this.d3.classed('active', active);
  }

  get text(): string {
    return node(this.content).textContent ?? '';
  }

  private get allOutLinks() {
    return LinkView.fromLinkLines(this.boardView.svg, this.src['@id']);
  }

  private get allInLinks() {
    return LinkView.toLinkLines(this.boardView.svg, this.src['@id']);
  }

  private link(that: MessageView) {
    return LinkView.init(this.boardView.svg, this.src['@id'], that.src['@id']);
  }

  private withThat(thatId: string, action: (mv: MessageView) => any) {
    return this.boardView.withThatMessage(thatId, action);
  }

  get rect(): MessageRect {
    const mv = this;
    // noinspection JSUnusedGlobalSymbols - incorrect warning
    return new class extends Rectangle {
      '@id' = mv.src['@id'];
      deleted = mv.deleted;
    }(this.position, this.size);
  }

  get size(): [number, number] {
    return [Number(this.box.attr('width')), Number(this.box.attr('height'))];
  }

  static same(mv1?: MessageView, mv2?: MessageView) {
    return (!mv1 && !mv2) || (mv1 && mv2 && mv1.src['@id'] === mv2.src['@id']);
  }
}