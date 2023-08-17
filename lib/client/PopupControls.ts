import * as d3 from 'd3';
import { d3Selection, fromTemplate, node } from './d3Util';
import * as LOG from 'loglevel';
import { Grecaptcha } from '@m-ld/io-web-runtime/dist/client';

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
    return currentGrecaptcha = showMessage<string>('info', 'Excuse us, we just need to check...',
      message => Grecaptcha.render(node(message.append('div'))))
      .finally(() => currentGrecaptcha = undefined);
}

export function showMessage<T = unknown>(type: 'warning' | 'info', msg: string,
  complete: (message: d3Selection<HTMLElement>) => Promise<T>
) {
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

export function loadingFinished() {
  d3.select(document.body).classed('loading', false);
  d3.select('#loading-progress').classed('is-active', false);
  d3.select('#board-href').text(window.location.href);
}

function showHelp(show?: boolean) {
  const help = d3.select('#help');
  show ??= help.classed('is-hidden');
  help.classed('is-hidden', !show);
}

export function showAbout(active = true) {
  showHelp(false);
  d3.select('#board-about').classed('is-active', active);
  if (!active && d3.select('body').classed('loading'))
    d3.select('#loading-progress').classed('is-active', true);
}

export function initPopupControls() {
  // Show & un-show buttons
  d3.select('#help .delete').on('click', showHelp);
  d3.select('#show-help').on('click', showHelp);
  d3.selectAll('.show-about').on('mousedown', () => showAbout());
  d3.select('#board-about .delete').on('mousedown', () => {
    d3.event.preventDefault();
    return showAbout(false);
  });
  initShareButton(d3.selectAll('.share-board'), {
    event: 'mousedown', info: 'Board location copied to clipboard!\n' +
      'Paste it into an email to send it to your friends.'
  });
}

export function initShareButton(
  btn: d3Selection<HTMLElement>,
  opts: { event?: string, info?: string, getHash?: () => string } = {}
) {
  const icon = btn.select<HTMLElement>('i');
  if (!icon.empty()) {
    const faIcon = [...node(icon).classList].find(cls => cls.startsWith('fa-'));
    if (faIcon == null)
      throw new RangeError('Share button has no icon');
    btn.on(opts.event || 'click', () => {
      const link = new URL(window.location.href);
      if (opts.getHash)
        link.hash = `#${opts.getHash()}`;
      navigator.clipboard.writeText(link.href)
        .then(() => {
          icon.classed(faIcon, false)
            .classed('fa-check', true);
          setTimeout(() => icon
            .classed('fa-check', false)
            .classed(faIcon, true), 1000);
          if (opts.info)
            showInfo(opts.info);
        })
        .catch(showWarning);
    });
  }
}
