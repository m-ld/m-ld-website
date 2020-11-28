import * as d3 from 'd3';
import * as Level from 'level-js';
import { BoardLocal, CURRENT_VERSION } from './BoardLocal';
import { showError, showInfo, showWarning } from './PopupControls';

export function initBoardControls(local: BoardLocal) {
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

  function updateBoardPicks() {
    const boardPicks = boardPicker.select('#boards')
      .selectAll('.pick-board').data(local.domains)
      .join('tr').classed('pick-board', true)
      .html(''); // Remove previous content
    boardPicks
      .append('td').append('a').classed('dropdown-item', true)
      .classed('is-active', (_, i) => i == 0)
      .classed('is-disabled', domain => domain[0] !== CURRENT_VERSION)
      .text(domain => domain[1])
      .on('mousedown', domain => {
        if (domain[0] === CURRENT_VERSION)
          location.hash = domain[1];
        else
          showInfo('Sorry, we can\'t show that board, it was made with an older version.')
      });
    boardPicks.filter((_, i) => i > 0)
      .append('td').append('a').classed('tag is-delete is-danger', true)
      .attr('title', 'Remove this board')
      .on('mousedown', domain => showWarning(
        `Remove ${domain[1]} from this browser?`, () => deleteDomain(domain[1])));
  }

  function deleteDomain(domain: string) {
    // Level typing is wrong - destroy is a static method
    (<any>Level).destroy(domain, (err: any) => {
      if (err) {
        showError(err);
      } else {
        local.removeDomain(domain);
        showWarning(`Board ${domain} has been removed from this browser.`);
        updateBoardPicks();
      }
    });
  }
}

