import * as d3 from 'd3';
import { fromTemplate } from './d3Util';
import * as LOG from 'loglevel';

export function showNotModern(missing: string[]) {
  d3.select('#not-modern').classed('is-active', true)
    .select('#missing').text(`${missing.join(', ')}`);
}

export function showError(err: any) {
  LOG.error(err);
  d3.select('#error').classed('is-active', true)
    .select('.error-text').text(`${err}`);
  throw err;
}

export function showWarning(warn: any, action?: () => void) {
  LOG.warn(warn);
  showMessage('warning', `${warn}`, action);
}

export function showInfo(info: any, action?: () => void) {
  showMessage('info', `${info}`, action);
}

function showMessage(type: 'warning' | 'info', msg: string, action?: () => void) {
  const message = d3.select('#popup-messages')
    .insert(() => fromTemplate(type), ':first-child')
    .classed('is-hidden', false).attr('id', null);
  message.select('.delete').on('click', () => message.remove());
  message.select('.popup-message-text').text(msg);
  if (action != null) {
    message.append('button').classed('button confirm', true).text('OK').on('click', () => {
      message.remove();
      action();
    });
  } else {
    setTimeout(() => message.remove(), 5000);
  }
}

export function showHelp() {
  const help = d3.select('#help');
  d3.select('#help').classed('is-hidden', !help.classed('is-hidden')).raise();
}

export function initPopupControls() {
  // Un-show buttons
  d3.select('#help .delete').on('click', showHelp);
  d3.select('#show-help').on('click', showHelp);
}
