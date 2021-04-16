import * as d3 from 'd3';
import { d3Selection, fromTemplate, node } from './d3Util';
import * as LOG from 'loglevel';
import { Grecaptcha } from '@m-ld/io-web-runtime';

export function showNotModern(missing: string[]) {
  d3.select('#not-modern').classed('is-active', true)
    .select('#missing').text(`${missing.join(', ')}`);
}

export function showError(err: any, fallback?: { href: string, text: string }) {
  LOG.error(err);
  const errorPopup = d3.select('#error').classed('is-active', true);
  errorPopup.select('.error-text').text(`${err}`);
  if (fallback != null) {
    errorPopup.select('.error-fallback')
      .attr('href', fallback.href).text(fallback.text);
  }
  throw err;
}

export function showWarning(warn: any, action?: () => void | Promise<unknown>) {
  LOG.warn(warn);
  showMessage('warning', `${warn}`, messageAction(action));
}

export function showInfo(info: any, action?: () => void | Promise<unknown>) {
  showMessage('info', `${info}`, messageAction(action));
}

let currentGrecaptcha: Promise<string> | undefined;
export function showGrecaptcha() {
  if (currentGrecaptcha != null)
    return currentGrecaptcha;
  else
    return currentGrecaptcha = showMessage<string>('info', 'Are you still there?',
      message => Grecaptcha.render(node(message.append('div'))))
      .finally(() => currentGrecaptcha = undefined);
}

export function showMessage<T = unknown>(type: 'warning' | 'info', msg: string,
  complete: (message: d3Selection<HTMLElement>) => Promise<T>) {
  const message = d3.select('#popup-messages')
    .insert<HTMLElement>(() => fromTemplate(type), ':first-child')
    .classed('is-hidden', false).attr('id', null);
  message.select('.delete').on('click', () => message.remove());
  message.select('.popup-message-text').text(msg);
  return complete(message).finally(() => message.remove());
}

function messageTimeout() {
  return new Promise(resolve => setTimeout(resolve, 5000));
}

function messageAction(action?: () => void | Promise<unknown>) {
  return action ? (message: d3Selection) => new Promise<void>((resolve, reject) =>
    message.append('button').classed('button confirm', true).text('OK')
      .on('click', () => Promise.resolve(action()).then(resolve, reject))) : messageTimeout;
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
