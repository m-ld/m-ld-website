import { D3View } from './D3View';
import { d3Selection } from './d3Util';
import { diff_match_patch } from 'diff-match-patch';

export type TextSplice = [number, number, string?];

export class HtmlTextView<E extends HTMLElement = HTMLElement> extends D3View<E> {
  private dmp = new diff_match_patch();

  constructor(d3: d3Selection<E>) {
    super(d3);
    const view = this;
    const diff = new class {
      before: string;
      mark() { this.before = this.current; }
      get current() {
        view.normalise();
        return view.element.textContent ?? '';
      }
    }();
    d3.on('beforeinput', () => diff.mark());
    d3.on('input', () => this.onInput(diff));
  }

  on(event: 'update', handler: (splice: TextSplice) => void) {
    return super.on(event, handler);
  }

  onInput({ before, current }: { before: string, current: string }) {
    const diffs = this.dmp.diff_main(before, current);
    this.dmp.diff_cleanupSemantic(diffs);
    for (let d = 0, charIndex = 0; d < diffs.length; d++) {
      let [type, content] = diffs[d];
      switch (type) {
        case 0:
          charIndex += content.length;
          break;
        case -1:
          const [nextType, nextContent] = diffs[d + 1] ?? [];
          if (nextType === 1) {
            this.emit('update', [charIndex, content.length, nextContent]);
            charIndex += nextContent.length;
            d++; // Skip next
          } else {
            this.emit('update', [charIndex, content.length]);
          }
          break;
        case 1:
          this.emit('update', [charIndex, 0, content]);
          charIndex += content.length;
      }
    }
  }

  /** Apply remote update; does not trigger 'update' event */
  update(text: TextSplice[] | string) {
    // Ensure that the text content is one normalised Text node
    if (typeof text == 'string') {
      this.element.replaceChildren(document.createTextNode(text));
    } else {
      this.normalise();
      // Split the text on every splice
      text.sort(([i1], [i2]) => i2 - i1); // descending
      for (let [index, deleteCount, content] of text) {
        const head = <Text>this.element.firstChild;
        if (head == null) {
          if (index === 0 && content != null)
            this.element.appendChild(document.createTextNode(content))
          else
            throw new RangeError(`Curious splice ${text} into empty text`);
        } else {
          const tail = head.splitText(index);
          if (content) {
            this.element.insertBefore(document.createTextNode(content), tail);
          }
          if (deleteCount > 0) {
            tail.splitText(deleteCount); // Creates new tail
            tail.remove();
          }
        }
      }
      this.normalise();
    }
  }

  normalise() {
    // Replace line-breaks with text nodes containing \n
    for (let child of this.element.childNodes) {
      if (child.nodeName === 'BR')
        child.replaceWith(document.createTextNode('\n'));
      else if (child.nodeName !== '#text')
        child.remove();
    }
    this.element.normalize();
  }
}