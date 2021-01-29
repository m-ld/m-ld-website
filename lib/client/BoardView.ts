import * as d3 from 'd3';
import { Message } from '../Message';
import { svgParent, getAttr, d3Selection, node } from './d3Util';
import { InfiniteView } from './InfiniteView';
import { MessageView } from './MessageView';
import { GroupView } from './D3View';
import { Rectangle, Circle, Shape, Line } from '../Shapes';
import { MeldClone, asSubjectUpdates, SubjectUpdates, updateSubject, includesValue } from '@m-ld/m-ld';
import { shortId, Subject, Select, Describe, Update, Reference, Resource } from '@m-ld/m-ld';
import { LinkView } from './LinkView';
import { showError, showInfo, showWarning } from './PopupControls';
import { BoardBushIndex, BoardIndex } from '../BoardIndex';

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
        const messages = await state.read<Describe, Message>({
          '@describe': '?s',
          '@where': { '@id': '?s', '@type': 'Message' }
        });
        const anyMessages = this.updateView(asSubjectUpdates({
          '@insert': messages, '@delete': []
        }));
        if (anyMessages && this.zoomToExtent())
          showInfo('Tip: You can look more closely by double-clicking.');
      } catch (err) {
        showError(err);
      }
    }, update => {
      // Construct subject updates from the group updates
      this.updateView(asSubjectUpdates(update));
    });
  }

  async linksTo(id: string): Promise<string[]> {
    const selection = await this.model.read<Select>({
      '@select': '?s',
      '@where': { '@id': '?s', linkTo: { '@id': id } }
    });
    return selection.map(values => (values['?s'] as Reference)['@id']);
  }

  get contentExtent(): DOMRect {
    return node(this.messageGroup).getBBox();
  }

  get index(): BoardIndex {
    return this._index;
  }

  private updateView(updates: SubjectUpdates): boolean {
    Object.keys(updates).forEach(id => {
      const update = updates[id], updated = this.withThatMessage(id, mv => {
        const msg = mv.msg.resource;
        updateSubject(msg, update);
        this.updateViewFromData(mv, msg);
      });
      if (updated.empty() && update['@insert'] != null) {
        // New message
        const msg = <Resource<Message>>update['@insert'];
        this.addMessageView(msg).each(
          this.withThisMessage(mv => this.updateViewFromData(mv, msg)));
      }
    });
    return !!Object.keys(updates).length;
  }

  private updateViewFromData(mv: MessageView, msg: Resource<Message>) {
    // Update the index when the message view has re-sized itself
    mv.update(msg).then(() => this._index.update(mv.msg)).catch(showWarning);
  }

  private addMessageView(data: Resource<Message>) {
    const msgSelect = MessageView.init(data);
    node(this.messageGroup).insertAdjacentElement('beforeend', node(msgSelect));
    msgSelect.select('.board-message-body')
      // The contenteditable div can be smaller than the body
      .on('mousedown', this.withThisMessage(this.forceEditFocus))
      .on('touchstart', this.withThisMessage(this.forceEditFocus));
    msgSelect.select('.board-message-body > div')
      .on('focus', this.withThisMessage(this.inputStart))
      .on('input', this.withThisMessage(this.inputChange))
      .on('keydown', this.withThisMessage(this.inputKey))
      .on('blur', this.withThisMessage(this.inputEnd));
    msgSelect.select('.board-message-close circle')
      .on('mouseover', this.withThisMessage(mv => this.setRemoving(mv, true)))
      .on('mouseleave', this.withThisMessage(mv => this.setRemoving(mv, false)))
      .on('click', this.withThisMessage(mv => this.removeMessage(mv, true)))
      .call(this.setupBtnDrag(this.unlinkDragStart, this.unlinkDragging, this.unlinkDragEnd));
    msgSelect.select('.board-message-add circle')
      .on('click', this.withThisMessage(mv => this.addNewMessage(mv)))
      .call(this.setupBtnDrag(this.btnDragStart, this.linkDragging, this.linkDragEnd));
    msgSelect.selectAll('.board-message-move circle').call(d3.drag()
      .container(node(this.svg))
      .on('start', this.withThisMessage(this.moveDragStart))
      .on('drag', this.withThisMessage(this.moveDragging))
      .on('end', this.withThisMessage(this.moveDragEnd)));
    msgSelect.select('.board-message-code circle')
      .on('click', this.withThisMessage(mv => mv.toggleCode()));
    return msgSelect;
  }

  private forceEditFocus(mv: MessageView) {
    const div = node(mv.content);
    if (document.activeElement !== div) {
      // Raise early to prevent the focus handler raise from causing a blur
      mv.d3.raise();
      div.focus();
      document.execCommand('selectAll');
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

  private inputChange(mv: MessageView) {
    // This updates the message's size to accommodate the input
    mv.update();
  }

  private inputStart(mv: MessageView) {
    mv.d3.raise();
    mv.active = true;
  }

  private inputKey(mv: MessageView) {
    if (d3.event.key === 'Enter' && !d3.event.shiftKey) {
      node(mv.content).blur();
      d3.event.preventDefault();
    }
  }

  private inputEnd(mv: MessageView) {
    mv.active = false;
    // Commit the change to the message if this isn't a spurious event
    if (mv.msg.text !== mv.text && !mv.msg.deleted) {
      this.model.write<Update>({
        '@insert': { '@id': mv.msg['@id'], text: mv.text },
        '@delete': { '@id': mv.msg['@id'], text: mv.msg.resource.text }
      }).then(null, showWarning);
    }
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
      '@insert': { '@id': mv.msg['@id'], x, y },
      '@delete': { '@id': mv.msg['@id'], x: mv.msg.resource.x, y: mv.msg.resource.y }
    }).then(null, showWarning);
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
        !includesValue(mv.msg.resource, 'linkTo', { '@id': thatId }), 'link-target');
  }

  private linkDragEnd(mv: MessageView, dragged: SVGElement) {
    this.btnDragEnd(dragged, mv, (thatId, position) => {
      if (thatId != null) {
        this.model.write<Update>({
          '@insert': { '@id': mv.msg['@id'], linkTo: { '@id': thatId } }
        }).then(null, showWarning);
      } else {
        this.addNewMessage(mv, position);
      }
    }, 'link-target');
  }

  private unlinkDragging(mv: MessageView) {
    this.btnDragging(
      mv, thatId => thatId != mv.msg['@id'] &&
        includesValue(mv.msg.resource, 'linkTo', { '@id': thatId }), 'remove-target');
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
        }).then(null, showWarning);
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

  private updateDragLink(drag: DragSubject, mv: MessageView, targetClass: string, target: MessageView) {
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
    const id = shortId();
    const [x, y] = position ?? this.index.findSpace(from.msg);
    const newMessage: Resource<Message> = {
      '@id': id, '@type': 'Message', text: '', x, y, linkTo: []
    };
    const newLink: Subject = {
      '@id': from.msg['@id'],
      linkTo: [{ '@id': id }]
    };
    this.model.write<Update>({ '@insert': [newMessage, newLink] })
      // Yield to the event loop so that we have definitely processed the update
      .then(() => new Promise(done => setTimeout(done)))
      .then(() => this.withThatMessage(id, mv => node(mv.content).focus()), showWarning);
  }

  private removeMessage(mv: MessageView, top: boolean) {
    if (mv.msg['@id'] !== this.welcomeId) {
      this.model.delete(mv.msg['@id']);
      if (top && d3.event.shiftKey) {
        mv.msg.linkTo.forEach(linked =>
          this.withThatMessage(linked['@id'], mv => this.removeMessage(mv, false)));
      }
    } else if (top) {
      showWarning("Sorry, you can't delete the welcome message");
    }
  }

  hitTest(test: Rectangle, filter: (id: string) => boolean): MessageView {
    const found = this._index.search(test).filter(msg => filter(msg['@id']))[0];
    return found && new MessageView(node(this.msgD3(found['@id'])), this);
  }

  withThisMessage(action: (mv: MessageView, el: SVGElement) => any): (this: Element) => any {
    const bv = this;
    return function (this: SVGElement) {
      return action.call(bv, new MessageView(this, bv), this);
    }
  }

  withThatMessage(thatId: string, action: (mv: MessageView) => any) {
    return this.msgD3(thatId).each(this.withThisMessage(action));
  }

  private msgD3(thatId: string) {
    return this.svg.select<Element>(`#${thatId}`);
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