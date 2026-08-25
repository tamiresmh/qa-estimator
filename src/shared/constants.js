'use strict';

/**
 * Limiares de classificação de complexidade.
 * Pontuação total = soma das 4 dimensões (funcional, técnica, escopo, casos de teste),
 * cada uma pontuada de 0 a 10 (máximo teórico total = 40).
 *
 *   Baixa: total <  8
 *   Média: total < 18
 *   Alta:  total >= 18
 */
const COMPLEXITY_THRESHOLDS = {
  BAIXA_MAX: 8, // < 8 => Baixa
  MEDIA_MAX: 18, // < 18 => Média; >= 18 => Alta
};

const COMPLEXITY_LEVELS = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
};

/**
 * Cenários PERT (em horas) por nível de complexidade, conforme especificação do projeto.
 * O = Otimista, M = Mais provável, P = Pessimista
 */
const PERT_SCENARIOS = {
  [COMPLEXITY_LEVELS.BAIXA]: { o: 2, m: 4, p: 6 },
  [COMPLEXITY_LEVELS.MEDIA]: { o: 6, m: 10, p: 16 },
  [COMPLEXITY_LEVELS.ALTA]: { o: 12, m: 20, p: 32 },
};

/** Campos customizados do Azure DevOps (best-effort — podem não existir no processo do projeto). */
const AZURE_CUSTOM_FIELDS = {
  COMPLEXITY: 'Custom.QAComplexity',
  PERT_HOURS: 'Custom.QAPertHours',
  FINAL_ESTIMATE_HOURS: 'Custom.QAFinalEstimateHours',
};

module.exports = {
  COMPLEXITY_THRESHOLDS,
  COMPLEXITY_LEVELS,
  PERT_SCENARIOS,
  AZURE_CUSTOM_FIELDS,
};
