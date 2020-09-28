import * as d3 from 'd3';
import JSONEditor, { JSONEditorOptions } from 'jsoneditor';
import { D3View } from '../lib/client/D3View';
import { d3Selection } from '../lib/client/d3Util';
import { Grecaptcha, modernizd } from '@m-ld/io-web-runtime/dist/client';
import { initPopupControls, showNotModern, showWarning } from '../lib/client/PopupControls';
import { fetchConfig } from '../lib/client/Api';
import { clone, MeldApi, isRead, isWrite, Context, MeldUpdate } from '@m-ld/m-ld';
import { AblyRemotes, MeldAblyConfig } from '@m-ld/m-ld/dist/ably';
import MemDown from 'memdown';
import { render as renderTime } from 'timeago.js';
const queryTemplates = require('../lib/templates/query-templates.json');
const txnTemplates = require('../lib/templates/txn-templates.json');

window.onload = async function () {
  try {
    await modernizd([]);
  } catch (err) {
    return showNotModern(err);
  }
  initPopupControls();

  await Grecaptcha.ready;

  const pg = new Playground();
  window.addEventListener('beforeunload', e => {
    if (pg.unsaved) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
  window.onunload = () => pg.close();
};

function validContext(context: any): boolean {
  return context != null && typeof context == 'object' && !Array.isArray(context);
}

class OptionsDialog extends D3View<HTMLDivElement> {
  contextEditor: JSONEditor;
  prevContext: any = {};

  constructor() {
    super(d3.select('#options-dialog'));
    this.contextEditor = new JSONEditor(d3.select('#context-jsoneditor').node() as HTMLElement, {
      mode: 'code', mainMenuBar: false, statusBar: false,
      onChange: () => this.applyButton.property('disabled', !this.valid),
      onValidate: json => validContext(json) ? [] : [{ path: [], message: NOT_A_CONTEXT }]
    }, {}); // Default empty context
    this.applyButton.on('click', () => {
      this.d3.classed('is-active', false);
    });
    this.cancelButton.on('click', () => {
      this.d3.classed('is-active', false);
      this.contextEditor.set(this.prevContext);
    });
  }

  get context() {
    return this.contextEditor.get();
  }

  get valid(): boolean {
    try {
      const context = this.contextEditor.get();
      return validContext(context);
    } catch (err) {
      return false;
    }
  }

  get applyButton() {
    return d3.select('#options-apply');
  }

  get cancelButton() {
    return d3.select('#options-cancel');
  }

  show() {
    this.d3.classed('is-active', true);
    this.prevContext = this.contextEditor.get();
  }
}

const NOT_A_READ = 'Query pattern is not a read operation';
const NOT_A_WRITE = 'Transaction pattern is not a write operation';
const NOT_A_CONTEXT = 'A m-ld context must be a JSON object';
const CONFIRM_CHANGE_DOMAIN = 'You may have unsaved data. Continue changing domain?';

class Playground {
  queryCard: JsonEditorCard;
  txnCard: JsonEditorCard;
  dataEditor: JSONEditor;
  clone?: MeldApi;
  config?: MeldAblyConfig;
  options: OptionsDialog;

  constructor() {
    this.queryCard = new JsonEditorCard(d3.select('#query-card'), queryTemplates, {
      mode: 'code', mainMenuBar: false, statusBar: false, onValidate: json =>
        isRead(json) ? [] : [{ path: [], message: NOT_A_READ }]
    }, queryTemplates['Describe all subjects']);
    this.txnCard = new JsonEditorCard(d3.select('#txn-card'), txnTemplates, {
      mode: 'code', mainMenuBar: false, statusBar: false, onValidate: json =>
        isWrite(json) ? [] : [{ path: [], message: NOT_A_WRITE }]
    });
    this.dataEditor = new JSONEditor(d3.select('#data-jsoneditor').node() as HTMLElement, {
      modes: ['view', 'code'], enableTransform: false, enableSort: false, onEditable: () => false
    }, []);
    this.domainInput.on('keydown', () => {
      if (d3.event.key === 'Enter')
        this.loadDomain();
    });
    this.newDomainButton.on('click', () => {
      this.domain = '';
      this.loadDomain();
    });
    d3.select('#query-apply').on('click', () => {
      this.runQuery('warn');
    });
    d3.select('#txn-apply').on('click', async () => {
      if (this.clone != null) {
        try {
          const pattern = this.txnCard.jsonEditor.get();
          if (!isWrite(pattern))
            throw NOT_A_WRITE;
          await this.clone.transact(pattern);
        } catch (err) {
          showWarning(err);
        }
      }
    });
    d3.select('#show-options').on('click', () => this.options.show());
    this.options = new OptionsDialog();
    this.loading = false;
  }

  async close() {
    if (this.clone != null)
      await this.clone.close();
    this.clone = undefined;
  }

  get unsaved() {
    return this.clone?.status.value.silo;
  }

  async loadDomain() {
    if (this.unsaved && !window.confirm(CONFIRM_CHANGE_DOMAIN))
      return this.domain = this.config?.['@domain'] ?? '';
    try {
      this.loading = true;
      await this.close();
      this.updatesLog.selectAll('.update-card').remove();
      this.config = await fetchConfig(this.domain);
      this.domain = this.config['@domain'];
      this.config['@context'] = { ...this.config['@context'], ...this.options.context };
      this.clone = await clone(new MemDown, AblyRemotes, this.config);
      this.clone.follow().subscribe(update => this.onUpdate(update));
      await this.clone.status.becomes({ outdated: false });
      this.runQuery('warn');
    } catch (err) {
      showWarning(err);
    } finally {
      this.loading = false;
    }
  }

  private onUpdate(update: MeldUpdate) {
    this.runQuery();
    const editorCard = new JsonEditorCard(
      this.updatesLog
        .insert(this.newUpdateCardNode, ':first-child')
        .attr('id', null).classed('is-hidden', false), {}, {
      mode: 'code', mainMenuBar: false, statusBar: false, onEditable: () => false
    }, update);
    editorCard.title.attr('datetime', new Date().toISOString());
    renderTime(editorCard.title.node() ?? [], 'en_US', { minInterval: 10 });
    // Starting with the next sibling, group cards by time unless they are expanded
    editorCard.mergeFollowing('skip');
  }

  async runQuery(warn?: 'warn') {
    if (this.clone != null) {
      try {
        this.querying = true;
        const pattern = this.queryCard.jsonEditor.get();
        if (!isRead(pattern))
          throw NOT_A_READ;
        const subjects = await this.clone.transact(pattern);
        this.dataEditor.update(subjects);
      } catch (err) {
        if (warn)
          showWarning(err);
      } finally {
        this.querying = false;
      }
    }
  }

  get domain(): string {
    return this.domainInput.property('value');
  }

  set domain(domain: string) {
    this.domainInput.property('value', domain);
  }

  get domainInput() {
    return d3.select('#domain-input');
  }

  get newDomainButton() {
    return d3.select('#domain-new');
  }

  get updatesLog() {
    return d3.select('#updates-log');
  }

  newUpdateCardNode(): HTMLDivElement {
    const cardDiv = <HTMLDivElement>d3.select
      <HTMLDivElement, unknown>('#update-template').node()?.cloneNode(true);
    if (cardDiv == null)
      throw 'Missing card template';
    return cardDiv;
  }

  set loading(loading: boolean) {
    d3.select('#domain-spinner').classed('is-hidden', !loading);
    d3.selectAll('.requires-domain').property('disabled', loading || !this.clone);
    this.newDomainButton.property('disabled', loading);
    this.domainInput.property('disabled', loading);
  }

  set querying(querying: boolean) {
    d3.select('#data-spinner').classed('is-hidden', !querying);
  }
}

class JsonEditorCard extends D3View<HTMLDivElement> {
  jsonEditor: JSONEditor;
  created = Date.now();
  expanded: boolean = false;

  constructor(
    cardNode: d3Selection<HTMLDivElement>,
    templates: object,
    options?: JSONEditorOptions,
    json?: any) {
    super(cardNode);
    cardNode.datum(this);

    this.toggle.on('click', () => {
      this.expanded = this.content.classed('is-hidden');
      this.icon.classed('fa-angle-up', this.expanded);
      this.icon.classed('fa-angle-down', !this.expanded);
      this.content.classed('is-hidden', !this.expanded);
      this.preview.classed('is-hidden', this.expanded);
      if (this.expanded)
        this.jsonEditor.focus();
    });

    if (!this.preview.empty()) {
      const prevOnChange = options?.onChange;
      options = {
        ...options,
        onChange: async () => {
          this.updatePreview(options);
          prevOnChange?.();
        }
      };
    }

    this.jsonEditor = new JSONEditor(
      this.d3.select('.card-json').node() as HTMLElement, options, json);

    this.templatesContent
      .selectAll('.dropdown-item').data(Object.entries(templates))
      .join('a').classed('dropdown-item', true).text(e => e[0])
      .on('click', e => {
        this.jsonEditor.set(e[1]);
        this.updatePreview(options);
      });

    options?.onChange?.();
  }

  private async updatePreview(options?: JSONEditorOptions) {
    try {
      const pattern = this.jsonEditor.get();
      const errs = await options?.onValidate?.(pattern);
      if (errs != null && errs.length > 0)
        this.preview.html(previewErrHtml(errs.map(err => err.message)));
      else
        this.preview.html(JSON.stringify(pattern));
    } catch (err) {
      this.preview.html(previewErrHtml('JSON not valid'));
    }
  }

  mergeFollowing(skip?: 'skip') {
    const nextSibling = this.element.nextElementSibling;
    if (nextSibling != null) {
      const next = d3.select<Element, JsonEditorCard>(nextSibling).datum();
      if (skip || this.expanded || this.title.text() !== next.title.text()) {
        next.mergeFollowing();
      } else {
        try {
          const json = [].concat(this.jsonEditor.get()).concat(next.jsonEditor.get());
          this.jsonEditor.set(json);
          this.preview.html(JSON.stringify(json));
          next.d3.remove();
          this.mergeFollowing();
        } catch (err) {
          next.mergeFollowing();
        }
      }
    }
  }

  get title() {
    return this.d3.select<HTMLDivElement>('.card-header-title');
  }

  get content() {
    return this.d3.select<HTMLDivElement>('.card-content');
  }

  get preview() {
    return this.d3.select<HTMLPreElement>('.card-preview');
  }

  get toggle() {
    return this.d3.select<HTMLAnchorElement>('.card-toggle');
  }

  get icon() {
    return this.toggle.select('.fa');
  }

  get templatesContent() {
    return this.d3.select('.templates-menu .dropdown-content');
  }
}

function previewErrHtml(err: any): string {
  return `<i class="fas fa-exclamation-triangle" title="${err}"></i>`;
}