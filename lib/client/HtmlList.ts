import { EventEmitter } from 'events';
import { d3Selection } from './d3Util';
import { D3View } from './D3View';

/**
 * Presents the given node's content as a list of tags and characters.
 *
 * Watches for changes to the HTML of the parent node and issues DOM mutations
 * as splices of the list.
 *
 * When provided with a splice, performs a non-destructive merge using Ranges.
 */
export class HtmlList extends D3View<HTMLElement> implements Iterable<string> {
  private events = new EventEmitter;
  private spliceTxn?: SpliceTxn;
  private inputTxn?: InputTxn;

  constructor(d3: d3Selection<HTMLElement>) {
    super(d3);
    // Tracking input events
    this.element.addEventListener('beforeinput', (event: InputEvent) => {
      const ranges = event.getTargetRanges();
      if (ranges != null && ranges.length > 0) {
        if (ranges.length > 1)
          event.preventDefault(); // Don't know how to handle
        else
          this.inputTxn = new InputTxn(this.element, ranges[0]);
      }
    });
    this.element.addEventListener('input', (event: InputEvent) => {
      if (this.inputTxn != null) {
        this.events.emit('input', ...this.inputTxn.commit(event.data));
        delete this.inputTxn;
      }
    });
  }

  on(event: 'input', handler: Array<string>['splice']): this {
    this.events.on(event, handler);
    return this;
  }

  /**
   * Adds the given splice to the running transaction (created if not running).
   * Transactions are necessary because a splice with a tag in it might not make
   * sense until all splices have been processed. On {@link commit}, the
   * resulting list items are applied to the HTML.
   */
  splice: Array<string>['splice'] = (start: number, deleteCount: number, ...items: string[]) => {
    if (this.spliceTxn == null)
      this.spliceTxn = new SpliceTxn(this.element);
    return this.spliceTxn.splice(start, deleteCount, ...items);
  }

  commit() {
    if (this.spliceTxn != null) {
      this.spliceTxn.commit();
      delete this.spliceTxn;
    }
  }

  [Symbol.iterator](): Iterator<string, number, undefined> {
    return listItems(this.element);
  }

  toString(): string {
    return [...this].join('');
  }
}

type ListVisitor =
  (node: Element | CharacterData, index: number, nodeOffset: number) => void;

function* listItems(element: Element,
  visitor: ListVisitor = () => { },
  index = 0): Generator<string, number> {
  let childOffset = 0;
  for (let child of element.childNodes) {
    if (child instanceof Element) {
      // TODO: Attributes?
      yield `<${child.tagName}>`;
      visitor(element, index++, childOffset);
      index = yield* listItems(child, visitor, index);
      yield `</${child.tagName}>`;
      index++; // Don't visit the close tag
    } else if (child instanceof CharacterData) {
      let characterOffset = 0;
      for (let character of child.data) {
        yield character;
        visitor(child, index++, characterOffset++);
      }
    }
    childOffset++;
  }
  return index;
}

class InputTxn {
  start: number;
  deleteCount = 0;
  afterEnd?: Node;

  constructor(readonly element: Element, range: StaticRange) {
    // Assume that every target range will be deleted and inserted
    let reachedEnd = false;
    listItems(element, (node, index, nodeOffset) => {
      if (node === range.startContainer && nodeOffset === range.startOffset)
        this.start = index;
      else if (node === range.endContainer && nodeOffset === range.endOffset)
        reachedEnd = true;
      else if (reachedEnd && this.afterEnd == null)
        this.afterEnd = node;
      else if (this.start != null && !reachedEnd)
        this.deleteCount++;
    });
  }

  commit(inputData: string | null): Parameters<Array<string>['splice']> {
    if (inputData != null) {
      // Spread operator separates string characters
      return [this.start, this.deleteCount, ...inputData];
    } else {
      // In all cases where input data is null, the afterEnd node is
      // front-truncated, so as soon as we've reached it we're done
      let end = Infinity;
      const data = [...listItems(this.element, (node, index) => {
        if (node === this.afterEnd)
          end = index;
      })];
      return [this.start, this.deleteCount, ...data.slice(this.start, end)];
    }
  }
}

class SpliceTxn {
  selection?: {
    anchor: number;
    focus: number;
  };
  data: string[] = [];

  constructor(readonly element: Element) {
    const docSel = document.getSelection();
    const listSel = { anchor: -1, focus: -1 };
    this.data = [...listItems(element, (node, index, nodeOffset) => {
      if (docSel != null) {
        if (node === docSel.anchorNode && nodeOffset === docSel.anchorOffset)
          listSel.anchor = index;
        if (node === docSel.focusNode && nodeOffset === docSel.focusOffset)
          listSel.focus = index;
      }
    })];
    if (listSel.anchor > -1 && listSel.focus > -1)
      this.selection = listSel;
  }

  splice: Array<string>['splice'] = (start: number, deleteCount: number, ...items: string[]) => {
    this.adjustSelection('anchor', start, deleteCount, items.length);
    this.adjustSelection('focus', start, deleteCount, items.length);
    return this.data.splice(start, deleteCount, ...items);
  };

  commit() {
    // Apply the changes as innerHTML
    this.element.innerHTML = this.data.join('');
    // Reset the selection
    const listSel = this.selection;
    const docSel = document.getSelection();
    if (listSel != null && docSel != null) {
      const range = document.createRange();
      listItems(this.element, (node, index, nodeOffset) => {
        if (index === listSel.anchor)
          range.setStart(node, nodeOffset);
        if (index === listSel.focus)
          range.setEnd(node, nodeOffset);
      });
      docSel.removeAllRanges();
      docSel.addRange(range);
    }
  }

  private adjustSelection(key: 'anchor' | 'focus',
    start: number, deleteCount: number, insertCount: number) {
    if (this.selection != null) {
      // Deletes happen before the cursor
      if (this.selection[key] >= start) {
        if (this.selection[key] < start + deleteCount)
          this.selection[key] = start;
        else
          this.selection[key] -= deleteCount;
      }
      // Inserts happen after the cursor
      if (this.selection[key] > start) {
        this.selection[key] += insertCount;
      }
    }
  }
}