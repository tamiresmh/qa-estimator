'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeOrganization, normalizeProject } = require('../src/azuredevops/client');

test('normalizeProject: aceita nome simples sem alterar', () => {
  assert.equal(normalizeProject('Meu Projeto'), 'Meu Projeto');
});

test('normalizeProject: extrai o nome quando a URL inteira é colada no campo', () => {
  assert.equal(
    normalizeProject('https://dev.azure.com/minhaorg/Meu%20Projeto'),
    'Meu Projeto'
  );
});

test('normalizeProject: extrai o nome de URL com barra final', () => {
  assert.equal(
    normalizeProject('https://dev.azure.com/minhaorg/Meu%20Projeto/'),
    'Meu Projeto'
  );
});

test('normalizeOrganization: remove barra final', () => {
  assert.equal(
    normalizeOrganization('https://dev.azure.com/minhaorg/'),
    'https://dev.azure.com/minhaorg'
  );
});

test('normalizeOrganization: remove o projeto se ele vier colado junto', () => {
  assert.equal(
    normalizeOrganization('https://dev.azure.com/minhaorg/Meu%20Projeto'),
    'https://dev.azure.com/minhaorg'
  );
});
