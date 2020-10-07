import * as d3 from 'd3';

export function showNotModern(missing: string[]) {
  d3.select('#not-modern').classed('is-active', true)
    .select('#missing').text(`${missing.join(', ')}`);
}

export function showError(err: any) {
  d3.select('#error').classed('is-active', true)
    .select('.error-text').text(`${err}`);
}

export function showWarning(warn: any, action?: () => void) {
  console.warn(warn);
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

export function initPopupControls() {
  // Un-show buttons
  d3.select('#warning .delete').on('click', hideWarning);
  d3.select('#help .delete').on('click', showHelp);
  d3.select('#show-help').on('click', showHelp);
}
