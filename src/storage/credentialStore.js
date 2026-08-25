'use strict';

const fs = require('fs');
const path = require('path');
const { app, safeStorage } = require('electron');

function getCredentialsPath() {
  return path.join(app.getPath('userData'), 'credentials.enc');
}

/**
 * Salva as credenciais do Azure DevOps (organização, projeto, PAT) criptografadas em disco
 * via safeStorage (DPAPI no Windows, Keychain no macOS). O PAT nunca é gravado em texto puro.
 */
function saveCredentials({ organization, project, pat }) {
  if (!pat) throw new Error('PAT é obrigatório para salvar credenciais.');
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error(
      'Criptografia do sistema operacional indisponível. Não é seguro salvar o PAT neste ambiente.'
    );
  }

  const payload = JSON.stringify({ organization, project, pat });
  const encrypted = safeStorage.encryptString(payload);
  fs.mkdirSync(path.dirname(getCredentialsPath()), { recursive: true });
  fs.writeFileSync(getCredentialsPath(), encrypted);
  return true;
}

/**
 * Carrega e descriptografa as credenciais salvas. Retorna null se nada foi salvo ainda.
 */
function loadCredentials() {
  const filePath = getCredentialsPath();
  if (!fs.existsSync(filePath)) return null;

  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Criptografia do sistema operacional indisponível para descriptografar credenciais.');
  }

  const encrypted = fs.readFileSync(filePath);
  const decrypted = safeStorage.decryptString(encrypted);
  return JSON.parse(decrypted);
}

/** Remove as credenciais salvas (ex.: usuária quer trocar o PAT ou revogá-lo). */
function clearCredentials() {
  const filePath = getCredentialsPath();
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  return true;
}

function hasCredentials() {
  return fs.existsSync(getCredentialsPath());
}

module.exports = { saveCredentials, loadCredentials, clearCredentials, hasCredentials };
