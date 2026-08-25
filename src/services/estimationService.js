'use strict';

const { analyzeComplexity } = require('../analysis/complexityAnalyzer');
const { estimateFromAnalysis } = require('../pert/pertEngine');
const { validateDecision } = require('./validationService');
const azureClient = require('../azuredevops/client');
const historyStore = require('../storage/historyStore');

/**
 * Etapa 1+2+3+4+5+6: busca a US, analisa complexidade, calcula PERT e monta justificativa.
 * Não decide nada — apenas sugere. A IA nunca decide a estimativa final.
 */
async function prepareSuggestion({ organization, project, pat, storyId }) {
  const story = await azureClient.fetchUserStory({ organization, project, pat, storyId });
  const analysis = analyzeComplexity(story);
  const pertResult = estimateFromAnalysis(analysis);
  return { story, analysis, pertResult };
}

/**
 * Etapa 7+8: valida a decisão do QA (aceitar/ajustar com motivo obrigatório), registra no
 * Azure DevOps (comentário + campos customizados best-effort) e grava no histórico local.
 */
async function finalizeEstimate({ organization, project, pat, story, analysis, pertResult, decisionInput }) {
  const decision = validateDecision(decisionInput);

  const azureResult = await azureClient.registerEstimate({
    organization,
    project,
    pat,
    storyId: story.id,
    analysis,
    pertResult,
    decision,
  });

  const cycle = historyStore.addCycle({
    story: { id: story.id, title: story.title },
    analysis,
    pertResult: { o: pertResult.o, m: pertResult.m, p: pertResult.p, hours: pertResult.hours },
    decision,
    azureResult,
  });

  return { decision, azureResult, cycle };
}

module.exports = { prepareSuggestion, finalizeEstimate };
