import * as d3 from 'd3';
import JSONEditor, { JSONEditorOptions } from 'jsoneditor';
import { D3View } from '../lib/client/D3View';
import { parentWithClass } from '../lib/client/d3Util';
import { Grecaptcha, modernizd } from '@m-ld/io-web-runtime/dist/client';
import { initPopupControls, showNotModern, showWarning } from '../lib/client/PopupControls';
import { fetchConfig } from '../lib/client/Api';
import { clone, MeldApi, isRead, isWrite, Read, Describe } from '@m-ld/m-ld';
import { AblyRemotes } from '@m-ld/m-ld/dist/ably';
import MemDown from 'memdown';

window.onload = async function () {
  try {
    await modernizd([]);
  } catch (err) {
    return showNotModern(err);
  }
  initPopupControls();

  await Grecaptcha.ready;

  const pg = new Playground();
  window.onunload = () => pg.close();
};

const NOT_A_READ = 'Query pattern is not a read operation';
const NOT_A_WRITE = 'Transaction pattern is not a write operation';
const QUERY_TEMPLATES: { [key: string]: Read } = {
  'Describe all': {
    '@describe': '?s',
    '@where': { '@id': '?s' }
  } as Describe
};

class Playground {
  queryCard: JsonEditorCard;
  txnCard: JsonEditorCard;
  dataEditor: JSONEditor;
  meld?: MeldApi;

  constructor() {
    this.queryCard = new JsonEditorCard('query-jsoneditor', {
      mode: 'code', mainMenuBar: false, statusBar: false, onValidate: json =>
        isRead(json) ? [] : [{ path: [], message: NOT_A_READ }]
    }, QUERY_TEMPLATES['Describe all']);
    this.txnCard = new JsonEditorCard('txn-jsoneditor', {
      mode: 'code', mainMenuBar: false, statusBar: false, onValidate: json =>
        isWrite(json) ? [] : [{ path: [], message: NOT_A_WRITE }]
    });
    this.dataEditor = new JSONEditor(jsonEditorNode('data-jsoneditor'), {
      mode: 'view'
    }, []);
    this.domainInput.on('keydown', () => {
      if (d3.event.key === 'Enter')
        this.loadDomain();
    });
    d3.select('#query-templates-menu .dropdown-content')
      .selectAll('.dropdown-item').data(Object.entries(QUERY_TEMPLATES))
      .join('a').classed('dropdown-item', true).text(e => e[0])
      .on('click', e => this.queryCard.jsonEditor.set(e[1]));
    this.newDomainButton.on('click', () => {
      this.domainInput.property('value', '');
      this.loadDomain();
    });
    d3.select('#query-apply').on('click', () => {
      this.runQuery('warn');
    });
    this.loading = false;
  }

  async close() {
    if (this.meld != null)
      await this.meld.close();
    this.meld = undefined;
  }

  async loadDomain() {
    try {
      this.loading = true;
      await this.close();
      const config = await fetchConfig(this.domainInput.property('value'));
      this.domainInput.property('value', config['@domain']);
      this.meld = await clone(new MemDown, AblyRemotes, config);
      this.meld.follow().subscribe(() => {
        this.runQuery();
        // TODO prepend to log
      });
      await this.meld.status.becomes({ outdated: false });
      this.runQuery('warn');
    } catch (err) {
      showWarning(err);
    } finally {
      this.loading = false;
    }
  }

  async runQuery(warn?: 'warn') {
    if (this.meld != null) {
      try {
        this.querying = true;
        const pattern = this.queryCard.jsonEditor.get();
        if (!isRead(pattern))
          throw NOT_A_READ;
        const subjects = await this.meld.transact(pattern);
        this.dataEditor.update(subjects);
      } catch (err) {
        if (warn)
          showWarning(err);
      } finally {
        this.querying = false;
      }
    }
  }

  get domainInput() {
    return d3.select('#domain-input');
  }

  get newDomainButton() {
    return d3.select('#domain-new');
  }

  set loading(loading: boolean) {
    d3.select('#domain-spinner').classed('is-hidden', !loading);
    d3.selectAll('.requires-domain').property('disabled', loading || !this.meld);
    this.newDomainButton.property('disabled', loading);
    this.domainInput.property('disabled', loading);
  }

  set querying(querying: boolean) {
    d3.select('#data-spinner').classed('is-hidden', !querying);
  }
}

class JsonEditorCard extends D3View<HTMLDivElement> {
  jsonEditor: JSONEditor;

  constructor(jsonEditorId: string, options?: JSONEditorOptions, json?: any) {
    const editorNode = jsonEditorNode(jsonEditorId);
    super(d3.select(parentWithClass<HTMLDivElement>(editorNode, 'card')));

    this.toggle.on('click', () => {
      const show = this.content.classed('is-hidden');
      this.icon.classed('fa-angle-up', show);
      this.icon.classed('fa-angle-down', !show);
      this.content.classed('is-hidden', !show);
      this.preview.classed('is-hidden', show);
      if (show)
        this.jsonEditor.focus();
    });

    if (!this.preview.empty()) {
      const prevOnChange = options?.onChange;
      options = {
        ...options,
        onChange: async () => {
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
          prevOnChange?.();
        }
      };
    }

    this.jsonEditor = new JSONEditor(editorNode, options, json);
    options?.onChange?.();
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
}

function previewErrHtml(err: any): string {
  return `<i class="fas fa-exclamation-triangle" title="${err}"></i>`;
}

function jsonEditorNode(jsonEditorId: string) {
  return d3.select(`#${jsonEditorId}`).node() as HTMLDivElement;
}
