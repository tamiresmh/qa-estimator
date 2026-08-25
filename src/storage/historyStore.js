'use strict';

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

function getHistoryPath() {
  return path.join(app.getPath('userData'), 'history.json');
}

function readAll() {
  const filePath = getHistoryPath();
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    // Arquivo corrompido não deve derrubar o app; começa um histórico novo.
    return [];
  }
}

function writeAll(entries) {
  const filePath = getHistoryPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(entries, null, 2));
}

/**
 * Registra um ciclo completo de estimativa: dados da US, análise de complexidade, cálculo
 * PERT, decisão do QA e resultado do registro no Azure DevOps.
 *
 * Isto prepara terreno (sem implementar agora) para: base histórica de US semelhantes,
 * autoajuste por padrões, recomendações baseadas em histórico.
 */
function addCycle(entry) {
  const entries = readAll();
  const record = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    recordedAt: new Date().toISOString(),
    ...entry,
  };
  entries.push(record);
  writeAll(entries);
  return record;
}

function getAllCycles() {
  return readAll();
}

/** Busca ciclos anteriores para a mesma User Story (por ID), útil para reabertura/reestimativa. */
function getCyclesByStoryId(storyId) {
  return readAll().filter((e) => e.story && String(e.story.id) === String(storyId));
}

module.exports = { addCycle, getAllCycles, getCyclesByStoryId, getHistoryPath };
