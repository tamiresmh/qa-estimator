'use strict';

/**
 * Valida a decisão do QA sobre a estimativa sugerida pelo assistente.
 *
 * Regra inegociável: o assistente sugere, o QA decide. O motivo do ajuste é opcional — serve
 * como contexto extra para calibração futura, mas não bloqueia o registro.
 *
 * A identificação de quem decidiu não é coletada aqui: o comentário é registrado no Azure
 * DevOps usando as credenciais/sessão do próprio QA, então a autoria já fica rastreável por lá.
 *
 * @param {object} decision
 * @param {'aceitar'|'ajustar'} decision.action
 * @param {number} decision.suggestedHours - valor sugerido pelo assistente (PERT)
 * @param {number} [decision.finalHours] - valor final decidido pelo QA (obrigatório se ajustar)
 * @param {string} [decision.reason] - motivo do ajuste (opcional)
 *
 * @returns {object} decisão validada e normalizada, pronta para registro/histórico
 */
function validateDecision(decision) {
  if (!decision || typeof decision !== 'object') {
    throw new Error('Decisão inválida: objeto esperado.');
  }

  const { action, suggestedHours, finalHours, reason } = decision;

  if (action !== 'aceitar' && action !== 'ajustar') {
    throw new Error("Ação inválida: use 'aceitar' ou 'ajustar'.");
  }

  if (typeof suggestedHours !== 'number' || Number.isNaN(suggestedHours)) {
    throw new Error('suggestedHours (estimativa sugerida pelo assistente) é obrigatório e deve ser numérico.');
  }

  const normalizedReason = reason && typeof reason === 'string' && reason.trim() ? reason.trim() : null;

  if (action === 'ajustar') {
    if (typeof finalHours !== 'number' || Number.isNaN(finalHours)) {
      throw new Error('Ajuste requer finalHours numérico.');
    }
    return {
      action,
      suggestedHours,
      finalHours,
      reason: normalizedReason,
      adjustedDelta: Math.round((finalHours - suggestedHours) * 100) / 100,
      decidedAt: new Date().toISOString(),
    };
  }

  // action === 'aceitar': o valor final é o valor sugerido, sem necessidade de motivo.
  return {
    action,
    suggestedHours,
    finalHours: suggestedHours,
    reason: null,
    adjustedDelta: 0,
    decidedAt: new Date().toISOString(),
  };
}

module.exports = { validateDecision };
