import {
  applyPercent,
  backspace,
  chooseOperator,
  clear,
  clearAll,
  clearHistory,
  createInitialState,
  evaluate,
  formatForDisplay,
  getClearLabel,
  inputDecimal,
  inputDigit,
  loadFromHistory,
  toggleSign,
} from './calculator.js';

const STORAGE_THEME = 'calc_theme_v1';
const STORAGE_HISTORY = 'calc_history_v1';

const displayEl = document.getElementById('display');
const displayBtn = document.getElementById('display-btn');
const expressionEl = document.getElementById('expression');
const clearBtn = document.getElementById('clear-btn');
const copyToast = document.getElementById('copy-toast');
const keypad = document.querySelector('.keypad');
const themeToggle = document.getElementById('theme-toggle');
const historyToggle = document.getElementById('history-toggle');
const historyDrawer = document.getElementById('history-drawer');
const historyList = document.getElementById('history-list');
const historyEmpty = document.getElementById('history-empty');
const historyBadge = document.getElementById('history-badge');
const historyClearBtn = document.getElementById('history-clear');

function readStoredHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(STORAGE_HISTORY, JSON.stringify(history));
  } catch {
    // Ignore storage quota errors in restricted contexts
  }
}

function initTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem(STORAGE_THEME);
  } catch {
    saved = null;
  }
  const preferredDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const theme = saved === 'dark' || saved === 'light' ? saved : preferredDark ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(STORAGE_THEME, next);
  } catch {
    // Ignore storage errors
  }
}

let state = createInitialState(readStoredHistory());
let toastTimer = null;

function renderHistory() {
  const count = state.history.length;
  historyBadge.textContent = String(count);
  historyBadge.hidden = count === 0;
  historyEmpty.hidden = count > 0;
  historyClearBtn.hidden = count === 0;

  historyList.innerHTML = '';
  for (const item of state.history) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'history-item-btn';
    btn.dataset.result = item.result;

    const exprSpan = document.createElement('span');
    exprSpan.className = 'history-expr';
    exprSpan.textContent = item.expression;

    const resSpan = document.createElement('span');
    resSpan.className = 'history-res';
    resSpan.textContent = item.display;

    btn.append(exprSpan, resSpan);
    li.append(btn);
    historyList.append(li);
  }
}

function render() {
  const text = state.error ? state.error : formatForDisplay(state.current);
  displayEl.textContent = text;
  displayEl.classList.toggle('is-error', Boolean(state.error));
  displayEl.classList.toggle('is-compact', !state.error && text.length > 11);

  expressionEl.textContent = state.expression || '\u00A0';
  clearBtn.textContent = getClearLabel(state);

  document.querySelectorAll('.key-op').forEach((btn) => {
    const isActive = state.waitingForOperand && state.operator === btn.dataset.value;
    btn.classList.toggle('is-active', isActive);
  });

  renderHistory();
}

function updateState(nextState) {
  const prevHistory = state.history;
  state = nextState;
  if (state.history !== prevHistory) {
    saveHistory(state.history);
  }
  render();
}

function showCopiedToast() {
  copyToast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    copyToast.classList.remove('is-visible');
  }, 1300);
}

async function copyResult() {
  if (state.error) return;
  const raw = state.current;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(raw);
    } else {
      const temp = document.createElement('textarea');
      temp.value = raw;
      temp.setAttribute('readonly', '');
      temp.style.position = 'absolute';
      temp.style.left = '-9999px';
      document.body.append(temp);
      temp.select();
      document.execCommand('copy');
      temp.remove();
    }
    showCopiedToast();
  } catch {
    // Ignore clipboard failure
  }
}

function flashKey(keyAttr) {
  const btn = document.querySelector(`.key[data-key="${CSS.escape(keyAttr)}"]`);
  if (!btn) return;
  btn.classList.add('is-pressed');
  setTimeout(() => btn.classList.remove('is-pressed'), 110);
}

function handleAction(action, value) {
  switch (action) {
    case 'digit':
      updateState(inputDigit(state, value));
      break;
    case 'decimal':
      updateState(inputDecimal(state));
      break;
    case 'operator':
      updateState(chooseOperator(state, value));
      break;
    case 'equals':
      updateState(evaluate(state));
      break;
    case 'percent':
      updateState(applyPercent(state));
      break;
    case 'negate':
      updateState(toggleSign(state));
      break;
    case 'backspace':
      updateState(backspace(state));
      break;
    case 'clear':
      updateState(clear(state));
      break;
    default:
      break;
  }
}

keypad.addEventListener('click', (event) => {
  const btn = event.target.closest('button.key');
  if (!btn) return;
  handleAction(btn.dataset.action, btn.dataset.value);
});

displayBtn.addEventListener('click', copyResult);
themeToggle.addEventListener('click', toggleTheme);

historyToggle.addEventListener('click', () => {
  const isOpen = !historyDrawer.hidden;
  historyDrawer.hidden = isOpen;
  historyToggle.setAttribute('aria-expanded', String(!isOpen));
});

historyList.addEventListener('click', (event) => {
  const btn = event.target.closest('.history-item-btn');
  if (!btn) return;
  updateState(loadFromHistory(state, btn.dataset.result));
  historyDrawer.hidden = true;
  historyToggle.setAttribute('aria-expanded', 'false');
});

historyClearBtn.addEventListener('click', () => {
  updateState(clearHistory(state));
});

window.addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;

  const { key } = event;

  if (/^[0-9]$/.test(key)) {
    event.preventDefault();
    flashKey(key);
    handleAction('digit', key);
    return;
  }

  if (key === '.' || key === ',') {
    event.preventDefault();
    flashKey('.');
    handleAction('decimal');
    return;
  }

  if (key === '+' || key === '-' || key === '*' || key === '/') {
    event.preventDefault();
    flashKey(key);
    handleAction('operator', key);
    return;
  }

  if (key === 'x' || key === 'X') {
    event.preventDefault();
    flashKey('*');
    handleAction('operator', '*');
    return;
  }

  if (key === 'Enter' || key === '=') {
    event.preventDefault();
    flashKey('Enter');
    handleAction('equals');
    return;
  }

  if (key === 'Backspace') {
    event.preventDefault();
    flashKey('Backspace');
    handleAction('backspace');
    return;
  }

  if (key === '%') {
    event.preventDefault();
    flashKey('%');
    handleAction('percent');
    return;
  }

  if (key === 'Escape') {
    event.preventDefault();
    flashKey('Escape');
    updateState(clearAll(state));
    return;
  }

  if (key === 'Delete') {
    event.preventDefault();
    flashKey('Escape');
    handleAction('clear');
    return;
  }

  if (key === 'h' || key === 'H') {
    event.preventDefault();
    historyToggle.click();
  }
});

initTheme();
render();
