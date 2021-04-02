import { DeleteInsert } from '@m-ld/m-ld';
import { EventEmitter } from 'events';
import { d3Selection } from './d3Util';
import { D3View } from './D3View';
import { getPatch, PatchItem } from 'fast-array-diff';

export type HtmlListUpdate = DeleteInsert<{ [key: number]: string | string[] }>;

/**
 * Presents the given node's content as a list of tags and characters.
 *
 * Watches for changes to the HTML of the parent node and issues DOM mutations
 * as splices of the list.
 *
 * When provided with a splice, performs a non-destructive merge using Ranges.
 */
export class HtmlList extends D3View<HTMLElement> implements Iterable<string> {
  events = new EventEmitter;
  inputTxn?: { old: string[] };

  constructor(d3: d3Selection<HTMLElement>) {
    super(d3);
    this.element.addEventListener('beforeinput', () => {
      this.inputTxn = { old: this.list };
    });
    this.element.addEventListener('input', () => {
      if (this.inputTxn != null) {
        this.events.emit('update', this.getUpdate(this.inputTxn.old));
        delete this.inputTxn;
      }
    });
  }

  on(event: 'update', handler: (update: DeleteInsert<{ [key: number]: string }>) => any) {
    this.events.on(event, handler);
  }

  get list() {
    return [...this];
  }

  set list(to: string[]) {
    new SpliceTxn(this.element).update(to).commit();
  }

  [Symbol.iterator](): Iterator<string, number, undefined> {
    return listItems(this.element);
  }

  toString(): string {
    return [...this].join('');
  }

  private getUpdate(from: string[]) {
    const update: HtmlListUpdate = { '@delete': {}, '@insert': {} };
    for (let patch of getPatch(from, this.list)) {
      if (patch.type === 'remove')
        for (let i = 0; i < patch.items.length; i++)
          update['@delete'][patch.oldPos + i] = patch.items[i];
      else if (patch.type === 'add')
        update['@insert'][patch.oldPos] = patch.items;
    }
    return update;
  }
}

type ListVisitor = (node: Node, offset: number, index: number) => void;

function* listItems(element: Element,
  visitor: ListVisitor = () => { },
  index = 0): Generator<string, number> {
  let childOffset = 0;
  for (let child of element.childNodes) {
    if (child instanceof Element) {
      // TODO: Attributes?
      yield `<${child.tagName.toLowerCase()}>`;
      visitor(element, childOffset, index++);
      index = yield* listItems(child, visitor, index);
      yield `</${child.tagName.toLowerCase()}>`;
      index++; // Don't visit the close tag
    } else if (child instanceof CharacterData) {
      let characterOffset = 0;
      for (let character of child.data) {
        yield character;
        visitor(child, characterOffset++, index++);
      }
    }
    childOffset++;
  }
  return index;
}

function visitItems(element: Element, visitor: ListVisitor = () => { }) {
  for (let _ of listItems(element, visitor))
    ;
}

interface BaseExtent<T> {
  anchor: T;
  focus: T;
}

class SpliceTxn {
  selection?: BaseExtent<number>;
  list: string[] = [];

  constructor(readonly element: Element) {
    const docSel = document.getSelection();
    const listSel = { anchor: -1, focus: -1 };
    this.list = [...listItems(element, (node, offset, index) => {
      if (docSel != null) {
        if (node === docSel.anchorNode && offset === docSel.anchorOffset)
          listSel.anchor = index;
        if (node === docSel.focusNode && offset === docSel.focusOffset)
          listSel.focus = index;
      }
    })];
    if (listSel.anchor > -1 && listSel.focus > -1)
      this.selection = listSel;
  }

  update(to: string[]) {
    for (let patch of getPatch(this.list, to)) {
      this.adjustSelection('anchor', patch);
      this.adjustSelection('focus', patch);
    }
    this.list = to;
    return this;
  }

  commit() {
    // Apply the changes as innerHTML
    this.element.innerHTML = this.list.join('');
    // Reset the selection
    const listSel = this.selection;
    const docSel = document.getSelection();
    if (listSel != null && docSel != null) {
      let newSel: Partial<BaseExtent<{ node: Node, offset: number }>> = {};
      visitItems(this.element, (node, offset, index) => {
        if (index === listSel.anchor)
          newSel.anchor = { node, offset };
        if (index === listSel.focus)
          newSel.focus = { node, offset };
      });
      if (newSel.anchor != null && newSel.focus != null)
        docSel.setBaseAndExtent(newSel.anchor.node, newSel.anchor.offset,
          newSel.focus.node, newSel.focus.offset);
      else if (newSel.anchor != null || newSel.focus != null)
        docSel.collapse(newSel.anchor?.node ?? newSel.focus?.node ?? null,
          newSel.anchor?.offset ?? newSel.focus?.offset);
    }
  }

  private adjustSelection(key: 'anchor' | 'focus', patch: PatchItem<string>) {
    if (this.selection != null) {
      const start = patch.newPos, count = patch.items.length;
      if (patch.type === 'remove') {
        // Deletes happen before the cursor
        if (this.selection[key] >= start)
          if (this.selection[key] < start + count)
            this.selection[key] = start;
          else
            this.selection[key] -= count;
      } else if (patch.type === 'add') {
        // Inserts happen after the cursor
        if (this.selection[key] > start)
          this.selection[key] += count;
      }
    }
  }
}