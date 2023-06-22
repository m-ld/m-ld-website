import * as d3 from 'd3';
import { D3View } from '../lib/client/D3View';
import { d3Selection, fromTemplate, Setup, setupJson } from '../lib/client/d3Util';
import { Grecaptcha, modernizd } from '@m-ld/io-web-runtime/dist/client';
import {
  initPopupControls, showError, showNotModern, showWarning
} from '../lib/client/PopupControls';
import { TSeq, TSeqOperation } from '@m-ld/m-ld/ext/tseq';
import { render as renderTime } from 'timeago.js';
import { parse } from 'querystring';
import { JsonEditorCard } from '../lib/client/JsonEditorCard';
import { shortId } from '@m-ld/m-ld';
import { HtmlTextView } from '../lib/client/HtmlTextView';

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
    this.addAuthorButton.on('click', () => this.cloneAuthor(this.authors[0]));
  }

  cloneAuthor(author: Author) {
    this.addAuthor(TSeq.fromJSON(
      this.authorInput.property('value') || shortId(),
      author.tseq.toJSON()
    ));
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
  textArea: HtmlTextView<HTMLTextAreaElement>;

  constructor(
    readonly board: Storyboard,
    div: d3Selection<HTMLDivElement>,
    readonly tseq: TSeq
  ) {
    super(div);
    div.datum(this);
    div.select('.card-header-title').text(`Text according to ${tseq.pid}`);
    this.textArea = new HtmlTextView(div.select('.textarea'));
    this.textArea.element.value = tseq.toString();
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
      this.tseq.toJSON()
    );
    this.textArea.on('update', (...splices) => {
      try {
        for (let splice of splices)
          this.logOperation(this.tseq.splice(...splice));
        this.tseqCard.json = this.tseq.toJSON();
      } catch (e) {
        showWarning(e);
      }
    });
    this.d3.select('.tseq-sync').on('click', async () => {
      try {
        if (this.board.authors.length === 1)
          this.board.cloneAuthor(this);
        const operations =
          this.d3.selectAll<HTMLDivElement, JsonEditorCard>('.operation-card')
            .data().map(editor => editor.jsonEditor.get());
        board.broadcast(operations.reverse());
        this.operationsLog.selectAll('.operation-card').remove();
      } catch (e) {
        showWarning(e);
      }
    });
  }

  applyOperations(operations: TSeqOperation[]) {
    for (let operation of operations)
      this.tseq.apply(operation);
    this.tseqCard.json = this.tseq.toJSON();
    this.textArea.element.value = this.tseq.toString();
  }

  private logOperation(operation: TSeqOperation) {
    const editorCard = new JsonEditorCard(
      this.operationsLog
        .insert(() => fromTemplate<HTMLDivElement>('operation'), ':first-child')
        .attr('id', null).classed('is-hidden', false),
      {},
      {
        mode: 'code', mainMenuBar: false, statusBar: false, onEditable: () => false
      },
      operation
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