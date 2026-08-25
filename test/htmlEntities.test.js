'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { stripHtml, decodeHtmlEntities } = require('../src/azuredevops/client');

test('decodeHtmlEntities: decodifica aspas, apóstrofo e outras entidades comuns', () => {
  assert.equal(decodeHtmlEntities('&quot;Doen\u00e7a Principal&quot;'), '"Doen\u00e7a Principal"');
  assert.equal(decodeHtmlEntities('O paciente n&atilde;o &eacute; um caso simples'), 'O paciente n&atilde;o &eacute; um caso simples');
  assert.equal(decodeHtmlEntities("&apos;teste&apos;"), "'teste'");
  assert.equal(decodeHtmlEntities('Regras &amp; valida\u00e7\u00f5es'), 'Regras & valida\u00e7\u00f5es');
});

test('decodeHtmlEntities: decodifica entidades numéricas decimais e hexadecimais', () => {
  assert.equal(decodeHtmlEntities('&#34;teste&#34;'), '"teste"');
  assert.equal(decodeHtmlEntities('&#x27;teste&#x27;'), "'teste'");
});

test('stripHtml: remove tags E decodifica entidades (bug real relatado pela usuária)', () => {
  const raw = '<div>O campo &quot;Doen\u00e7a Principal&quot; deve ser obrigat\u00f3rio.</div>';
  const result = stripHtml(raw);
  assert.equal(result, 'O campo "Doen\u00e7a Principal" deve ser obrigat\u00f3rio.');
  assert.ok(!result.includes('&quot;'), 'não deve sobrar &quot; literal no texto');
});

test('stripHtml: não decodifica &amp; antes da hora (evita corromper &amp;quot;)', () => {
  // Um "&" literal no texto original do Azure vem como &amp;. Isso não pode virar aspas.
  const raw = '<p>Testes &amp; valida\u00e7\u00f5es de regras</p>';
  assert.equal(stripHtml(raw), 'Testes & valida\u00e7\u00f5es de regras');
});
