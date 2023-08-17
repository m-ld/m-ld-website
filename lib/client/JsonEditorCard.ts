import JSONEditor, { JSONEditorOptions } from 'jsoneditor';
import { d3Selection } from './d3Util';
import * as d3 from 'd3';
import { DetailsCard } from './DetailsCard';
import * as querystring from 'querystring';
import { initShareButton } from './PopupControls';

const jsonStringify = require('json-stringify-pretty-compact');

export class JsonEditorCard extends DetailsCard {
  jsonEditor: JSONEditor;

  constructor(
    card: d3Selection<HTMLDivElement> | string,
    templates: object,
    options?: JSONEditorOptions,
    json?: any
  ) {
    super(card);

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

    if (this.name != null && this.linkButton != null) {
      initShareButton(this.linkButton, {
        getHash: () => querystring.stringify({
          [this.name!]: JSON.stringify(this.jsonEditor.get())
        })
      });
    }

    options?.onChange?.();
  }

  protected onToggle() {
    super.onToggle();
    this.preview.classed('is-hidden', this.expanded);
    if (this.expanded)
      this.jsonEditor.focus();
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
    this.jsonEditor.setText(jsonStringify(json, { maxLength: 64 }));
  }

  get preview() {
    return this.d3.select<HTMLPreElement>('.card-preview');
  }

  get templatesContent() {
    return this.d3.select('.templates-menu .dropdown-content');
  }

  get linkButton() {
    return this.d3.select<HTMLAnchorElement>('.card-link');
  }
}