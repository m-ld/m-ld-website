import * as d3 from 'd3';
import { BoardLocal, CURRENT_VERSION } from './BoardLocal';
import { showInfo, showWarning } from './PopupControls';

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
  d3.selectAll('.new-board').on('mousedown', () => local.navigate('new'));
  d3.select('#go-home').on('mousedown', () => local.navigate('home'));

  local.on('dirty', dirty => d3.select('#save-board').property('disabled', !dirty));
  local.on('saving', saving => d3.select('#save-board').classed('is-loading', saving));
  // Actual clicking of the save button is handled in the Demo class

  local.on('online', online => d3.select('#online')
    .classed('is-success', online).classed('is-warning', !online));
  d3.select('#online').on('click', () => {
    if (local.online)
      showInfo('This browser is online, all good!');
    else
      showWarning('It looks like this browser is offline. ' +
        'You can keep working, but don\'t refresh the page.');
  });

  d3.select('.download-board').on(
    'mousedown', () => local.download());

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
          local.navigate(domain[1]);
        else
          showWarning('Sorry, we can\'t show that board, it was made with an older version.')
      });
    boardPicks.filter((_, i) => i > 0)
      .append('td').append('a').classed('tag is-delete', true)
      .attr('title', 'Remove this board')
      .on('mousedown', domain => showInfo(
        `Remove ${domain[1]} from this browser?`,
        () => local.removeDomain(domain).then(() => {
          showInfo(`Board ${domain[1]} has been removed from this browser.`);
          updateBoardPicks();
        }, showWarning)));
  }
}

