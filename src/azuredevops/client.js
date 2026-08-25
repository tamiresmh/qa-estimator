'use strict';

const axios = require('axios');
const { AZURE_CUSTOM_FIELDS } = require('../shared/constants');

const API_VERSION = '7.1';

function buildAuthHeader(pat) {
  const token = Buffer.from(`:${pat}`).toString('base64');
  return `Basic ${token}`;
}

/**
 * Normaliza o campo "organização": remove barra final e, se por engano vier com o projeto
 * colado no final da URL (ex.: ".../minhaorg/Meu%20Projeto"), mantém só o segmento da
 * organização.
 */
function normalizeOrganization(organization) {
  if (!organization) return organization;
  let org = String(organization).trim().replace(/\/+$/, '');
  try {
    const url = new URL(org);
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length > 1) {
      url.pathname = `/${segments[0]}`;
      org = url.toString().replace(/\/+$/, '');
    }
  } catch (err) {
    // Não é uma URL válida (ex.: já é só o nome) — mantém como está.
  }
  return org;
}

/**
 * Normaliza o campo "projeto": aceita tanto o nome simples ("Meu Projeto") quanto uma URL
 * colada por engano ("https://dev.azure.com/minhaorg/Meu%20Projeto") e extrai só o nome.
 */
function normalizeProject(project) {
  if (!project) return project;
  let p = String(project).trim();
  if (/^https?:\/\//i.test(p)) {
    try {
      const url = new URL(p);
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length) {
        p = decodeURIComponent(segments[segments.length - 1]);
      }
    } catch (err) {
      // Se o parse falhar, segue com a string original.
    }
  }
  return p;
}

function buildClient({ organization, pat }) {
  if (!organization) throw new Error('Organização do Azure DevOps é obrigatória.');
  if (!pat) throw new Error('PAT é obrigatório.');

  const baseURL = normalizeOrganization(organization);
  return axios.create({
    baseURL,
    headers: {
      Authorization: buildAuthHeader(pat),
      'Content-Type': 'application/json',
    },
    timeout: 20000,
  });
}

/** Mapa de entidades HTML nomeadas mais comuns nos campos ricos do Azure DevOps. */
const NAMED_ENTITIES = {
  '&nbsp;': ' ',
  '&quot;': '"',
  '&#34;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&#x27;': "'",
  '&lsquo;': '\u2018',
  '&rsquo;': '\u2019',
  '&ldquo;': '\u201C',
  '&rdquo;': '\u201D',
  '&hellip;': '\u2026',
  '&mdash;': '\u2014',
  '&ndash;': '\u2013',
  '&lt;': '<',
  '&gt;': '>',
  // &amp; é decodificado por último (ver decodeHtmlEntities) para não corromper as demais entidades.
};

/**
 * Decodifica entidades HTML (nomeadas, numéricas decimais e hexadecimais) para texto puro.
 * Necessário porque os campos ricos do Azure DevOps (descrição, critérios de aceite) chegam
 * como HTML — sem isso, textos como "doença principal" entre aspas apareciam literalmente como
 * &quot;doença principal&quot; na interface.
 */
function decodeHtmlEntities(text) {
  if (!text) return '';
  let result = String(text);

  // Entidades numéricas: &#123; e &#x1F600;
  result = result.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
  result = result.replace(/&#x([0-9a-fA-F]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));

  // Entidades nomeadas (exceto &amp;, decodificada por último de propósito).
  for (const [entity, char] of Object.entries(NAMED_ENTITIES)) {
    result = result.split(entity).join(char);
  }
  result = result.split('&amp;').join('&');

  return result;
}

/** Extrai texto simples de um campo HTML do Azure DevOps (descrição/critérios de aceite). */
function stripHtml(html) {
  if (!html) return '';
  const withoutTags = String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  return decodeHtmlEntities(withoutTags)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Testa a conexão com o Azure DevOps (organização + projeto + PAT), sem depender de um
 * work item específico.
 */
async function testConnection({ organization, project, pat }) {
  const client = buildClient({ organization, pat });
  const url = `/_apis/projects/${encodeURIComponent(normalizeProject(project))}?api-version=${API_VERSION}`;
  const response = await client.get(url);
  return { ok: true, project: response.data };
}

/**
 * Busca uma User Story pelo ID: título, descrição, critérios de aceite, links relacionados,
 * casos de teste vinculados e histórico (revisões recentes).
 */
async function fetchUserStory({ organization, project, pat, storyId }) {
  const client = buildClient({ organization, pat });
  const normalizedProject = normalizeProject(project);

  const workItemUrl = `/${encodeURIComponent(normalizedProject)}/_apis/wit/workitems/${storyId}?$expand=relations&api-version=${API_VERSION}`;
  const { data: workItem } = await client.get(workItemUrl);

  const fields = workItem.fields || {};
  const relations = workItem.relations || [];

  const linkedTestCases = relations
    .filter((r) => r.rel === 'Microsoft.VSTS.Common.TestedBy-Forward')
    .map((r) => ({ url: r.url, id: (r.url.match(/(\d+)$/) || [])[1] }));

  const relatedLinks = relations
    .filter((r) => r.rel && r.rel.startsWith('System.LinkTypes'))
    .map((r) => ({ rel: r.rel, url: r.url }));

  let history = [];
  try {
    const revisionsUrl = `/${encodeURIComponent(normalizedProject)}/_apis/wit/workitems/${storyId}/revisions?api-version=${API_VERSION}`;
    const { data: revisionsData } = await client.get(revisionsUrl);
    history = (revisionsData.value || []).map((rev) => ({
      rev: rev.rev,
      changedDate: rev.fields && rev.fields['System.ChangedDate'],
      changedBy: rev.fields && rev.fields['System.ChangedBy'] && rev.fields['System.ChangedBy'].displayName,
    }));
  } catch (err) {
    // Histórico é informativo; se falhar, seguimos sem ele.
    history = [];
  }

  return {
    id: workItem.id,
    title: decodeHtmlEntities(fields['System.Title'] || ''),
    description: stripHtml(fields['System.Description']),
    acceptanceCriteria: stripHtml(fields['Microsoft.VSTS.Common.AcceptanceCriteria']),
    workItemType: fields['System.WorkItemType'],
    state: fields['System.State'],
    relatedLinks,
    linkedTestCases,
    history,
    raw: workItem,
  };
}

/**
 * Registra a estimativa no Azure DevOps:
 *  1) Comentário estruturado no work item (sempre funciona, garante rastreabilidade).
 *  2) Tentativa best-effort de gravar campos customizados (só existem se o processo do
 *     projeto os tiver definido — falha nesse passo NÃO invalida o registro).
 */
async function registerEstimate({ organization, project, pat, storyId, analysis, pertResult, decision }) {
  const client = buildClient({ organization, pat });
  const normalizedProject = normalizeProject(project);

  const commentBody = buildEstimateComment({ analysis, pertResult, decision });
  const commentUrl = `/${encodeURIComponent(normalizedProject)}/_apis/wit/workItems/${storyId}/comments?api-version=${API_VERSION}-preview.4`;

  const commentResult = await client.post(commentUrl, { text: commentBody });

  let customFieldsResult = { attempted: true, success: false, error: null };
  try {
    const patchUrl = `/${encodeURIComponent(normalizedProject)}/_apis/wit/workitems/${storyId}?api-version=${API_VERSION}`;
    const patchBody = [
      { op: 'add', path: `/fields/${AZURE_CUSTOM_FIELDS.COMPLEXITY}`, value: analysis.level },
      { op: 'add', path: `/fields/${AZURE_CUSTOM_FIELDS.PERT_HOURS}`, value: pertResult.hours },
      { op: 'add', path: `/fields/${AZURE_CUSTOM_FIELDS.FINAL_ESTIMATE_HOURS}`, value: decision.finalHours },
    ];
    await client.patch(patchUrl, patchBody, {
      headers: { 'Content-Type': 'application/json-patch+json' },
    });
    customFieldsResult.success = true;
  } catch (err) {
    // Esperado quando o processo do projeto não define esses campos customizados.
    customFieldsResult.error = err.response ? err.response.data : err.message;
  }

  return {
    commentPosted: true,
    commentId: commentResult.data && commentResult.data.id,
    customFields: customFieldsResult,
  };
}

function buildEstimateComment({ analysis, pertResult, decision }) {
  const lines = [];
  lines.push('<b>Estimativa de esforço de testes — QA Estimator</b>');
  lines.push(`Complexidade: ${analysis.level} (pontuação ${analysis.totalScore}/40)`);
  lines.push(
    `PERT: O=${pertResult.o}h, M=${pertResult.m}h, P=${pertResult.p}h → sugestão = ${pertResult.hours}h`
  );
  lines.push(`Decisão do QA: ${decision.action} — estimativa final = ${decision.finalHours}h`);
  if (decision.action === 'ajustar' && decision.reason) {
    lines.push(`Motivo do ajuste: ${decision.reason}`);
  }
  lines.push(`Data: ${new Date(decision.decidedAt).toLocaleString('pt-BR')}`);
  lines.push('<br/><i>Detalhamento por dimensão (auditoria):</i><br/>' + buildDimensionBreakdown(analysis));
  return lines.join('<br/>');
}

/** Detalhamento por dimensão para registro no Azure DevOps (fica só lá, não repete na UI). */
function buildDimensionBreakdown(analysis) {
  const { dimensions } = analysis;
  const rows = [
    ['Funcional', dimensions.funcional],
    ['Técnica', dimensions.tecnica],
    ['Escopo', dimensions.escopo],
    ['Casos de teste', dimensions.casosDeTeste],
  ];
  return rows
    .map(([label, d]) => `• ${label} (${d.score}/10): ${d.detail}`)
    .join('<br/>');
}

module.exports = {
  testConnection,
  fetchUserStory,
  registerEstimate,
  stripHtml,
  decodeHtmlEntities,
  normalizeOrganization,
  normalizeProject,
};
