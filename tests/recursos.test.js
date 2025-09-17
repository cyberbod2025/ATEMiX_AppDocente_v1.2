import test from 'node:test';
import assert from 'node:assert/strict';
import { detectType, parseTags, formatBytes } from '../modules/recursos.js';

test('detectType identifica imagen por mime', () => {
  assert.equal(detectType('image/png', 'archivo.png'), 'image');
});

test('detectType identifica pdf por extension', () => {
  assert.equal(detectType('', 'guia.pdf'), 'pdf');
});

test('parseTags separa y limpia etiquetas', () => {
  assert.deepEqual(parseTags(' demo,  evaluacion ; NEM '), ['demo', 'evaluacion', 'NEM']);
});

test('formatBytes muestra unidades legibles', () => {
  assert.equal(formatBytes(2048), '2.0 KB');
  assert.equal(formatBytes(0), '—');
});
