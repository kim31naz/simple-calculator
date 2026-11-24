import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyPercent,
  backspace,
  chooseOperator,
  clear,
  clearHistory,
  createInitialState,
  evaluate,
  formatForDisplay,
  inputDecimal,
  inputDigit,
  loadFromHistory,
  toggleSign,
} from '../public/calculator.js';

function pressSequence(steps, initial = createInitialState()) {
  let state = initial;
  for (const step of steps) {
    if (/^[0-9]$/.test(step)) state = inputDigit(state, step);
    else if (step === '.') state = inputDecimal(state);
    else if (['+', '-', '*', '/'].includes(step)) state = chooseOperator(state, step);
    else if (step === '=') state = evaluate(state);
    else if (step === '%') state = applyPercent(state);
    else if (step === '±') state = toggleSign(state);
    else if (step === '⌫') state = backspace(state);
    else if (step === 'C') state = clear(state);
    else throw new Error(`Unknown step: ${step}`);
  }
  return state;
}

test('basic arithmetic and floating point precision', () => {
  const sum = pressSequence(['0', '.', '1', '+', '0', '.', '2', '=']);
  assert.equal(sum.current, '0.3');
  assert.equal(sum.error, null);
  assert.equal(sum.history.length, 1);

  const mul = pressSequence(['1', '2', '5', '*', '4', '=']);
  assert.equal(mul.current, '500');
  assert.equal(formatForDisplay(mul.current), '500');
});

test('chained operations and repeated equals', () => {
  const chained = pressSequence(['2', '+', '3', '*', '4', '=']);
  assert.equal(chained.current, '20');

  const repeated = pressSequence(['5', '+', '2', '=', '=', '=']);
  assert.equal(repeated.current, '11');
});

test('percentage behavior for additive vs standalone', () => {
  const addedPercent = pressSequence(['2', '0', '0', '+', '1', '0', '%', '=']);
  assert.equal(addedPercent.current, '220');

  const standalonePercent = pressSequence(['5', '0', '%']);
  assert.equal(standalonePercent.current, '0.5');
});

test('sign toggle, backspace, and smart clear', () => {
  const negated = pressSequence(['4', '2', '±']);
  assert.equal(negated.current, '-42');

  const backspaced = pressSequence(['1', '2', '3', '⌫']);
  assert.equal(backspaced.current, '12');

  const smartClear = pressSequence(['9', '+', '5', 'C', '3', '=']);
  assert.equal(smartClear.current, '12');
});

test('division by zero recovers cleanly on next digit', () => {
  const errState = pressSequence(['8', '/', '0', '=']);
  assert.equal(errState.error, 'Cannot divide by 0');

  const recovered = inputDigit(errState, '7');
  assert.equal(recovered.error, null);
  assert.equal(recovered.current, '7');
});

test('history recall and clear', () => {
  const s1 = pressSequence(['9', '*', '9', '=']);
  assert.equal(s1.history[0].result, '81');

  const s2 = loadFromHistory(pressSequence(['1', '0', '+'], s1), s1.history[0].result);
  const s3 = evaluate(s2);
  assert.equal(s3.current, '91');

  const cleared = clearHistory(s3);
  assert.equal(cleared.history.length, 0);
});
