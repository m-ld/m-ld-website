import * as d3 from 'd3';
import JSONEditor from 'jsoneditor';
import { D3View } from '../lib/client/D3View';
import { d3Selection, fromTemplate, node, Setup, setupJson } from '../lib/client/d3Util';
import { Grecaptcha, modernizd } from '@m-ld/io-web-runtime/dist/client';
import {
  initPopupControls, initShareButton, showInfo, showMessage, showNotModern, showWarning
} from '../lib/client/PopupControls';
import { fetchConfig } from '../lib/client/Api';
import { clone, isRead, isWrite, MeldClone, MeldUpdate } from '@m-ld/m-ld';
import { AblyRemotes, AblyWrtcRemotes } from '@m-ld/m-ld/ext/ably';
import { IoRemotes } from '@m-ld/m-ld/ext/socket.io';
import { MemoryLevel } from 'memory-level';
import { render as renderTime } from 'timeago.js';
import * as querystring from 'querystring';
import * as local from 'local-storage';
import { LevelDownResponse } from '../lib/client/LevelDownResponse';
import { saveAs } from 'file-saver';
import { JsonEditorCard } from '../lib/client/JsonEditorCard';
import { DetailsCard } from '../lib/client/DetailsCard';
import { Config } from '../lib/dto';

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

  const pg = new Playground(querystring.parse(window.location.hash.slice(1)));
  window.addEventListener('beforeunload', e => {
    if (pg.unsaved) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
  window.onunload = () => pg.close();
};

interface Options {
  context: {};
  gateway: Config.GatewayOptions;
}

class ContextCard extends DetailsCard {
  private readonly contextEditor: JSONEditor;

  constructor() {
    super('context');
    this.contextEditor = new JSONEditor(
      d3.select('#context-jsoneditor').node() as HTMLElement,
      {
        mode: 'code', mainMenuBar: false, statusBar: false,
        onChange: () => this.emit('change'),
        onValidate: json => ContextCard.validContext(json) ? [] : [{
          path: [], message: NOT_A_CONTEXT
        }]
      },
      {} // Default empty context
    );
  }

  get context() {
    return this.contextEditor.get();
  }

  set context(context: {}) {
    this.contextEditor.set(context);
  }

  get valid() {
    try {
      return ContextCard.validContext(this.context);
    } catch (e) {
      return false;
    }
  }

  static validContext(context: any): context is {} {
    return context != null && typeof context == 'object' && !Array.isArray(context);
  }
}

class GatewayCard extends DetailsCard {
  constructor() {
    super('gateway');
    const onChange = () => this.emit('change');
    this.useGatewayCheckbox.on('change', onChange);
    this.gatewayOriginInput.on('input', onChange);
    this.gatewayUserInput.on('input', onChange);
    this.gatewayKeyInput.on('input', onChange);
  }

  get gateway() {
    return {
      use: !!this.useGatewayCheckbox.property('checked'),
      origin: this.gatewayOriginInput.property('value'),
      user: this.gatewayUserInput.property('value'),
      key: this.gatewayKeyInput.property('value')
    };
  }

  get valid() {
    return node(this.gatewayOriginInput).validity.valid &&
      node(this.gatewayUserInput).validity.valid &&
      node(this.gatewayKeyInput).validity.valid;
  }

  get useGatewayCheckbox(): d3Selection<HTMLInputElement> {
    return d3.select('#use-gateway');
  }

  get gatewayOriginInput(): d3Selection<HTMLInputElement> {
    return d3.select('#gateway-origin');
  }

  get gatewayUserInput(): d3Selection<HTMLInputElement> {
    return d3.select('#gateway-user');
  }

  get gatewayKeyInput(): d3Selection<HTMLInputElement> {
    return d3.select('#gateway-key');
  }
}

class OptionsDialog extends D3View<HTMLDivElement> implements Options {
  private previous: Options;
  private contextCard: ContextCard;
  private gatewayCard: GatewayCard;

  constructor() {
    super(d3.select('#options-dialog'));
    const onChange = () => this.applyButton.property('disabled', !this.valid);
    this.contextCard = new ContextCard().on('change', onChange);
    this.gatewayCard = new GatewayCard().on('change', onChange);
    new DetailsCard('debug');
    this.applyButton.on('click', () => {
      this.d3.classed('is-active', false);
      this.emit('apply',
        ['context', 'gateway'].filter(this.optionChanged));
    });
    this.cancelButton.on('click', () => {
      this.d3.classed('is-active', false);
      this.contextCard.context = this.previous?.context ?? {};
      this.emit('cancel');
    });
  }

  show() {
    this.d3.classed('is-active', true);
    this.applyButton.property('disabled', true);
    const { context, gateway } = this;
    this.previous = { context, gateway };
  }

  get context() {
    return this.contextCard.context;
  }

  get gateway() {
    return this.gatewayCard.gateway;
  }

  get valid(): boolean {
    return this.contextCard.valid && this.gatewayCard.valid;
  }

  get applyButton() {
    return d3.select('#options-apply');
  }

  get cancelButton() {
    return d3.select('#options-cancel');
  }

  private optionChanged = (option: keyof Options) =>
    JSON.stringify(this[option]) !== JSON.stringify(this.previous?.[option]);
}

const NOT_A_READ = 'Query pattern is not a read operation';
const NOT_A_WRITE = 'Transaction pattern is not a write operation';
const NOT_A_CONTEXT = 'A m-ld context must be a JSON object';
const CONFIRM_CHANGE_DOMAIN = 'You may have unsaved data. Continue changing domain?';

// noinspection JSIgnoredPromiseFromCall, ES6MissingAwait
class Playground extends D3View<HTMLDivElement> {
  readonly queryCard: JsonEditorCard;
  readonly txnCard: JsonEditorCard;
  readonly dataEditor: JSONEditor;
  readonly options: OptionsDialog;

  private meld?: {
    clone: MeldClone,
    backend: MemoryLevel<string, Buffer>,
    config: Config.Response
  };
  private previousDomain?: string;

  constructor(setup: Setup) {
    super(d3.select('#playground-ide'));
    ////////////////////////////////////////////////////////////////////////////
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
    ////////////////////////////////////////////////////////////////////////////
    this.domain = typeof setup.domain == 'string' ? setup.domain : '';
    this.domainInput.on('keydown', () => {
      this.domainJoinIcon.classed('is-hidden', false);
      if (d3.event.key === 'Enter')
        this.loadDomain();
    });
    for (let newDomainElement of this.newDomainControls.nodes()) {
      const useGatewayDatum = newDomainElement.dataset.gateway;
      const useGateway = useGatewayDatum == null ? undefined : useGatewayDatum === 'true';
      d3.select(newDomainElement).on('click', () => {
        this.domain = '';
        this.loadDomain(useGateway);
      });
    }
    ////////////////////////////////////////////////////////////////////////////
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
    initShareButton(d3.select('#share-domain'), {
      getHash: () => querystring.stringify({ domain: this.domain }),
      info: 'Playground link copied to clipboard.'
    });
    d3.select('#show-options').on('click', () => this.options.show());
    ////////////////////////////////////////////////////////////////////////////
    this.options = new OptionsDialog();
    this.options.on('apply', changed => {
      if (changed.includes('context'))
        this.reloadDomain();
      if (changed.includes('gateway'))
        this.updateNewDefaults();
    });
    ////////////////////////////////////////////////////////////////////////////
    this.intro.classed('is-hidden', this.introHidden);
    this.intro.select('.delete').on('click', () => this.introHidden = true);
    d3.select('#show-intro').on('click', () => this.introHidden = false);
    ////////////////////////////////////////////////////////////////////////////
    this.loading = false;
    this.loadDomain();
    this.updateNewDefaults();
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

  async loadDomain(useGateway = this.options.gateway.use) {
    if (this.previousDomain === this.domain)
      return;
    if (this.unsaved && !window.confirm(CONFIRM_CHANGE_DOMAIN))
      return this.domain = this.previousDomain ?? '';
    this.doLoading(async () => {
      this.updatesLog.selectAll('.update-card').remove();
      const config = await fetchConfig(this.domain, {
        ...this.options.gateway, use: useGateway
      });
      this.domain = this.previousDomain = config['@domain'];
      const backend = new MemoryLevel<string, Buffer>();
      const meld = await this.clone(backend, config);
      await meld.clone.status.becomes({ outdated: false });
      showInfo(`Connected to ${config['@domain']}`);
    });
  }

  private async clone(backend: MemoryLevel<string, Buffer>, config: Config.Response) {
    const remoting = 'ably' in config ?
      'wrtc' in config ? AblyWrtcRemotes : AblyRemotes :
      IoRemotes;
    this.meld = {
      clone: await clone(backend, remoting, {
        ...config, '@context': { ...config['@context'], ...this.options.context }
      }),
      backend,
      config
    };
    this.meld.clone.follow(update => this.onUpdate(update));
    return this.meld;
  }

  reloadDomain() {
    if (this.meld == null)
      return;
    const { backend, config } = this.meld;
    this.doLoading(() => this.clone(backend, config));
  }

  async doLoading(loading: () => Promise<unknown>) {
    try {
      this.loading = true;
      await this.close();
      await loading();
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

  get newDomainControls(): d3Selection<HTMLElement> {
    return d3.selectAll('.domain-new');
  }

  private updateNewDefaults() {
    for (let el of this.newDomainControls.nodes())
      d3.select(el)
        .select('.domain-new-default')
        .classed('is-hidden',
          !(el.dataset.gateway === `${this.options.gateway.use}`));
  }

  get updatesLog() {
    return d3.select('#updates-log');
  }

  set loading(loading: boolean) {
    this.domainJoinIcon.classed('fa-spinner fa-spin', loading);
    this.domainJoinIcon.classed('fa-level-down-alt fa-rotate-90 is-hidden', !loading);
    d3.selectAll('.requires-domain').property('disabled', loading || !this.meld);
    this.newDomainControls.property('disabled', loading);
    this.domainInput.property('disabled', loading);
  }

  set querying(querying: boolean) {
    d3.select('#data-spinner').classed('is-hidden', !querying);
  }
}
