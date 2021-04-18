import * as d3 from 'd3';
import { isStringText, MessageSubject } from '../Message';
import { svgParent, getAttr, d3Selection, node } from './d3Util';
import { InfiniteView } from './InfiniteView';
import { MessageView } from './MessageView';
import { GroupView } from './D3View';
import { Rectangle, Circle, Shape, Line } from '../Shapes';
import {
  MeldClone, asSubjectUpdates, SubjectUpdates, includesValue, SubjectUpdater
} from '@m-ld/m-ld';
import { shortId, Select, Update, Reference } from '@m-ld/m-ld';
import { LinkView } from './LinkView';
import { showError, showInfo, showWarning } from './PopupControls';
import { BoardBushIndex, BoardIndex } from '../BoardIndex';
import { HtmlListUpdate } from './HtmlList';
import { debounce, tap } from 'rxjs/operators';
import { fromEvent } from 'rxjs';

const CLICK_DRAG_DISTANCE = 3;

export class BoardView extends InfiniteView {
  private readonly _index: BoardBushIndex = new BoardBushIndex();

  constructor(
    selectSvg: string,
    private readonly model: MeldClone,
    private readonly welcomeId: string) {
    super(selectSvg);

    model.read(async state => {
      try {
        const last = await MessageSubject.load(state).pipe(tap(src =>
          this.updateMessageView(this.addMessageView(src)))).toPromise();
        if (last != null && this.zoomToExtent())
          showInfo('Tip: You can look more closely by double-clicking.');
      } catch (err) {
        showError(err);
      }
    }, update => {
      // Construct subject updates from the group updates
      this.updateView(asSubjectUpdates(update));
    });

    this.codeDialog.select('.delete').on('click', () => this.hideCode());
  }

  async linksTo(id: string): Promise<string[]> {
    const selection = await this.model.read<Select>({
      '@select': '?s', '@where': { '@id': '?s', linkTo: { '@id': id } }
    });
    return selection.map(values => (values['?s'] as Reference)['@id']);
  }

  get contentExtent(): DOMRect {
    return node(this.messageGroup).getBBox();
  }

  get index(): BoardIndex {
    return this._index;
  }

  private updateView(updates: SubjectUpdates) {
    const updater = new SubjectUpdater(updates);
    Object.keys(updates).forEach(id => {
      const insert = updates[id]['@insert'];
      // An updated Subject can be a Message or a message text List. Since both
      // may be in the same set of updates, keep track of which message views
      // are affected so we don't double-spend.
      const updated = this.withThatMessage(id, mv => {
        updater.update(mv.src);
        this.updateMessageView(mv);
      });
      if (updated.empty() && insert != null && insert['@type'] === 'Message') {
        // A message we haven't seen before
        const src = updater.update(MessageSubject.create({ '@id': id }));
        const mv = this.addMessageView(src);
        this.updateMessageView(mv);
        if (id === this.welcomeId)
          this.forceEditFocus(mv, false);
      }
    });
  }

  private updateMessageView(mv: MessageView) {
    // Update the index when the message view has re-sized itself
    mv.update('dirty').then(() => this._index.update(mv.msg)).catch(showWarning);
  }

  private addMessageView(src: MessageSubject) {
    const mv = new MessageView(src, this);
    node(this.messageGroup).insertAdjacentElement('beforeend', mv.element);
    mv.body
      // The contenteditable div can be smaller than the body
      .on('mousedown', () => this.forceEditFocus(mv))
      .on('touchstart', () => this.forceEditFocus(mv));
    // Ensure that text updates don't overlap
    fromEvent<HtmlListUpdate>(mv.content, 'update').pipe(
      debounce(update => this.inputChange(mv, update))).subscribe();
    mv.content.d3
      .on('focus', () => this.inputStart(mv))
      .on('keydown', () => this.inputKey(mv))
      .on('blur', () => this.inputEnd(mv));
    mv.getButton('close')
      .on('mouseover', () => this.setRemoving(mv, true))
      .on('mouseleave', () => this.setRemoving(mv, false))
      .on('click', () => this.removeMessage(mv, true))
      .call(this.setupBtnDrag(this.unlinkDragStart, this.unlinkDragging, this.unlinkDragEnd));
    mv.getButton('add')
      .on('click', () => this.addNewMessage(mv))
      .call(this.setupBtnDrag(this.btnDragStart, this.linkDragging, this.linkDragEnd));
    mv.getButton('move').call(d3.drag()
      .container(node(this.svg))
      .on('start', this.withThisMessage(this.moveDragStart))
      .on('drag', this.withThisMessage(this.moveDragging))
      .on('end', this.withThisMessage(this.moveDragEnd)));
    mv.getButton('code')
      .on('click', () => this.showCode(mv));
    return mv;
  }

  private showCode(mv: MessageView) {
    this.codeDialog.classed('is-active', true)
      .select('.jsonld').text(JSON.stringify(mv.src, null, 2));
  }

  private hideCode() {
    this.codeDialog.classed('is-active', false);
  }

  private get codeDialog() {
    return d3.select('#board-message-code');
  }

  private forceEditFocus(mv: MessageView, selectText = true) {
    const div = mv.content.element;
    if (document.activeElement !== div) {
      // Raise early to prevent the focus handler raise from causing a blur
      mv.d3.raise();
      div.focus();
      if (selectText)
        document.execCommand('selectAll');
      if (d3.event != null)
        d3.event.preventDefault();
    }
  }

  private setRemoving(mv: MessageView, removing: boolean) {
    if (!mv.box.classed('button-dragging') && mv.msg['@id'] !== this.welcomeId) {
      mv.box.classed('remove-target', removing);
      mv.msg.linkTo.forEach(linkedId => this.withThatMessage(linkedId['@id'], mv =>
        this.setDeepRemoving(mv, removing)));
      const removeKeyEvents = 'keydown.remove keyup.remove';
      if (removing)
        d3.select(document).on(removeKeyEvents, () => this.setRemoving(mv, true));
      else
        d3.select(document).on(removeKeyEvents, null);
    }
  }

  private setDeepRemoving(mv: MessageView, removing: boolean): any {
    return mv.box.classed('remove-target',
      removing && d3.event.shiftKey && mv.msg['@id'] !== this.welcomeId);
  }

  private setupBtnDrag(
    dragStart: (mv: MessageView, dragged: SVGElement) => void,
    dragging: (mv: MessageView) => void,
    dragEnd: (mv: MessageView, dragged: SVGElement) => void): (selection: d3Selection) => void {
    return d3.drag() // Set up drag-to-link behaviour
      .container(node(this.svg))
      .clickDistance(CLICK_DRAG_DISTANCE) // Ensure that single-click hits click handler
      .subject(this.withThisMessage(this.btnDragSubject))
      .on('start', this.withThisMessage(dragStart))
      .on('drag', this.withThisMessage(dragging))
      .on('end', this.withThisMessage(dragEnd));
  }

  private async inputChange(mv: MessageView, listUpdate: HtmlListUpdate): Promise<unknown> {
    // Immediately update the message's size to accommodate the input
    mv.update();
    if (mv.src.text != null) {
      const update: Update = isStringText(mv.src.text) ? {
        '@delete': { '@id': mv.src['@id'], text: mv.src.text },
        '@insert': { '@id': mv.src['@id'], text: mv.content.toString() }
      } : {
        '@delete': { '@id': mv.src.text['@id'], '@list': listUpdate['@delete'] },
        '@insert': { '@id': mv.src.text['@id'], '@list': listUpdate['@insert'] }
      };
      return this.model.write(update);
    }
  }

  private inputStart(mv: MessageView) {
    mv.d3.raise();
    mv.active = true;
  }

  private inputKey(mv: MessageView) {
    if (d3.event.key === 'Enter' && d3.event.ctrlKey) {
      mv.content.element.blur();
      d3.event.preventDefault();
    } else if (d3.event.key === 'Tab') {
      this.addNewMessage(mv);
      d3.event.preventDefault();
    }
  }

  private inputEnd(mv: MessageView) {
    mv.active = false;
  }

  private moveDragStart(_: MessageView, dragged: SVGElement) {
    d3.select(dragged).attr('cursor', 'none');
  }

  private moveDragging(mv: MessageView) {
    // Do not modify the message data here, just the visual location
    const [x, y] = mv.position;
    mv.d3.raise();
    mv.position = [x + d3.event.dx, y + d3.event.dy];
    mv.update(); // To keep the lines attached
  }

  private moveDragEnd(mv: MessageView, dragged: SVGElement) {
    d3.select(dragged).attr('cursor', 'grab');
    // Commit the change to the message
    const [x, y] = mv.position;
    this.model.write<Update>({
      '@delete': { '@id': mv.msg['@id'], x: mv.src.x, y: mv.src.y },
      '@insert': { '@id': mv.msg['@id'], x, y }
    }).catch(showWarning);
  }

  private btnDragSubject(mv: MessageView, dragged: SVGElement): DragSubject {
    const button = new GroupView(<SVGGElement>svgParent(dragged)), startPos = button.position;
    return {
      button, startPos, cursor: d3.select(dragged).attr('cursor'),
      link: LinkView.init(this.svg, mv.msg['@id'], shortId())
    };
  }

  private btnDragStart(mv: MessageView, dragged: SVGElement) {
    d3.select(dragged).attr('cursor', 'none');
    mv.box.classed('button-dragging', true);
    mv.active = true;
  }

  private linkDragging(mv: MessageView) {
    this.btnDragging(
      mv, thatId => thatId != mv.msg['@id'] &&
        !includesValue(mv.src, 'linkTo', { '@id': thatId }), 'link-target');
  }

  private linkDragEnd(mv: MessageView, dragged: SVGElement) {
    this.btnDragEnd(dragged, mv, (thatId, position) => {
      if (thatId != null) {
        this.model.write<Update>({
          '@insert': { '@id': mv.msg['@id'], linkTo: { '@id': thatId } }
        }).catch(showWarning);
      } else {
        this.addNewMessage(mv, position);
      }
    }, 'link-target');
  }

  private unlinkDragging(mv: MessageView) {
    this.btnDragging(
      mv, thatId => thatId != mv.msg['@id'] &&
        includesValue(mv.src, 'linkTo', { '@id': thatId }), 'remove-target');
  }

  private unlinkDragStart(mv: MessageView, dragged: SVGElement) {
    this.setRemoving(mv, false);
    this.btnDragStart(mv, dragged);
  }

  private unlinkDragEnd(mv: MessageView, dragged: SVGElement) {
    this.btnDragEnd(dragged, mv, thatId => {
      if (thatId != null) {
        this.model.write<Update>({
          '@delete': { '@id': mv.msg['@id'], linkTo: { '@id': thatId } }
        }).catch(showWarning);
      }
    }, 'remove-target');
  }

  private btnDragging(mv: MessageView, filter: (thatId: string) => boolean, targetClass: string) {
    mv.d3.raise(); // So that the button drags over other messages
    const drag: DragSubject = d3.event.subject, [cx, cy] = drag.button.position;
    drag.button.position = [cx + d3.event.dx, cy + d3.event.dy];
    // Hit-test for other messages
    const target = this.hitTest(this.svgRect(node(drag.button.d3)), filter);
    this.updateDragLink(drag, mv, targetClass, target);
    if (!MessageView.same(drag.target, target)) {
      if (target)
        target.box.classed(targetClass, true);
      if (drag.target)
        drag.target.box.classed(targetClass, false);
    }
    drag.target = target;
  }

  private updateDragLink(
    drag: DragSubject, mv: MessageView, targetClass: string, target?: MessageView) {
    let toShape: Shape;
    if (target != null) {
      toShape = target.rect;
    } else {
      const [x, y] = this.svgRect(node(drag.button.d3)).topLeft;
      const [r] = getAttr(drag.button.d3.select('circle'), Number, 'r');
      toShape = new Circle([x + r, y + r], r);
    }
    drag.link.update(mv.rect, toShape);
    drag.link.d3.classed(targetClass, true);
    drag.link.d3.raise();
  }

  private btnDragEnd(
    dragged: SVGElement,
    mv: MessageView,
    commit: (thatId: string | null, position: [number, number]) => void,
    targetClass: string) {
    const drag: DragSubject = d3.event.subject;
    d3.select(dragged).attr('cursor', drag.cursor);
    if (drag.target)
      drag.target.box.classed(targetClass, false);
    if (new Line(drag.startPos, drag.button.position).length > CLICK_DRAG_DISTANCE)
      commit(drag.target ? drag.target.msg['@id'] : null,
        this.svgRect(node(drag.button.d3)).topLeft);
    drag.link.d3.remove();
    drag.button.position = drag.startPos;
    mv.box.classed('button-dragging', false);
    mv.active = false;
  }

  private addNewMessage(from: MessageView, position?: [number, number]) {
    const [x, y] = position ?? this.index.findSpace(from.msg);
    const newMessage = MessageSubject.create({
      text: '', x, y, linkTo: []
    });
    const newLink: Partial<MessageSubject> = {
      '@id': from.msg['@id'], linkTo: [{ '@id': newMessage['@id'] }]
    };
    this.model.write<Update>({ '@insert': [newMessage, newLink] })
      // Yield to the event loop so that we have definitely processed the update
      .then(() => new Promise(done => setTimeout(done)))
      .then(() => this.withThatMessage(newMessage['@id'],
        mv => mv.content.element.focus()), showWarning);
  }

  private removeMessage(mv: MessageView, top: boolean) {
    if (mv.msg['@id'] !== this.welcomeId) {
      MessageSubject.remove(this.model, mv.src);
      if (top && d3.event.shiftKey) {
        mv.msg.linkTo.forEach(linked =>
          this.withThatMessage(linked['@id'], mv => this.removeMessage(mv, false)));
      }
    } else if (top) {
      showWarning("Sorry, you can't delete the welcome message");
    }
  }

  hitTest(test: Rectangle, filter: (id: string) => boolean): MessageView | undefined {
    const found = this._index.search(test).filter(msg => filter(msg['@id']))[0];
    return found && MessageView.get(node(this.d3ById(found['@id'])));
  }

  withThisMessage(action: (mv: MessageView, el: SVGElement) => any): (this: Element) => any {
    const bv = this;
    return function (this: SVGElement) {
      // Note `this` could be a child of the message view node
      return action.call(bv, MessageView.get(this), this);
    }
  }

  withThatMessage(thatId: string, action: (mv: MessageView) => any) {
    return this.d3ById(thatId).each(this.withThisMessage(action));
  }

  private d3ById(thatId: string): d3Selection<Element> {
    try {
      return this.svg.select<Element>(`#${thatId}`);
    } catch (err) {
      if (err instanceof DOMException)
        return <d3Selection<Element>><unknown>this.svg.select(null);
      else
        throw err;
    }
  }

  private get messageGroup() {
    return this.svg.select<SVGGElement>('#messages');
  }
}

interface DragSubject {
  button: GroupView;
  startPos: [number, number];
  cursor: string;
  target?: MessageView;
  link: LinkView;
}