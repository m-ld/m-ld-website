import { D3View } from './D3View';
import JSONEditor, { JSONEditorOptions } from 'jsoneditor';
import { d3Selection } from './d3Util';
import * as d3 from 'd3';

const stringify = require('json-stringify-pretty-compact');

export class JsonEditorCard extends D3View<HTMLDivElement> {
  name?: string;
  jsonEditor: JSONEditor;
  expanded: boolean = false;

  constructor(
    card: d3Selection<HTMLDivElement> | string,
    templates: object,
    options?: JSONEditorOptions,
    json?: any
  ) {
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
          // noinspection ES6MissingAwait
          this.updatePreview(options);
          prevOnChange?.();
        }
      };
    }

    this.jsonEditor = new JSONEditor(
      this.d3.select('.card-json').node() as HTMLElement, options);
    if (json)
      this.json = json;

    this.templatesContent
      .selectAll('.dropdown-item').data(Object.entries(templates))
      .join('a').classed('dropdown-item', true).text(e => e[0])
      .on('click', e => {
        this.jsonEditor.set(e[1]);
        // noinspection JSIgnoredPromiseFromCall
        this.updatePreview(options);
      });

    this.linkButton?.on('click', () => {
      if (this.name != null) {
        const icon = this.linkButton.select('i');
        const link = new URL(window.location.href);
        link.hash = `#${stringify({ [this.name]: JSON.stringify(this.jsonEditor.get()) })}`;
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
        this.preview.html(this.previewErrHtml(errs.map(err => err.message)));
      else
        this.preview.html(JSON.stringify(pattern));
    } catch (err) {
      this.preview.html(this.previewErrHtml('JSON not valid'));
    }
  }

  previewErrHtml(err: any): string {
    return `<i class="fas fa-exclamation-triangle" title="${err}"></i>`;
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

  get json() {
    return this.jsonEditor.get();
  }

  set json(json: any) {
    this.jsonEditor.setText(stringify(json, { maxLength: 64 }));
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