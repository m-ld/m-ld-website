import { D3View } from './D3View';
import { d3Selection } from './d3Util';
import * as d3 from 'd3';

export class DetailsCard extends D3View<HTMLDivElement> {
  name?: string;
  expanded: boolean = false;

  constructor(
    card: d3Selection<HTMLDivElement> | string
  ) {
    super(typeof card == 'string' ? d3.select(`#${card}-card`) : card);
    this.name = typeof card == 'string' ? card : undefined;
    this.d3.datum(this);
    this.expanded = !this.content.classed('is-hidden');
    this.setToggleState();
    this.toggle.on('click', () => this.onToggle());
  }

  protected onToggle() {
    this.expanded = this.content.classed('is-hidden');
    this.content.classed('is-hidden', !this.expanded);
    this.setToggleState();
  }

  private setToggleState() {
    this.icon.classed('fa-angle-up', this.expanded);
    this.icon.classed('fa-angle-down', !this.expanded);
  }

  get title() {
    return this.d3.select<HTMLDivElement>('.card-header-title');
  }

  get content() {
    return this.d3.select<HTMLDivElement>('.card-content');
  }

  get toggle() {
    return this.d3.select<HTMLAnchorElement>('.card-toggle');
  }

  get icon() {
    return this.toggle.select('.fa');
  }
}