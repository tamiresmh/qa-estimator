'use strict';

const { PERT_SCENARIOS, COMPLEXITY_LEVELS } = require('../shared/constants');

/**
 * Calcula a estimativa PERT: (O + 4M + P) / 6
 */
function calculatePert(o, m, p) {
  if ([o, m, p].some((v) => typeof v !== 'number' || Number.isNaN(v))) {
    throw new Error('Valores O, M, P devem ser numéricos.');
  }
  const hours = (o + 4 * m + p) / 6;
  return Math.round(hours * 100) / 100;
}

/**
 * Retorna o cenário PERT (O/M/P) para um nível de complexidade.
 */
function getScenario(level) {
  const scenario = PERT_SCENARIOS[level];
  if (!scenario) {
    throw new Error(`Nível de complexidade desconhecido: ${level}`);
  }
  return scenario;
}

/**
 * Monta a justificativa textual automática do cálculo PERT (para exibição na interface).
 * Não repete o detalhamento por dimensão — isso já aparece no card de Análise de complexidade,
 * logo acima. Aqui ficam só a classificação de referência e o cálculo aplicado.
 * @param {object} analysis - resultado de analyzeComplexity()
 * @param {object} pertResult - { o, m, p, hours }
 */
function buildJustification(analysis, pertResult) {
  const { totalScore, level } = analysis;
  const { o, m, p, hours } = pertResult;

  const lines = [
    `Classificação de complexidade: ${level} (pontuação total ${totalScore}/40).`,
    `Estimativa sugerida = (O + 4M + P) / 6 = (${o} + 4×${m} + ${p}) / 6 = ${hours}h.`,
  ];

  return lines.join('\n');
}

/**
 * Fluxo completo: a partir da análise de complexidade, obtém o cenário PERT, calcula a
 * estimativa e monta a justificativa.
 */
function estimateFromAnalysis(analysis) {
  const { o, m, p } = getScenario(analysis.level);
  const hours = calculatePert(o, m, p);
  const pertResult = { o, m, p, hours };
  const justification = buildJustification(analysis, pertResult);
  return { ...pertResult, justification };
}

module.exports = {
  calculatePert,
  getScenario,
  buildJustification,
  estimateFromAnalysis,
};
