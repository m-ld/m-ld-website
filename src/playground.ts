import * as d3 from 'd3';
import JSONEditor, { JSONEditorOptions } from 'jsoneditor';
import { D3View } from '../lib/client/D3View';
import { d3Selection, fromTemplate, node } from '../lib/client/d3Util';
import { Grecaptcha, modernizd } from '@m-ld/io-web-runtime/dist/client';
import {
  initPopupControls, showInfo, showMessage, showNotModern, showWarning
} from '../lib/client/PopupControls';
import { fetchConfig } from '../lib/client/Api';
import { clone, isRead, isWrite, MeldClone, MeldUpdate } from '@m-ld/m-ld';
import { AblyRemotes, MeldAblyConfig } from '@m-ld/m-ld/dist/ably';
import { MemDown } from '../lib/MemDown';
import { render as renderTime } from 'timeago.js';
import { parse, stringify } from 'querystring';
import * as local from 'local-storage';
import { LevelDownResponse } from '../lib/client/LevelDownResponse';
import { WrtcPeering } from '@m-ld/m-ld/dist/wrtc';

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

  const pg = new Playground(parse(window.location.hash.slice(1)));
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

function setupJson(key: string, setup: { [key: string]: string | string[] | undefined }, def: any): any {
  const val = setup[key];
  try {
    return typeof val == 'string' ? JSON.parse(val) : def;
  } catch (err) {
    return def;
  }
}

class Playground extends D3View<HTMLDivElement> {
  queryCard: JsonEditorCard;
  txnCard: JsonEditorCard;
  dataEditor: JSONEditor;
  clone?: MeldClone;
  options: OptionsDialog;
  previousDomain?: string;

  constructor(setup: { [key: string]: string | string[] | undefined }) {
    super(d3.select('#playground-ide'));
    this.queryCard = new JsonEditorCard('query', queryTemplates, {
      mode: 'code', mainMenuBar: false, statusBar: false, onValidate: json =>
        isRead(json) ? [] : [{ path: [], message: NOT_A_READ }]
    }, setupJson('query', setup, queryTemplates['Describe all subjects']));
    this.txnCard = new JsonEditorCard('txn', txnTemplates, {
      mode: 'code', mainMenuBar: false, statusBar: false, onValidate: json =>
        isWrite(json) ? [] : [{ path: [], message: NOT_A_WRITE }]
    }, setupJson('txn', setup, {}));
    this.dataEditor = new JSONEditor(d3.select('#data-jsoneditor').node() as HTMLElement, {
      modes: ['code', 'view'], enableTransform: false, enableSort: false, onEditable: () => false
    }, []);
    this.domain = typeof setup.domain == 'string' ? setup.domain : '';
    this.domainInput.on('keydown', () => {
      this.domainJoinIcon.classed('is-hidden', false);
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
          await this.clone.write(pattern);
        } catch (err) {
          showWarning(err);
        }
      }
    });
    d3.select('#domain-download').on('click', () => {
      showMessage('info', 'Preparing new clone for download', message => {
        message.append('progress').classed('progress', true).attr('max', 100);
        return this.downloadClone();
      }).catch(showWarning);
    });
    d3.select('#show-options').on('click', () => this.options.show());
    this.options = new OptionsDialog();

    this.intro.classed('is-hidden', this.introHidden);
    this.intro.select('.delete').on('click', () => this.introHidden = true);
    d3.select('#show-intro').on('click', () => this.introHidden = false);

    this.loading = false;
    this.loadDomain();
  }

  private get intro() {
    return d3.select('#playground-intro');
  }

  private get introHidden() {
    return local.get('m-ld.playground-intro-hidden');
  }

  private set introHidden(hidden: boolean) {
    local.set('m-ld.playground-intro-hidden', hidden);
    this.intro.classed('is-hidden', hidden);
  }

  async close() {
    if (this.clone != null)
      await this.clone.close();
    this.clone = undefined;
  }

  get unsaved() {
    return this.clone?.status.value.silo;
  }

  async downloadClone() {
    const config = await fetchConfig(this.domain);
    const backend = new MemDown;
    const tempClone = await clone(backend, this.remotes(config), config);
    await tempClone.status.becomes({ outdated: false });
    return new Promise<void>((resolve, reject) => tempClone.read(() => {
      LevelDownResponse.readFrom(backend).blob().then(blob => {
        try {
          const blobUrl = URL.createObjectURL(blob);
          const link = this.d3.append('a')
            .attr('href', blobUrl).attr('download', `${this.domain}.mld`);
          node(link).click();
          link.remove();
          URL.revokeObjectURL(blobUrl);
          resolve();
        } catch (err) {
          reject(err);
        }
      }, reject);
    }));
  }

  async loadDomain() {
    if (this.previousDomain !== this.domain) {
      if (this.unsaved && !window.confirm(CONFIRM_CHANGE_DOMAIN))
        return this.domain = this.previousDomain ?? '';
      try {
        this.loading = true;
        await this.close();
        this.updatesLog.selectAll('.update-card').remove();
        const config = await fetchConfig(this.domain);
        this.domain = this.previousDomain = config['@domain'];
        Object.assign(config['@context'] ??= {}, this.options.context);
        this.clone = await clone(new MemDown, this.remotes(config), config);
        this.clone.follow(update => this.onUpdate(update));
        await this.clone.status.becomes({ outdated: false });
        showInfo(`Connected to ${config['@domain']}`);
        this.runQuery('warn');
      } catch (err) {
        showWarning(err);
      } finally {
        this.loading = false;
      }
    }
  }

  private remotes(config: MeldAblyConfig) {
    return new AblyRemotes(config, { peering: new WrtcPeering(config) });
  }

  private onUpdate(update: MeldUpdate) {
    this.runQuery();
    const editorCard = new JsonEditorCard(
      this.updatesLog
        .insert(() => fromTemplate<HTMLDivElement>('update'), ':first-child')
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
        const subjects = await this.clone.read(pattern);
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

  get domainJoinIcon() {
    return d3.select('#domain-join');
  }

  get newDomainButton() {
    return d3.select('#domain-new');
  }

  get updatesLog() {
    return d3.select('#updates-log');
  }

  set loading(loading: boolean) {
    this.domainJoinIcon.classed('fa-spinner fa-spin', loading);
    this.domainJoinIcon.classed('fa-level-down-alt fa-rotate-90 is-hidden', !loading);
    d3.selectAll('.requires-domain').property('disabled', loading || !this.clone);
    this.newDomainButton.property('disabled', loading);
    this.domainInput.property('disabled', loading);
  }

  set querying(querying: boolean) {
    d3.select('#data-spinner').classed('is-hidden', !querying);
  }
}

class JsonEditorCard extends D3View<HTMLDivElement> {
  name?: string;
  jsonEditor: JSONEditor;
  created = Date.now();
  expanded: boolean = false;

  constructor(
    card: d3Selection<HTMLDivElement> | string,
    templates: object,
    options?: JSONEditorOptions,
    json?: any) {
    super(typeof card == 'string' ? d3.select(`#${card}-card`) : card);
    this.name = typeof card == 'string' ? card : undefined;
    this.d3.datum(this);

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

    this.linkButton?.on('click', () => {
      if (this.name != null) {
        const icon = this.linkButton.select('i');
        const link = new URL(window.location.href);
        link.hash = `#${stringify({ [this.name]: JSON.stringify(this.jsonEditor.get()) })}`
        navigator.clipboard.writeText(link.href).then(() => {
          icon.classed('fa-link', false).classed('fa-check', true);
          setTimeout(() => icon.classed('fa-check', false).classed('fa-link', true), 1000);
        });
      }
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

  get linkButton() {
    return this.d3.select<HTMLAnchorElement>('.card-link');
  }
}

function previewErrHtml(err: any): string {
  return `<i class="fas fa-exclamation-triangle" title="${err}"></i>`;
}