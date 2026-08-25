'use strict';

const { ipcMain } = require('electron');
const credentialStore = require('../storage/credentialStore');
const historyStore = require('../storage/historyStore');
const azureClient = require('../azuredevops/client');
const estimationService = require('../services/estimationService');

/** Recupera credenciais salvas e lança erro amigável se ainda não configuradas. */
function requireCredentials() {
  const creds = credentialStore.loadCredentials();
  if (!creds) {
    throw new Error(
      'Nenhuma credencial do Azure DevOps configurada ainda. Vá em Configuração e informe organização, projeto e PAT.'
    );
  }
  return creds;
}

function serializeError(err) {
  const message = err && err.message ? err.message : String(err);
  const status = err && err.response ? err.response.status : null;
  const details = err && err.response && err.response.data ? err.response.data : null;
  const requestUrl = err && err.config ? `${err.config.baseURL || ''}${err.config.url || ''}` : null;
  return { message, status, details, requestUrl };
}

function registerIpcHandlers() {
  // --- Credenciais ---
  ipcMain.handle('credentials:save', async (_evt, payload) => {
    return credentialStore.saveCredentials(payload);
  });

  ipcMain.handle('credentials:load', async () => {
    return credentialStore.loadCredentials();
  });

  ipcMain.handle('credentials:clear', async () => {
    return credentialStore.clearCredentials();
  });

  ipcMain.handle('credentials:hasSaved', async () => {
    return credentialStore.hasCredentials();
  });

  // --- Conexão Azure DevOps ---
  ipcMain.handle('azure:testConnection', async (_evt, overrideCreds) => {
    try {
      const creds = overrideCreds || requireCredentials();
      const result = await azureClient.testConnection(creds);
      return { ok: true, result };
    } catch (err) {
      return { ok: false, error: serializeError(err) };
    }
  });

  // --- Fluxo principal de estimativa ---
  ipcMain.handle('estimate:prepareSuggestion', async (_evt, { storyId }) => {
    try {
      const creds = requireCredentials();
      const result = await estimationService.prepareSuggestion({ ...creds, storyId });
      return { ok: true, result };
    } catch (err) {
      return { ok: false, error: serializeError(err) };
    }
  });

  ipcMain.handle('estimate:finalize', async (_evt, { story, analysis, pertResult, decisionInput }) => {
    try {
      const creds = requireCredentials();
      const result = await estimationService.finalizeEstimate({
        ...creds,
        story,
        analysis,
        pertResult,
        decisionInput,
      });
      return { ok: true, result };
    } catch (err) {
      return { ok: false, error: serializeError(err) };
    }
  });

  // --- Histórico local ---
  ipcMain.handle('history:getAll', async () => {
    return historyStore.getAllCycles();
  });

  ipcMain.handle('history:getByStoryId', async (_evt, storyId) => {
    return historyStore.getCyclesByStoryId(storyId);
  });
}

module.exports = { registerIpcHandlers };
