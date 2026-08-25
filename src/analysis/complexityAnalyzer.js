'use strict';

const { COMPLEXITY_THRESHOLDS, COMPLEXITY_LEVELS } = require('../shared/constants');

/**
 * Conta quantas vezes qualquer uma das palavras-chave aparece no texto (case-insensitive,
 * busca por substring de palavra). Retorna o total de ocorrências somadas.
 */
function countKeywordOccurrences(text, keywords) {
  if (!text) return 0;
  const normalized = String(text).toLowerCase();
  let total = 0;
  for (const kw of keywords) {
    const escaped = kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = normalized.match(new RegExp(escaped, 'g'));
    if (matches) total += matches.length;
  }
  return total;
}

/** Conta itens de lista (linhas iniciadas por -, *, número. ou bullet) num texto. */
function countListItems(text) {
  if (!text) return 0;
  const lines = String(text).split(/\r?\n/);
  return lines.filter((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l)).length;
}

function wordCount(text) {
  if (!text) return 0;
  return String(text).trim().split(/\s+/).filter(Boolean).length;
}

/** Limita um valor ao intervalo [0, 10] e arredonda para 1 casa decimal. */
function clampScore(value) {
  const clamped = Math.max(0, Math.min(10, value));
  return Math.round(clamped * 10) / 10;
}

const FUNCTIONAL_KEYWORDS = [
  'regra de negócio', 'regras de negócio', 'validação', 'validar', 'validações',
  'cálculo', 'calcular', 'fluxo', 'condição', 'condicional', 'se ', 'então',
  'cenário', 'exceção', 'exceções',
];

const TECHNICAL_KEYWORDS = [
  'integração', 'integrações', 'api', 'serviço', 'serviços', 'endpoint',
  'assíncrono', 'assíncrona', 'fila', 'webhook', 'batch', 'microsserviço',
  'banco de dados', 'terceiro', 'terceiros', 'autenticação', 'token',
];

/**
 * Dimensão 1 — Complexidade funcional: regras de negócio, fluxos, validações, cálculos.
 */
function scoreFunctional(story) {
  const text = `${story.description || ''}\n${story.acceptanceCriteria || ''}`;
  const keywordHits = countKeywordOccurrences(text, FUNCTIONAL_KEYWORDS);
  const listItems = countListItems(story.acceptanceCriteria);
  // Cada ocorrência de palavra-chave soma 0.6pt, cada item de lista de critério soma 0.5pt.
  return {
    score: clampScore(keywordHits * 0.6 + listItems * 0.5),
    detail: `${keywordHits} termo(s) de regra/fluxo/validação/cálculo identificados; ${listItems} item(ns) estruturado(s) nos critérios de aceite.`,
  };
}

/**
 * Dimensão 2 — Complexidade técnica: integrações, APIs, serviços, processamento assíncrono.
 */
function scoreTechnical(story) {
  const text = `${story.description || ''}\n${story.acceptanceCriteria || ''}`;
  const keywordHits = countKeywordOccurrences(text, TECHNICAL_KEYWORDS);
  const relatedLinks = Array.isArray(story.relatedLinks) ? story.relatedLinks.length : 0;
  // Cada termo técnico soma 0.8pt, cada link relacionado (possível integração/dependência) soma 0.7pt.
  return {
    score: clampScore(keywordHits * 0.8 + relatedLinks * 0.7),
    detail: `${keywordHits} termo(s) técnico(s) (integração/API/serviço/assíncrono) identificados; ${relatedLinks} item(ns) relacionado(s) vinculado(s).`,
  };
}

/**
 * Dimensão 3 — Escopo: critérios de aceite, tamanho da descrição, cenários.
 */
function scoreScope(story) {
  const criteriaItems = countListItems(story.acceptanceCriteria) || (story.acceptanceCriteria ? 1 : 0);
  const descWords = wordCount(story.description);
  // 1pt por critério de aceite (até 6), + 1pt a cada 60 palavras de descrição (até 4pts).
  const criteriaScore = Math.min(6, criteriaItems);
  const descScore = Math.min(4, descWords / 60);
  return {
    score: clampScore(criteriaScore + descScore),
    detail: `${criteriaItems} critério(s) de aceite; descrição com ${descWords} palavra(s).`,
  };
}

/**
 * Dimensão 4 — Casos de teste: vinculados, a criar, positivos/negativos.
 */
function scoreTestCases(story) {
  const linked = Array.isArray(story.linkedTestCases) ? story.linkedTestCases.length : 0;
  const criteriaItems = countListItems(story.acceptanceCriteria) || (story.acceptanceCriteria ? 1 : 0);
  // Estimativa de casos a criar: 2 por critério (1 positivo + 1 negativo), descontando os já vinculados.
  const estimatedToCreate = Math.max(0, criteriaItems * 2 - linked);
  // 0.4pt por caso já vinculado (mantê-los/adaptá-los tem custo) + 0.5pt por caso estimado a criar.
  return {
    score: clampScore(linked * 0.4 + estimatedToCreate * 0.5),
    detail: `${linked} caso(s) de teste já vinculado(s); estimativa de ${estimatedToCreate} caso(s) novo(s) a criar (positivos/negativos).`,
  };
}

/** Classifica a complexidade a partir da pontuação total. */
function classify(totalScore) {
  if (totalScore < COMPLEXITY_THRESHOLDS.BAIXA_MAX) return COMPLEXITY_LEVELS.BAIXA;
  if (totalScore < COMPLEXITY_THRESHOLDS.MEDIA_MAX) return COMPLEXITY_LEVELS.MEDIA;
  return COMPLEXITY_LEVELS.ALTA;
}

/**
 * Analisa uma User Story e retorna a pontuação por dimensão, o total e a classificação.
 * @param {object} story - { title, description, acceptanceCriteria, relatedLinks, linkedTestCases, history }
 */
function analyzeComplexity(story) {
  if (!story || typeof story !== 'object') {
    throw new Error('User Story inválida: objeto esperado.');
  }

  const functional = scoreFunctional(story);
  const technical = scoreTechnical(story);
  const scope = scoreScope(story);
  const testCases = scoreTestCases(story);

  // Pontuação total = soma direta das 4 dimensões (cada uma 0-10, total possível 0-40).
  const rawTotal = Math.round((functional.score + technical.score + scope.score + testCases.score) * 10) / 10;

  const level = classify(rawTotal);

  return {
    dimensions: {
      funcional: functional,
      tecnica: technical,
      escopo: scope,
      casosDeTeste: testCases,
    },
    totalScore: rawTotal,
    level,
    thresholds: COMPLEXITY_THRESHOLDS,
  };
}

module.exports = {
  analyzeComplexity,
  classify,
  scoreFunctional,
  scoreTechnical,
  scoreScope,
  scoreTestCases,
  countKeywordOccurrences,
  countListItems,
  wordCount,
};
