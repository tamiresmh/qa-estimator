'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzeComplexity, classify } = require('../src/analysis/complexityAnalyzer');
const { COMPLEXITY_LEVELS } = require('../src/shared/constants');

test('classify: respeita os limiares Baixa<8, Média<18, Alta>=18', () => {
  assert.equal(classify(0), COMPLEXITY_LEVELS.BAIXA);
  assert.equal(classify(7.9), COMPLEXITY_LEVELS.BAIXA);
  assert.equal(classify(8), COMPLEXITY_LEVELS.MEDIA);
  assert.equal(classify(17.9), COMPLEXITY_LEVELS.MEDIA);
  assert.equal(classify(18), COMPLEXITY_LEVELS.ALTA);
  assert.equal(classify(40), COMPLEXITY_LEVELS.ALTA);
});

test('analyzeComplexity: US simples e curta resulta em complexidade Baixa', () => {
  const story = {
    title: 'Ajustar texto de um botão',
    description: 'Trocar o texto do botão de "Enviar" para "Confirmar".',
    acceptanceCriteria: '- O botão deve exibir o novo texto',
    relatedLinks: [],
    linkedTestCases: [],
  };
  const result = analyzeComplexity(story);
  assert.equal(result.level, COMPLEXITY_LEVELS.BAIXA);
  assert.ok(result.totalScore < 8);
});

test('analyzeComplexity: US robusta com integrações e regras resulta em complexidade Alta', () => {
  const story = {
    title: 'Processar pagamento assíncrono com múltiplas integrações',
    description:
      'A funcionalidade deve validar regras de negócio de crédito, calcular juros e taxas, ' +
      'integrar com o serviço de pagamento via API externa, processar de forma assíncrona ' +
      'usando fila de mensageria, e tratar exceções de terceiros. Deve haver validação de ' +
      'token de autenticação e cálculo de saldo em banco de dados.',
    acceptanceCriteria:
      '1. Validar regra de negócio de limite de crédito\n' +
      '2. Calcular juros conforme condição do contrato\n' +
      '3. Integrar com API de pagamento externa\n' +
      '4. Processar cenário de falha assíncrona\n' +
      '5. Tratar exceção de serviço de terceiro\n' +
      '6. Validar autenticação por token',
    relatedLinks: [{ rel: 'System.LinkTypes.Related', url: 'a' }, { rel: 'System.LinkTypes.Related', url: 'b' }],
    linkedTestCases: [],
  };
  const result = analyzeComplexity(story);
  assert.equal(result.level, COMPLEXITY_LEVELS.ALTA);
  assert.ok(result.totalScore >= 18);
});

test('analyzeComplexity: retorna as 4 dimensões com score e detail', () => {
  const story = {
    title: 'US genérica',
    description: 'Descrição com validação simples.',
    acceptanceCriteria: '- Critério 1\n- Critério 2',
    relatedLinks: [],
    linkedTestCases: [{ id: '1' }],
  };
  const result = analyzeComplexity(story);
  for (const dim of ['funcional', 'tecnica', 'escopo', 'casosDeTeste']) {
    assert.ok(dim in result.dimensions, `dimensão ${dim} ausente`);
    assert.ok(typeof result.dimensions[dim].score === 'number');
    assert.ok(typeof result.dimensions[dim].detail === 'string' && result.dimensions[dim].detail.length > 0);
  }
});

test('analyzeComplexity: lança erro para entrada inválida', () => {
  assert.throws(() => analyzeComplexity(null));
  assert.throws(() => analyzeComplexity(undefined));
});
