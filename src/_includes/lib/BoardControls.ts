import * as d3 from 'd3';
import * as local from 'local-storage';
import * as Level from 'level-js';

export function showCantDemo(missing: string[]) {
  d3.select('#cant-demo').classed('is-active', true)
    .select('#missing').text(`${missing.join(', ')}`);
}

export function showError(err: any) {
  d3.select('#error').classed('is-active', true)
    .select('.error-text').text(`${err}`);
}

export function showWarning(warn: any, action?: () => void) {
  const notification = d3.select('#warning').classed('is-hidden', false).raise();
  const text = `${warn}`;
  notification.select('.warning-text').text(text);
  if (action != null) {
    notification.append('button').classed('button confirm', true).text('OK').on('click', () => {
      hideWarning();
      action();
    });
  } else {
    setTimeout(hideWarning, text.length * 100);
  }
}

export function hideWarning() {
  d3.select('#warning').classed('is-hidden', true).select('.confirm').remove();
}

export function showHelp() {
  const help = d3.select('#help');
  d3.select('#help').classed('is-hidden', !help.classed('is-hidden')).raise();
}

export function getLocalDomains(): string[] {
  return local.get<string[]>('m-ld.domains') ?? [];
}

export function addLocalDomain(domain: string) {
  let localDomains = getLocalDomains();
  localDomains = localDomains.filter(d => d !== domain);
  localDomains.unshift(domain);
  local.set<string[]>('m-ld.domains', localDomains);
}

export function initControls() {
  // Un-show buttons
  d3.select('#warning .delete').on('click', hideWarning);
  d3.select('#help .delete').on('click', () => showHelp());

  // Board menu dropdown
  const boardPicker = d3.select('#board-menu');
  d3.select('#board-menu button')
    .on('click', () => {
      const show = !boardPicker.classed('is-active');
      if (show)
        updateBoardPicks();
      boardPicker.classed('is-active', show);
    })
    .on('blur', () => d3.select('#board-menu').classed('is-active', false));
  d3.select('#new-board').on('mousedown', () => location.hash = 'new');
  d3.select('#show-help').on('click', () => showHelp());

  function updateBoardPicks() {
    const localDomains = local.get<string[]>('m-ld.domains') ?? [];
    const boardPicks = boardPicker.select('#boards')
      .selectAll('.pick-board').data(localDomains)
      .join('tr').classed('pick-board', true)
      .html(''); // Remove previous content
    boardPicks
      .append('td').append('a').classed('dropdown-item', true)
      .classed('is-active', (_, i) => i == 0)
      .text(domain => domain)
      .on('mousedown', domain => location.hash = domain);
    boardPicks.filter((_, i) => i > 0)
      .append('td').append('a').classed('tag is-delete is-danger', true)
      .attr('title', 'Remove this board')
      .on('mousedown', domain => showWarning(
        `Remove ${domain} from this browser?`, () => deleteDomain(domain)));
  }

  function deleteDomain(domain: string) {
    const localDomains = local.get<string[]>('m-ld.domains') ?? [];
    // Level typing is wrong - destroy is a static method
    (<any>Level).destroy(domain, (err: any) => {
      if (err) {
        showError(err);
      } else {
        local.set<string[]>('m-ld.domains', localDomains.filter(d => d !== domain));
        showWarning(`Board ${domain} has been removed from this browser.`);
        updateBoardPicks();
      }
    });
  }
}

