'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { calculatePert, getScenario, estimateFromAnalysis } = require('../src/pert/pertEngine');
const { COMPLEXITY_LEVELS } = require('../src/shared/constants');

test('calculatePert: aplica a fórmula (O + 4M + P) / 6 corretamente', () => {
  // Cenário Baixa: O=2, M=4, P=6 => (2 + 16 + 6) / 6 = 4
  assert.equal(calculatePert(2, 4, 6), 4);
  // Cenário Média: O=6, M=10, P=16 => (6 + 40 + 16) / 6 = 10.333...
  assert.equal(calculatePert(6, 10, 16), 10.33);
  // Cenário Alta: O=12, M=20, P=32 => (12 + 80 + 32) / 6 = 20.666...
  assert.equal(calculatePert(12, 20, 32), 20.67);
});

test('calculatePert: rejeita valores não numéricos', () => {
  assert.throws(() => calculatePert('a', 4, 6));
  assert.throws(() => calculatePert(2, undefined, 6));
});

test('getScenario: retorna os cenários O/M/P corretos por complexidade', () => {
  assert.deepEqual(getScenario(COMPLEXITY_LEVELS.BAIXA), { o: 2, m: 4, p: 6 });
  assert.deepEqual(getScenario(COMPLEXITY_LEVELS.MEDIA), { o: 6, m: 10, p: 16 });
  assert.deepEqual(getScenario(COMPLEXITY_LEVELS.ALTA), { o: 12, m: 20, p: 32 });
  assert.throws(() => getScenario('Inexistente'));
});

test('estimateFromAnalysis: retorna estimativa com justificativa textual não vazia', () => {
  const fakeAnalysis = {
    level: COMPLEXITY_LEVELS.MEDIA,
    totalScore: 12,
    dimensions: {
      funcional: { score: 3, detail: 'x' },
      tecnica: { score: 3, detail: 'y' },
      escopo: { score: 3, detail: 'z' },
      casosDeTeste: { score: 3, detail: 'w' },
    },
  };
  const result = estimateFromAnalysis(fakeAnalysis);
  assert.equal(result.hours, 10.33);
  assert.ok(result.justification.includes('Média'));
  assert.ok(result.justification.length > 0);
});

test('estimateFromAnalysis: justificativa é enxuta, sem repetir o detalhamento por dimensão', () => {
  // O detalhamento por dimensão já aparece no card de Análise de complexidade da UI — a
  // justificativa do PERT não deve duplicá-lo (motivo do ajuste pedido pela usuária).
  const fakeAnalysis = {
    level: COMPLEXITY_LEVELS.ALTA,
    totalScore: 27.1,
    dimensions: {
      funcional: { score: 10, detail: '40 termo(s) de regra/fluxo/validação/cálculo identificados' },
      tecnica: { score: 7.2, detail: '9 termo(s) técnico(s) identificados' },
      escopo: { score: 2.3, detail: '1 critério(s) de aceite' },
      casosDeTeste: { score: 7.6, detail: '19 caso(s) de teste já vinculado(s)' },
    },
  };
  const result = estimateFromAnalysis(fakeAnalysis);
  assert.ok(!result.justification.includes('termo(s)'), 'não deve repetir os detalhes de cada dimensão');
  assert.ok(!result.justification.includes('critério(s)'), 'não deve repetir os detalhes de cada dimensão');
  const lineCount = result.justification.split('\n').length;
  assert.ok(lineCount <= 2, `esperado no máximo 2 linhas, veio ${lineCount}`);
});
