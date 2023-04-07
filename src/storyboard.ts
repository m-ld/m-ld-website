import * as d3 from 'd3';
import { D3View } from '../lib/client/D3View';
import { d3Selection, fromTemplate, node, Setup, setupJson } from '../lib/client/d3Util';
import { Grecaptcha, modernizd } from '@m-ld/io-web-runtime/dist/client';
import { initPopupControls, showError, showNotModern, showWarning } from '../lib/client/PopupControls';
import { TSeq, TSeqOperation } from '@m-ld/m-ld/ext/tseq';
import { render as renderTime } from 'timeago.js';
import { parse } from 'querystring';
import { JsonEditorCard } from '../lib/client/JsonEditorCard';
import { shortId } from '@m-ld/m-ld';
import { diff_match_patch } from 'diff-match-patch';

window.onload = async function () {
  try {
    await modernizd([]);
  } catch (err) {
    return showNotModern(err);
  }
  initPopupControls();
  await Grecaptcha.ready;
  new Storyboard(parse(window.location.hash.slice(1)));
};

class Storyboard extends D3View<HTMLDivElement> {
  constructor(setup: Setup) {
    super(d3.select('body'));
    const tseqJson = setupJson('tseq', setup);
    let tseq: TSeq;
    if (tseqJson) {
      try {
        tseq = TSeq.fromJSON(shortId(), tseqJson);
      } catch (e) {
        const fallbackUrl = new URL(window.location.href);
        fallbackUrl.hash = '';
        showError('Setup JSON is not valid', {
          href: fallbackUrl.toString(), text: 'start over'
        });
        return;
      }
    } else {
      tseq = new TSeq(shortId());
    }
    this.addAuthor(tseq);
    this.addAuthorButton.on('click', () => {
      this.addAuthor(TSeq.fromJSON(
        this.authorInput.property('value') || shortId(),
        this.authors[0].tseq.toJSON()
      ));
    });
  }

  broadcast(operations: TSeqOperation[]) {
    for (let author of this.authors)
      author.applyOperations(operations);
  }

  private addAuthor(tseq: TSeq) {
    new Author(
      this,
      this.d3.append(() => fromTemplate<HTMLDivElement>('author'))
        .attr('id', tseq.pid)
        .classed('is-hidden', false)
        .classed('author', true)
        .datum(tseq),
      tseq
    );
  }

  get authors() {
    return this.d3.selectAll<HTMLDivElement, Author>('.author').data();
  }

  get authorInput() {
    return d3.select('#author-input');
  }

  get addAuthorButton() {
    return d3.select('#author-new');
  }
}

// noinspection JSIgnoredPromiseFromCall, ES6MissingAwait
class Author extends D3View<HTMLDivElement> {
  tseqCard: JsonEditorCard;
  textArea: d3Selection<HTMLTextAreaElement>;
  dmp = new diff_match_patch();

  constructor(
    readonly board: Storyboard,
    div: d3Selection<HTMLDivElement>,
    readonly tseq: TSeq
  ) {
    super(div);
    div.datum(this);
    div.select('.card-header-title').text(`Text according to ${tseq.pid}`);
    this.textArea = div.select('.textarea');
    const textArea = node(this.textArea);
    textArea.value = tseq.toString();
    this.tseqCard = new JsonEditorCard(
      this.d3.select('.tseq-card'),
      {},
      {
        modes: ['code', 'view'],
        enableTransform: false,
        enableSort: false,
        statusBar: false,
        onEditable: () => false
      },
      tseq.toJSON()
    );
    const diff = new class {
      before: string;

      mark() {
        this.before = this.current;
      }

      get current() {
        return textArea.value;
      }
    }();
    this.textArea.on('beforeinput', () => diff.mark());
    this.textArea.on('input', () => this.onInput(diff));
    this.d3.select('.tseq-sync').on('click', async () => {
      try {
        const operations = [].concat(
          ...this.d3.selectAll<HTMLDivElement, JsonEditorCard>('.operation-card')
            .data().map(editor => editor.jsonEditor.get()));
        board.broadcast(operations.map(o => TSeqOperation.fromJSON(o)).reverse());
        this.operationsLog.selectAll('.operation-card').remove();
      } catch (e) {
        showWarning(e);
      }
    });
  }

  applyOperations(operations: TSeqOperation[]) {
    this.tseq.apply(operations);
    this.tseqCard.jsonEditor.set(this.tseq.toJSON());
    node(this.textArea).value = this.tseq.toString();
  }

  private onInput({ before, current }: { before: string, current: string }) {
    const operations = this.applyInputChange(before, current);
    this.tseqCard.jsonEditor.set(this.tseq.toJSON());
    this.logOperations(operations);
  }

  private applyInputChange(before: string, current: string) {
    const diffs = this.dmp.diff_main(before, current);
    this.dmp.diff_cleanupSemantic(diffs);
    const operations: TSeqOperation[] = [];
    for (let d = 0, charIndex = 0; d < diffs.length; d++) {
      let [type, content] = diffs[d];
      switch (type) {
        case 0:
          charIndex += content.length;
          break;
        case -1:
          const [nextType, nextContent] = diffs[d + 1] ?? [];
          if (nextType === 1) {
            operations.push(...this.tseq.splice(charIndex, content.length, nextContent));
            charIndex += nextContent.length;
            d++; // Skip next
          } else {
            operations.push(...this.tseq.splice(charIndex, content.length));
          }
          break;
        case 1:
          operations.push(...this.tseq.splice(charIndex, 0, content));
          charIndex += content.length;
      }
    }
    return operations;
  }

  private logOperations(operations: TSeqOperation[]) {
    const editorCard = new JsonEditorCard(
      this.operationsLog
        .insert(() => fromTemplate<HTMLDivElement>('operation'), ':first-child')
        .attr('id', null).classed('is-hidden', false),
      {},
      {
        mode: 'code', mainMenuBar: false, statusBar: false, onEditable: () => false
      },
      operations
    );
    editorCard.d3.datum(editorCard);
    editorCard.title.attr('datetime', new Date().toISOString());
    renderTime(editorCard.title.node() ?? [], 'en_US', { minInterval: 10 });
    // Starting with the next sibling, group cards by time unless they are expanded
    editorCard.mergeFollowing('skip');
  }

  get operationsLog(): d3Selection<HTMLDivElement> {
    return this.d3.select('.operations-log');
  }
}