'use strict';

// ---------------------------------------------------------------------------
// Navegação por abas
// ---------------------------------------------------------------------------
document.querySelectorAll('.tab').forEach((tabBtn) => {
  tabBtn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('tab--active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('tab-panel--active'));
    tabBtn.classList.add('tab--active');
    document.querySelector(`.tab-panel[data-panel="${tabBtn.dataset.tab}"]`).classList.add('tab-panel--active');
    if (tabBtn.dataset.tab === 'history') loadHistory();
  });
});

function showFeedback(el, message, type) {
  el.hidden = false;
  el.textContent = message;
  el.className = `feedback feedback--${type}`;
}

function setConnectionStatus(state, text) {
  const dot = document.querySelector('#connection-status .status-dot');
  dot.className = `status-dot status-dot--${state}`;
  document.getElementById('connection-status-text').textContent = text;
}

// ---------------------------------------------------------------------------
// Configuração / credenciais
// ---------------------------------------------------------------------------
async function loadSavedCredentials() {
  const creds = await window.qaEstimator.credentials.load();
  if (creds) {
    document.getElementById('cfg-organization').value = creds.organization || '';
    document.getElementById('cfg-project').value = creds.project || '';
    // PAT nunca é reexibido por segurança — o campo fica vazio, mas salvo internamente.
    setConnectionStatus('unknown', 'Credenciais carregadas — teste a conexão para confirmar');
  }
}

document.getElementById('btn-test-connection').addEventListener('click', async () => {
  const feedback = document.getElementById('config-feedback');
  const organization = document.getElementById('cfg-organization').value.trim();
  const project = document.getElementById('cfg-project').value.trim();
  const pat = document.getElementById('cfg-pat').value.trim();

  if (!organization || !project) {
    showFeedback(feedback, 'Preencha organização e projeto antes de testar a conexão.', 'error');
    return;
  }

  showFeedback(feedback, 'Testando conexão...', 'info');

  // Se um PAT novo foi digitado, testa com ele; senão usa o que já está salvo.
  const overrideCreds = pat ? { organization, project, pat } : null;
  const response = await window.qaEstimator.azure.testConnection(overrideCreds);

  if (response.ok) {
    setConnectionStatus('ok', 'Conectado ao Azure DevOps');
    showFeedback(feedback, 'Conexão bem-sucedida! Organização e projeto validados.', 'ok');
  } else {
    setConnectionStatus('error', 'Falha na conexão');
    showFeedback(feedback, formatConnectionError(response.error), 'error');
  }
});

function formatConnectionError(error) {
  return formatAzureError(error, 'Falha na conexão');
}

function formatAzureError(error, prefix) {
  const parts = [`${prefix} (HTTP ${error.status || '?'}): ${error.message}`];
  if (error.requestUrl) parts.push(`URL chamada: ${error.requestUrl}`);
  if (error.details) {
    const detailText =
      typeof error.details === 'string' ? error.details : JSON.stringify(error.details, null, 2);
    parts.push(`Resposta do Azure DevOps:\n${detailText}`);
  }
  if (error.status === 401) {
    parts.push(
      'Dica: 401 costuma ser PAT inválido/expirado, PAT sem escopo suficiente (verifique se ' +
        'o PAT tem "Work Items: Read, write, & manage" — não apenas leitura — pois buscar uma ' +
        'US funciona só com leitura, mas registrar o comentário exige escrita), ou política ' +
        'corporativa bloqueando autenticação por PAT (nesse caso, fale com o time de infra/AD).'
    );
  }
  return parts.join('\n');
}

document.getElementById('config-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const feedback = document.getElementById('config-feedback');
  const organization = document.getElementById('cfg-organization').value.trim();
  const project = document.getElementById('cfg-project').value.trim();
  const pat = document.getElementById('cfg-pat').value.trim();

  if (!pat) {
    showFeedback(feedback, 'Informe o PAT para salvar as credenciais.', 'error');
    return;
  }

  try {
    await window.qaEstimator.credentials.save({ organization, project, pat });
    document.getElementById('cfg-pat').value = '';
    showFeedback(feedback, 'Credenciais salvas com segurança neste computador.', 'ok');
  } catch (err) {
    showFeedback(feedback, `Não foi possível salvar: ${err.message}`, 'error');
  }
});

document.getElementById('btn-clear-credentials').addEventListener('click', async () => {
  const feedback = document.getElementById('config-feedback');
  await window.qaEstimator.credentials.clear();
  document.getElementById('cfg-organization').value = '';
  document.getElementById('cfg-project').value = '';
  document.getElementById('cfg-pat').value = '';
  setConnectionStatus('unknown', 'Conexão não verificada');
  showFeedback(feedback, 'Credenciais removidas deste computador.', 'ok');
});

// ---------------------------------------------------------------------------
// Fluxo de estimativa
// ---------------------------------------------------------------------------
let currentContext = null; // { story, analysis, pertResult }

document.getElementById('story-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const feedback = document.getElementById('story-feedback');
  const storyId = document.getElementById('story-id').value.trim();

  ['story-details-card', 'analysis-card', 'pert-card', 'decision-card'].forEach((id) => {
    document.getElementById(id).hidden = true;
  });

  showFeedback(feedback, 'Buscando User Story no Azure DevOps...', 'info');

  const response = await window.qaEstimator.estimate.prepareSuggestion(storyId);

  if (!response.ok) {
    showFeedback(feedback, `Erro ao buscar/analisar a User Story: ${response.error.message}`, 'error');
    return;
  }

  feedback.hidden = true;
  currentContext = response.result;
  renderStoryDetails(currentContext.story);
  renderAnalysis(currentContext.analysis);
  renderPert(currentContext.analysis, currentContext.pertResult);
  document.getElementById('decision-card').hidden = false;
  document.querySelector('input[name="dec-action"][value="aceitar"]').checked = true;
  document.getElementById('field-reason').hidden = true;
  const hoursInput = document.getElementById('dec-final-hours');
  hoursInput.readOnly = true;
  hoursInput.value = currentContext.pertResult.hours;
  document.getElementById('dec-reason').value = '';
});

function renderStoryDetails(story) {
  const el = document.getElementById('story-details');
  el.innerHTML = `
    <div class="dimension-row"><strong>#${story.id} — ${escapeHtml(story.title)}</strong> <span>${escapeHtml(story.workItemType || '')} · ${escapeHtml(story.state || '')}</span></div>
    <p class="dimension-detail">${escapeHtml(story.description) || '(sem descrição)'}</p>
    <p class="dimension-detail"><strong>Critérios de aceite:</strong><br/>${escapeHtml(story.acceptanceCriteria) || '(nenhum informado)'}</p>
    <p class="dimension-detail">${story.linkedTestCases.length} caso(s) de teste vinculado(s) · ${story.relatedLinks.length} item(ns) relacionado(s) · ${story.history.length} revisão(ões) no histórico</p>
  `;
  document.getElementById('story-details-card').hidden = false;
}

function renderAnalysis(analysis) {
  const el = document.getElementById('analysis-details');
  const dims = analysis.dimensions;
  const rows = [
    ['Funcional', dims.funcional],
    ['Técnica', dims.tecnica],
    ['Escopo', dims.escopo],
    ['Casos de teste', dims.casosDeTeste],
  ];
  el.innerHTML =
    `<div class="dimension-row"><strong>Classificação</strong> <span class="complexity-badge complexity-badge--${analysis.level}">${analysis.level} · ${analysis.totalScore}/40</span></div>` +
    rows
      .map(
        ([label, d]) => `
      <div class="dimension-row">
        <div><strong>${label}</strong><div class="dimension-detail">${escapeHtml(d.detail)}</div></div>
        <span class="score">${d.score}/10</span>
      </div>`
      )
      .join('');
  document.getElementById('analysis-card').hidden = false;
}

function renderPert(analysis, pertResult) {
  const el = document.getElementById('pert-details');
  el.innerHTML = `
    <div class="dimension-row">
      <div>Cenário (${analysis.level}): Otimista ${pertResult.o}h · Mais provável ${pertResult.m}h · Pessimista ${pertResult.p}h</div>
    </div>
    <div class="dimension-row">
      <strong>Estimativa sugerida</strong>
      <span class="pert-hours">${pertResult.hours}h</span>
    </div>
  `;
  document.getElementById('justification-box').textContent = pertResult.justification;
  document.getElementById('pert-card').hidden = false;
}

// Alterna exibição/edição dos campos conforme a escolha do QA:
// "Aceitar" trava o campo de horas no valor sugerido; "Ajustar" libera edição e exige motivo.
document.querySelectorAll('input[name="dec-action"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    const isAdjust = document.querySelector('input[name="dec-action"]:checked').value === 'ajustar';
    const hoursInput = document.getElementById('dec-final-hours');
    document.getElementById('field-reason').hidden = !isAdjust;
    hoursInput.readOnly = !isAdjust;
    if (!isAdjust && currentContext) {
      hoursInput.value = currentContext.pertResult.hours;
    }
  });
});

document.getElementById('decision-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const feedback = document.getElementById('decision-feedback');

  if (!currentContext) {
    showFeedback(feedback, 'Busque uma User Story antes de registrar a decisão.', 'error');
    return;
  }

  const action = document.querySelector('input[name="dec-action"]:checked').value;
  const finalHoursInput = document.getElementById('dec-final-hours').value;
  const reason = document.getElementById('dec-reason').value.trim();

  const decisionInput = {
    action,
    suggestedHours: currentContext.pertResult.hours,
  };
  if (action === 'ajustar') {
    decisionInput.finalHours = Number(finalHoursInput);
    decisionInput.reason = reason;
  }

  showFeedback(feedback, 'Registrando estimativa no Azure DevOps...', 'info');

  const response = await window.qaEstimator.estimate.finalize({
    story: currentContext.story,
    analysis: currentContext.analysis,
    pertResult: currentContext.pertResult,
    decisionInput,
  });

  if (!response.ok) {
    showFeedback(feedback, formatAzureError(response.error, 'Erro ao registrar'), 'error');
    return;
  }

  const { azureResult } = response.result;
  const customFieldsMsg = azureResult.customFields.success
    ? 'Campos customizados também foram preenchidos.'
    : 'Campos customizados não existem neste processo do projeto (normal) — o comentário garante a rastreabilidade.';

  showFeedback(
    feedback,
    `Estimativa registrada com sucesso na User Story #${currentContext.story.id} via comentário. ${customFieldsMsg}`,
    'ok'
  );
});

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');
}

// ---------------------------------------------------------------------------
// Histórico
// ---------------------------------------------------------------------------
async function loadHistory() {
  const tbody = document.getElementById('history-tbody');
  const cycles = await window.qaEstimator.history.getAll();

  if (!cycles.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Nenhuma estimativa registrada ainda.</td></tr>`;
    return;
  }

  tbody.innerHTML = cycles
    .slice()
    .reverse()
    .map(
      (c) => `
    <tr>
      <td>${new Date(c.recordedAt).toLocaleString('pt-BR')}</td>
      <td>#${c.story.id} — ${escapeHtml(c.story.title)}</td>
      <td><span class="complexity-badge complexity-badge--${c.analysis.level}">${c.analysis.level}</span></td>
      <td>${c.pertResult.hours}</td>
      <td>${c.decision.finalHours}</td>
      <td>${c.decision.action === 'ajustar' ? 'Ajustado' : 'Aceito'}</td>
    </tr>`
    )
    .join('');
}

// ---------------------------------------------------------------------------
// Inicialização
// ---------------------------------------------------------------------------
loadSavedCredentials();
