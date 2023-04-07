import * as d3 from 'd3';
import JSONEditor from 'jsoneditor';
import { D3View } from '../lib/client/D3View';
import { fromTemplate, Setup, setupJson } from '../lib/client/d3Util';
import { Grecaptcha, modernizd } from '@m-ld/io-web-runtime/dist/client';
import { initPopupControls, showInfo, showMessage, showNotModern, showWarning } from '../lib/client/PopupControls';
import { fetchConfig } from '../lib/client/Api';
import { clone, isRead, isWrite, MeldClone, MeldUpdate } from '@m-ld/m-ld';
import { AblyWrtcRemotes } from '@m-ld/m-ld/ext/ably';
import { MemoryLevel } from 'memory-level';
import { render as renderTime } from 'timeago.js';
import { parse } from 'querystring';
import * as local from 'local-storage';
import { LevelDownResponse } from '../lib/client/LevelDownResponse';
import { saveAs } from 'file-saver';
import { JsonEditorCard } from '../lib/client/JsonEditorCard';

// Ensure that the SHACL plugin exists for schema constraints
require('@m-ld/m-ld/ext/shacl');
globalThis.require = require;

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

// noinspection JSIgnoredPromiseFromCall, ES6MissingAwait
class Playground extends D3View<HTMLDivElement> {
  queryCard: JsonEditorCard;
  txnCard: JsonEditorCard;
  dataEditor: JSONEditor;
  meld?: { clone: MeldClone, backend: MemoryLevel<string, Buffer> };
  options: OptionsDialog;
  previousDomain?: string;

  constructor(setup: Setup) {
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
      if (this.meld != null) {
        try {
          const pattern = this.txnCard.jsonEditor.get();
          if (!isWrite(pattern))
            return showWarning(NOT_A_WRITE);
          await this.meld.clone.write(pattern);
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
    if (this.meld != null)
      await this.meld.clone.close();
    delete this.meld;
  }

  get unsaved() {
    return this.meld?.clone.status.value.silo;
  }

  async downloadClone() {
    if (this.meld != null) {
      return this.meld!.clone.read(async () => {
        if (this.meld != null) {
          const blob = await LevelDownResponse.readFrom(
            this.meld.backend, 'application/json').blob();
          saveAs(blob, `${this.domain}.json`);
        } else {
          throw 'Local clone has closed';
        }
      });
    }
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
        const backend = new MemoryLevel<string, Buffer>();
        this.meld = { clone: await clone(backend, AblyWrtcRemotes, config), backend };
        this.meld.clone.follow(update => this.onUpdate(update));
        await this.meld.clone.status.becomes({ outdated: false });
        showInfo(`Connected to ${config['@domain']}`);
        this.runQuery('warn');
      } catch (err) {
        showWarning(err);
      } finally {
        this.loading = false;
      }
    }
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
    if (this.meld != null) {
      try {
        this.querying = true;
        const pattern = this.queryCard.jsonEditor.get();
        if (!isRead(pattern))
          return warn && showWarning(NOT_A_READ);
        const subjects = await this.meld.clone.read(pattern);
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
    d3.selectAll('.requires-domain').property('disabled', loading || !this.meld);
    this.newDomainButton.property('disabled', loading);
    this.domainInput.property('disabled', loading);
  }

  set querying(querying: boolean) {
    d3.select('#data-spinner').classed('is-hidden', !querying);
  }
}