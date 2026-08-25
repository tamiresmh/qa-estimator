'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateDecision } = require('../src/services/validationService');

test('validateDecision: aceitar não exige motivo, usa suggestedHours como final', () => {
  const result = validateDecision({
    action: 'aceitar',
    suggestedHours: 10.33,
  });
  assert.equal(result.finalHours, 10.33);
  assert.equal(result.reason, null);
  assert.equal(result.adjustedDelta, 0);
});

test('validateDecision: ajustar SEM motivo é aceito normalmente (motivo é opcional)', () => {
  const result = validateDecision({
    action: 'ajustar',
    suggestedHours: 10.33,
    finalHours: 14,
  });
  assert.equal(result.finalHours, 14);
  assert.equal(result.reason, null);
  assert.equal(result.adjustedDelta, 3.67);
});

test('validateDecision: ajustar COM motivo guarda o motivo informado', () => {
  const result = validateDecision({
    action: 'ajustar',
    suggestedHours: 10.33,
    finalHours: 14,
    reason: 'Regras de negócio adicionais descobertas em reunião de refinamento.',
  });
  assert.equal(result.finalHours, 14);
  assert.equal(result.adjustedDelta, 3.67);
  assert.equal(result.reason, 'Regras de negócio adicionais descobertas em reunião de refinamento.');
});

test('validateDecision: ajustar com motivo em branco normaliza para null', () => {
  const result = validateDecision({
    action: 'ajustar',
    suggestedHours: 10.33,
    finalHours: 14,
    reason: '   ',
  });
  assert.equal(result.reason, null);
});

test('validateDecision: ajustar sem finalHours numérico lança erro', () => {
  assert.throws(() =>
    validateDecision({ action: 'ajustar', suggestedHours: 10.33, finalHours: 'quatorze' })
  );
});

test('validateDecision: rejeita ação desconhecida', () => {
  assert.throws(() => validateDecision({ action: 'ignorar', suggestedHours: 4 }));
});

test('validateDecision: exige suggestedHours numérico', () => {
  assert.throws(() => validateDecision({ action: 'aceitar', suggestedHours: 'quatro' }));
});
