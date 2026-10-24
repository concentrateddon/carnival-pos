// Carnival POS — GAME / GRILL / PRIZE point of service.
// UI + mode flows. Card rules live in tickets.js, NFC access in nfc.js.

import { createNfc } from './nfc.js';
import {
  CARD_BYTES, getCount, grillItems, addTickets, removeTickets,
  serializeCard, fingerprint, estimateBytes,
} from './tickets.js';
import { unlockAudio, success, failure, tick, setKeepAwake } from './feedback.js';

const APP_VERSION = '1.0.0'; // keep in step with VERSION in sw.js
const MAX_AWARD = 999;
const OK_RESULT_MS = 4000;
const LOCK_MS = 1200; // ignore re-reads right after a tap/write so one tap is never handled twice
const PENDING_MS = 60000;

const $screen = document.getElementById('screen');
const $bar = document.getElementById('bar');
const $dialog = document.getElementById('dialog');

let nfc;
let mode = null; // 'GAME' | 'GRILL' | 'PRIZE' | null (mode picker)
let view = { screen: 'wait' };
let nfcState = { scanning: false, error: null };
let busy = false;
let lockUntil = 0;
let resultTimer = null;
let pendingWrite = null;
let installPrompt = null;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 'S'}`;

/* ---------------------------------------------------------------- views */

function setView(next) {
  clearTimeout(resultTimer);
  view = next;
  if (view.screen === 'result' && view.kind === 'ok') resultTimer = setTimeout(goWait, OK_RESULT_MS);
  render();
}

function goWait() {
  setView({ screen: 'wait' });
}

function notify(text, kind = 'error') {
  view = { ...view, notice: { text, kind } };
  if (kind === 'error') failure();
  render();
}

function showResult(kind, title, lines = []) {
  if (kind === 'ok') success(); else failure();
  setView({ screen: 'result', kind, title, lines });
}

function render() {
  const keep = $screen.scrollTop;
  renderBar();
  $screen.className = mode ? `mode-${mode}` : '';
  $screen.innerHTML = mode ? screens[view.screen](view) : modePicker();
  $screen.scrollTop = keep;
}

function renderBar() {
  if (!mode) {
    $bar.hidden = true;
    return;
  }
  $bar.hidden = false;
  const state = nfcState.scanning ? '<span class="dot on"></span>NFC READY' : '<span class="dot"></span>NFC OFF';
  $bar.innerHTML = `
    <span class="chip chip-${mode}">${mode}</span>
    <span class="nfc-state">${state}</span>
    <button class="small" data-act="change">CHANGE<br>MODE</button>`;
}

const NFC_ICON = `
  <svg class="nfc-icon" viewBox="0 0 120 120" aria-hidden="true">
    <rect x="34" y="14" width="52" height="92" rx="10" fill="none" stroke="currentColor" stroke-width="6"/>
    <path d="M52 48a14 14 0 0 1 0 24M62 40a26 26 0 0 1 0 40M72 32a38 38 0 0 1 0 56" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
  </svg>`;

function modePicker() {
  const supported = nfc && nfc.supported;
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  return `
    <div class="picker">
      <h1>CARNIVAL POS</h1>
      <p class="sub">What is this phone doing today?</p>
      ${supported ? '' : '<div class="notice error">NFC is not available here. Use <b>Chrome on an Android phone</b> with NFC turned on.</div>'}
      <button class="big mode-btn mode-GAME" data-act="pick" data-mode="GAME">GAME<small>Take a game ticket, award prizes</small></button>
      <button class="big mode-btn mode-GRILL" data-act="pick" data-mode="GRILL">GRILL<small>Sell meals and drinks</small></button>
      <button class="big mode-btn mode-PRIZE" data-act="pick" data-mode="PRIZE">PRIZE<small>Prize table: take prize tickets</small></button>
      <button class="big secondary" data-act="install">${standalone ? 'APP IS INSTALLED ✓' : 'INSTALL APP'}</button>
      <p class="version">v${APP_VERSION} · works offline</p>
    </div>`;
}

const MODE_HELP = {
  GAME: 'Tap the player’s card to start a game. One game ticket is taken.',
  GRILL: 'Tap a card to see its grill tickets.',
  PRIZE: 'Tap a card to see its prize tickets.',
};

function noticeHtml(v) {
  return v.notice ? `<div class="notice ${v.notice.kind}">${esc(v.notice.text)}</div>` : '';
}

function stepper(key, value, label) {
  return `
    <div class="stepper">
      <button class="step" data-act="step" data-key="${esc(key)}" data-d="-1" aria-label="Remove one ${esc(label)}">−</button>
      <output class="qty">${value}</output>
      <button class="step" data-act="step" data-key="${esc(key)}" data-d="1" aria-label="Add one ${esc(label)}">+</button>
    </div>`;
}

const screens = {
  wait(v) {
    const readBtn = nfcState.scanning ? '' : '<button class="big primary" data-act="read">READ CARD</button>';
    const err = nfcState.error ? `<div class="notice error">${esc(nfcState.error)}</div>` : '';
    return `
      <div class="center">
        ${NFC_ICON.replace('class="nfc-icon"', `class="nfc-icon${nfcState.scanning ? ' pulse' : ''}"`)}
        <h1>${nfcState.scanning ? 'TAP CARD' : 'PRESS READ CARD'}</h1>
        <p class="sub">${MODE_HELP[mode]}</p>
        ${noticeHtml(v)}${err}
        ${readBtn}
      </div>`;
  },

  result(v) {
    return `
      <div class="center result ${v.kind}">
        <h1>${esc(v.title)}</h1>
        ${v.lines.map((l) => `<p class="line">${esc(l)}</p>`).join('')}
        <button class="big primary" data-act="ok">OK</button>
      </div>`;
  },

  /* ---- GAME ---- */
  play(v) {
    return `
      <div class="stack">
        <div class="banner ok">GAME STARTED<br><small>${plural(v.left, 'GAME TICKET')} left on card</small></div>
        ${noticeHtml(v)}
        <h2>PRIZE TICKETS TO AWARD</h2>
        ${stepper('prizes', v.prizes, 'prize ticket')}
        <div class="row">
          <button class="big secondary" data-act="step" data-key="prizes" data-d="5">+5</button>
          <button class="big secondary" data-act="step" data-key="prizes" data-d="10">+10</button>
        </div>
        <div class="grow"></div>
        ${v.prizes > 0
          ? `<button class="big go" data-act="award">AWARD ${v.prizes}</button>`
          : '<button class="big secondary" data-act="finish">FINISH — NO PRIZES</button>'}
      </div>`;
  },

  award(v) {
    return `
      <div class="center">
        ${NFC_ICON.replace('class="nfc-icon"', 'class="nfc-icon pulse"')}
        <h1>TAP PLAYER’S CARD</h1>
        <p class="sub">to add ${plural(v.prizes, 'PRIZE TICKET')}</p>
        ${noticeHtml(v)}
        <button class="big cancel" data-act="cancel">CANCEL</button>
      </div>`;
  },

  /* ---- GRILL ---- */
  grillSelect(v) {
    const total = Object.values(v.qty).reduce((a, b) => a + b, 0);
    const rows = v.items.map((it) => `
      <div class="item">
        <div class="item-name">${esc(it.label)}<small>${it.count} on card</small></div>
        ${stepper(it.key, v.qty[it.key], it.label)}
      </div>`).join('');
    return `
      <div class="stack">
        <h2>GRILL TICKETS ON CARD</h2>
        ${noticeHtml(v)}
        <div class="items">${rows}</div>
        <div class="grow"></div>
        <button class="big go" data-act="commit" ${total ? '' : 'disabled'}>${total ? `SELL ${total}` : 'CHOOSE AMOUNT'}</button>
        <button class="big cancel" data-act="cancel">CANCEL</button>
      </div>`;
  },

  grillTap(v) {
    const lines = v.items.filter((it) => v.qty[it.key]).map((it) => `${v.qty[it.key]} × ${it.label}`);
    return tapAgain(v, 'SELLING', lines);
  },

  /* ---- PRIZE ---- */
  prizeSelect(v) {
    const key = (d) => `<button class="key" data-act="key" data-d="${d}">${d}</button>`;
    return `
      <div class="stack tight">
        <div class="balance">PRIZE TICKETS ON CARD<b>${v.available}</b></div>
        ${noticeHtml(v)}
        <div class="stepper">
          <button class="step" data-act="step" data-key="amount" data-d="-1" aria-label="Remove one">−</button>
          <output class="qty">${v.amount}</output>
          <button class="step" data-act="step" data-key="amount" data-d="1" aria-label="Add one">+</button>
        </div>
        <div class="keypad">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(key).join('')}
          <button class="key" data-act="key" data-d="back" aria-label="Backspace">⌫</button>
          ${key(0)}
          <button class="key" data-act="key" data-d="all">ALL</button>
        </div>
        <button class="big go" data-act="commit" ${v.amount ? '' : 'disabled'}>${v.amount ? `REDEEM ${v.amount}` : 'ENTER AMOUNT'}</button>
        <button class="big cancel" data-act="cancel">CANCEL</button>
      </div>`;
  },

  prizeTap(v) {
    return tapAgain(v, 'REDEEMING', [plural(v.amount, 'PRIZE TICKET')]);
  },
};

function tapAgain(v, verb, lines) {
  return `
    <div class="center">
      ${NFC_ICON.replace('class="nfc-icon"', 'class="nfc-icon pulse"')}
      <h1>TAP THE SAME CARD AGAIN</h1>
      <p class="sub">to finish.<br>${verb}:</p>
      ${lines.map((l) => `<p class="line">${esc(l)}</p>`).join('')}
      ${noticeHtml(v)}
      <button class="big cancel" data-act="cancel">CANCEL</button>
    </div>`;
}

/* -------------------------------------------------------------- card I/O */

class WriteFailed extends Error {}

/** Write `next` to the card that was just read. Remembers the attempt so a retry can't double-apply. */
async function writeCard(tag, next, onApplied) {
  const records = serializeCard(next);
  if (estimateBytes(records) > CARD_BYTES) {
    throw Object.assign(new Error('full'), { code: 'full' });
  }
  pendingWrite = { serial: tag.serial, afterFp: fingerprint(next), onApplied, at: Date.now() };
  try {
    await nfc.write(records);
  } catch {
    throw new WriteFailed();
  }
  pendingWrite = null;
}

async function onTag(tag) {
  if (!mode || busy || Date.now() < lockUntil) return;
  busy = true;
  try {
    if (tag.error) {
      notify('Could not read the card. Hold it flat against the back of the phone and try again.');
      return;
    }
    tick();
    if (view.screen === 'result') goWait();

    // A previous write may have landed even though it reported a failure.
    if (pendingWrite && Date.now() - pendingWrite.at < PENDING_MS
        && tag.serial === pendingWrite.serial && fingerprint(tag.card) === pendingWrite.afterFp) {
      const { onApplied } = pendingWrite;
      pendingWrite = null;
      onApplied();
      return;
    }
    await flows[mode][view.screen]?.(tag);
  } catch (err) {
    if (err instanceof WriteFailed) {
      notify('WRITE FAILED. Hold the card flat against the phone and tap it again.');
    } else if (err.code === 'full') {
      showResult('error', 'CARD IS FULL', ['This card has no room for more ticket types.']);
    } else {
      notify(err.message || 'Something went wrong. Try again.');
    }
  } finally {
    busy = false;
    lockUntil = Math.max(lockUntil, Date.now() + LOCK_MS);
  }
}

const sameCard = (view, tag) => !view.serial || !tag.serial || view.serial === tag.serial;

const flows = {
  GAME: {
    async wait(tag) {
      if (getCount(tag.card, 'GAME') < 1) {
        showResult('error', 'NO TICKETS', ['This card has no game tickets.']);
        return;
      }
      const next = removeTickets(tag.card, 'GAME', 1);
      await writeCard(tag, next, () => startPlay(next));
      startPlay(next);
    },
    async play() {
      notify('A game is in progress. Press AWARD when the player is finished.', 'warn');
    },
    async award(tag) {
      const prizes = view.prizes;
      const next = addTickets(tag.card, 'PRIZE', prizes);
      const done = () => showResult('ok', `AWARDED ${prizes}`, [`Card now has ${plural(getCount(next, 'PRIZE'), 'PRIZE TICKET')}.`]);
      await writeCard(tag, next, done);
      done();
    },
  },

  GRILL: {
    async wait(tag) {
      const items = grillItems(tag.card);
      if (!items.length) {
        showResult('error', 'NO TICKETS', ['This card has no grill tickets.']);
        return;
      }
      const qty = Object.fromEntries(items.map((it) => [it.key, 0]));
      if (items.length === 1) qty[items[0].key] = 1;
      setView({ screen: 'grillSelect', serial: tag.serial, card: tag.card, fp: fingerprint(tag.card), items, qty });
    },
    async grillSelect(tag) {
      await flows.GRILL.wait(tag); // tapping a different card simply replaces the one on screen
    },
    async grillTap(tag) {
      if (!sameCard(view, tag)) {
        notify('WRONG CARD. Tap the same card that was read first, or press CANCEL.');
        return;
      }
      if (fingerprint(tag.card) !== view.fp) {
        showResult('error', 'CARD CHANGED', ['The card is different from the first tap.', 'Nothing was sold. Start over.']);
        return;
      }
      let next = tag.card;
      for (const it of view.items) if (view.qty[it.key]) next = removeTickets(next, it.key, view.qty[it.key]);
      const sold = view.items.filter((it) => view.qty[it.key]).map((it) => `${view.qty[it.key]} × ${it.label}`);
      const done = () => {
        const left = grillItems(next).map((it) => `${it.count} × ${it.label}`);
        showResult('ok', 'SOLD', [...sold, left.length ? `Left on card: ${left.join(', ')}` : 'No grill tickets left on card.']);
      };
      await writeCard(tag, next, done);
      done();
    },
  },

  PRIZE: {
    async wait(tag) {
      const available = getCount(tag.card, 'PRIZE');
      if (available < 1) {
        showResult('error', 'NO TICKETS', ['This card has no prize tickets.']);
        return;
      }
      setView({ screen: 'prizeSelect', serial: tag.serial, fp: fingerprint(tag.card), available, amount: 0 });
    },
    async prizeSelect(tag) {
      await flows.PRIZE.wait(tag);
    },
    async prizeTap(tag) {
      if (!sameCard(view, tag)) {
        notify('WRONG CARD. Tap the same card that was read first, or press CANCEL.');
        return;
      }
      if (fingerprint(tag.card) !== view.fp) {
        showResult('error', 'CARD CHANGED', ['The card is different from the first tap.', 'Nothing was redeemed. Start over.']);
        return;
      }
      const amount = view.amount;
      const next = removeTickets(tag.card, 'PRIZE', amount);
      const done = () => showResult('ok', `REDEEMED ${amount}`, [`${plural(getCount(next, 'PRIZE'), 'PRIZE TICKET')} left on card.`]);
      await writeCard(tag, next, done);
      done();
    },
  },
};

function startPlay(card) {
  success();
  setView({ screen: 'play', prizes: 0, left: getCount(card, 'GAME') });
}

/* --------------------------------------------------------------- actions */

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

const actions = {
  async pick({ mode: m }) {
    unlockAudio();
    setKeepAwake(true);
    mode = m;
    pendingWrite = null;
    goWait();
    await startNfc();
  },

  async install() {
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      render();
    } else {
      showDialog(installHelp());
    }
  },

  async change() {
    const risky = ['play', 'award', 'grillTap', 'prizeTap'].includes(view.screen);
    if (risky) {
      const msg = mode === 'GAME'
        ? 'The player’s game ticket has already been used. Prizes not yet awarded will be lost.'
        : 'This sale is not finished. Nothing will be taken from the card.';
      if (!(await confirmDialog('LEAVE THIS MODE?', msg, 'LEAVE'))) return;
    }
    mode = null;
    pendingWrite = null;
    clearTimeout(resultTimer);
    nfc.stop();
    nfcState = { scanning: false, error: null };
    setKeepAwake(false);
    render();
  },

  read: () => startNfc(),
  ok: goWait,
  finish: goWait,

  cancel() {
    if (view.screen === 'award') setView({ screen: 'play', prizes: view.prizes, left: view.left });
    else goWait();
  },

  step({ key, d }) {
    const delta = Number(d);
    if (key === 'prizes') {
      setView({ ...view, notice: null, prizes: clamp(view.prizes + delta, 0, MAX_AWARD) });
    } else if (key === 'amount') {
      setView({ ...view, notice: null, amount: clamp(view.amount + delta, 0, view.available) });
    } else {
      const it = view.items.find((x) => x.key === key);
      setView({ ...view, notice: null, qty: { ...view.qty, [key]: clamp(view.qty[key] + delta, 0, it.count) } });
    }
  },

  key({ d }) {
    let amount = view.amount;
    if (d === 'back') amount = Math.floor(amount / 10);
    else if (d === 'all') amount = view.available;
    else amount = amount * 10 + Number(d);
    setView({ ...view, notice: null, amount: clamp(amount, 0, view.available) });
  },

  award() {
    setView({ screen: 'award', prizes: view.prizes, left: view.left });
  },

  commit() {
    if (mode === 'GRILL') setView({ ...view, screen: 'grillTap', notice: null });
    else setView({ ...view, screen: 'prizeTap', notice: null });
  },
};

$screen.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act]');
  if (btn && !btn.disabled) actions[btn.dataset.act]?.(btn.dataset);
});
$bar.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act]');
  if (btn) actions[btn.dataset.act]?.(btn.dataset);
});

/* ----------------------------------------------------------------- misc */

async function startNfc() {
  const ok = await nfc.start();
  nfcState = { scanning: ok, error: ok ? null : nfcState.error };
  render();
}

function showDialog(html) {
  $dialog.innerHTML = html;
  $dialog.returnValue = '';
  $dialog.showModal();
}

function confirmDialog(title, text, yes) {
  return new Promise((resolve) => {
    showDialog(`
      <h2>${esc(title)}</h2>
      <p>${esc(text)}</p>
      <form method="dialog" class="dialog-actions">
        <button class="big cancel" value="no">STAY</button>
        <button class="big go" value="yes">${esc(yes)}</button>
      </form>`);
    $dialog.addEventListener('close', () => resolve($dialog.returnValue === 'yes'), { once: true });
  });
}

function installHelp() {
  const ios = /iphone|ipad/i.test(navigator.userAgent);
  const steps = ios
    ? '<li>Tap the <b>Share</b> button.</li><li>Choose <b>Add to Home Screen</b>.</li>'
    : '<li>Tap the <b>⋮ menu</b> (top right of Chrome).</li><li>Choose <b>Install app</b> or <b>Add to Home screen</b>.</li><li>Tap <b>Install</b>.</li>';
  return `
    <h2>INSTALL THE APP</h2>
    <ol>${steps}</ol>
    <p>After installing, open <b>Carnival POS</b> from the home screen. It works with no internet.</p>
    <form method="dialog" class="dialog-actions"><button class="big primary" value="ok">OK</button></form>`;
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
  render();
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && mode && !nfcState.scanning) startNfc();
});

// Block the context menu / long-press selection that older phones show on big buttons.
document.addEventListener('contextmenu', (e) => e.preventDefault());

async function boot() {
  nfc = await createNfc();
  nfc.onTag = onTag;
  nfc.onStatus = (s) => {
    nfcState = { scanning: s.scanning, error: s.error || null };
    if (mode) render();
  };
  render();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

boot();
