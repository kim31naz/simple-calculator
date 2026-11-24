export const MAX_DIGITS = 15;
export const MAX_HISTORY = 25;

export const OP_SYMBOLS = {
  '+': '+',
  '-': '−',
  '*': '×',
  '/': '÷',
};

export function createInitialState(history = []) {
  return {
    current: '0',
    previous: null,
    operator: null,
    waitingForOperand: false,
    lastOperand: null,
    lastOperator: null,
    expression: '',
    error: null,
    history: Array.isArray(history) ? history.slice(0, MAX_HISTORY) : [],
  };
}

export function cleanNumber(value) {
  if (!Number.isFinite(value)) {
    return null;
  }
  const normalized = Number(value.toPrecision(12));
  return Object.is(normalized, -0) ? 0 : normalized;
}

export function compute(a, b, operator) {
  switch (operator) {
    case '+':
      return cleanNumber(a + b);
    case '-':
      return cleanNumber(a - b);
    case '*':
      return cleanNumber(a * b);
    case '/':
      if (b === 0) return null;
      return cleanNumber(a / b);
    default:
      return cleanNumber(b);
  }
}

export function formatForDisplay(raw) {
  if (raw === null || raw === undefined) return '0';
  const str = String(raw);
  if (str === 'Error') return str;

  const num = Number(str);
  if (!Number.isFinite(num)) return 'Error';

  if (Math.abs(num) >= 1e12 || (num !== 0 && Math.abs(num) < 1e-9)) {
    return num.toExponential(6).replace(/\.?0+e/, 'e');
  }

  const isNegative = str.startsWith('-');
  const unsigned = isNegative ? str.slice(1) : str;
  const hasDot = unsigned.includes('.');
  const [intPart, decPart = ''] = unsigned.split('.');

  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = isNegative ? '−' : '';

  return hasDot ? `${sign}${formattedInt}.${decPart}` : `${sign}${formattedInt}`;
}

export function getClearLabel(state) {
  if (state.error) return 'AC';
  if (state.current !== '0' && !state.waitingForOperand) return 'C';
  return 'AC';
}

export function inputDigit(state, digit) {
  if (!/^[0-9]$/.test(digit)) return state;

  if (state.error) {
    return {
      ...createInitialState(state.history),
      current: digit,
    };
  }

  if (state.waitingForOperand) {
    return {
      ...state,
      current: digit,
      waitingForOperand: false,
      expression: state.operator ? state.expression : '',
    };
  }

  const digitCount = state.current.replace(/[^0-9]/g, '').length;
  if (digitCount >= MAX_DIGITS) return state;

  const next = state.current === '0' ? digit : state.current === '-0' ? `-${digit}` : state.current + digit;
  return {
    ...state,
    current: next,
  };
}

export function inputDecimal(state) {
  if (state.error) {
    return {
      ...createInitialState(state.history),
      current: '0.',
    };
  }

  if (state.waitingForOperand) {
    return {
      ...state,
      current: '0.',
      waitingForOperand: false,
      expression: state.operator ? state.expression : '',
    };
  }

  if (state.current.includes('.')) return state;

  return {
    ...state,
    current: `${state.current}.`,
  };
}

export function chooseOperator(state, nextOperator) {
  if (!OP_SYMBOLS[nextOperator]) return state;
  if (state.error) return state;

  const currentVal = Number(state.current);

  if (state.operator && state.waitingForOperand) {
    return {
      ...state,
      operator: nextOperator,
      expression: `${formatForDisplay(state.previous)} ${OP_SYMBOLS[nextOperator]}`,
    };
  }

  if (state.previous === null || state.operator === null) {
    return {
      ...state,
      previous: currentVal,
      operator: nextOperator,
      waitingForOperand: true,
      lastOperand: null,
      lastOperator: null,
      expression: `${formatForDisplay(currentVal)} ${OP_SYMBOLS[nextOperator]}`,
    };
  }

  const result = compute(state.previous, currentVal, state.operator);
  if (result === null) {
    return {
      ...createInitialState(state.history),
      error: 'Cannot divide by 0',
      expression: `${formatForDisplay(state.previous)} ${OP_SYMBOLS[state.operator]} ${formatForDisplay(currentVal)}`,
    };
  }

  return {
    ...state,
    current: String(result),
    previous: result,
    operator: nextOperator,
    waitingForOperand: true,
    lastOperand: null,
    lastOperator: null,
    expression: `${formatForDisplay(result)} ${OP_SYMBOLS[nextOperator]}`,
  };
}

export function evaluate(state) {
  if (state.error) return state;

  let left;
  let right;
  let op;

  if (state.operator !== null && state.previous !== null) {
    left = state.previous;
    right = Number(state.current);
    op = state.operator;
  } else if (state.lastOperator !== null && state.lastOperand !== null) {
    left = Number(state.current);
    right = state.lastOperand;
    op = state.lastOperator;
  } else {
    return state;
  }

  const exprText = `${formatForDisplay(left)} ${OP_SYMBOLS[op]} ${formatForDisplay(right)} =`;
  const result = compute(left, right, op);

  if (result === null) {
    return {
      ...createInitialState(state.history),
      error: 'Cannot divide by 0',
      expression: exprText,
    };
  }

  const resultStr = String(result);
  const entry = {
    expression: exprText,
    result: resultStr,
    display: formatForDisplay(resultStr),
  };

  return {
    ...state,
    current: resultStr,
    previous: null,
    operator: null,
    waitingForOperand: true,
    lastOperand: right,
    lastOperator: op,
    expression: exprText,
    error: null,
    history: [entry, ...state.history].slice(0, MAX_HISTORY),
  };
}

export function applyPercent(state) {
  if (state.error) return state;
  const currentVal = Number(state.current);

  let nextVal;
  if (state.previous !== null && (state.operator === '+' || state.operator === '-')) {
    nextVal = cleanNumber((state.previous * currentVal) / 100);
  } else {
    nextVal = cleanNumber(currentVal / 100);
  }

  if (nextVal === null) return state;
  return {
    ...state,
    current: String(nextVal),
    waitingForOperand: false,
  };
}

export function toggleSign(state) {
  if (state.error) return state;
  if (state.current === '0' || state.current === '0.') return state;

  const next = state.current.startsWith('-')
    ? state.current.slice(1)
    : `-${state.current}`;

  return {
    ...state,
    current: next,
    waitingForOperand: false,
  };
}

export function backspace(state) {
  if (state.error) {
    return createInitialState(state.history);
  }
  if (state.waitingForOperand) return state;

  if (state.current.length <= 1 || (state.current.length === 2 && state.current.startsWith('-'))) {
    return {
      ...state,
      current: '0',
    };
  }

  const trimmed = state.current.slice(0, -1);
  return {
    ...state,
    current: trimmed === '-' ? '0' : trimmed,
  };
}

export function clear(state) {
  if (getClearLabel(state) === 'C') {
    return {
      ...state,
      current: '0',
      waitingForOperand: false,
    };
  }
  return createInitialState(state.history);
}

export function clearAll(state) {
  return createInitialState(state.history);
}

export function loadFromHistory(state, resultValue) {
  const num = Number(resultValue);
  if (!Number.isFinite(num)) return state;
  return {
    ...state,
    current: String(num),
    waitingForOperand: false,
    error: null,
  };
}

export function clearHistory(state) {
  return {
    ...state,
    history: [],
  };
}
