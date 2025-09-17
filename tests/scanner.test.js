import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAnswerKey, parseResponses, computeScore } from '../modules/scanner.js';

const examMock = {
  answerKey: ['A', 'B', 'C', 'D'],
  points: 1,
  penalty: 0.5,
};

test('parseAnswerKey rellena hasta el total esperado', () => {
  const key = parseAnswerKey('A\nB', 4);
  assert.deepEqual(key, ['A', 'B', 'A', 'A']);
});

test('parseResponses normaliza a mayúsculas y completa blancos', () => {
  const responses = parseResponses('ab1d', 5);
  assert.deepEqual(responses, ['A', 'B', 'D', '', '']);
});

test('computeScore calcula aciertos, errores y penalización', () => {
  const responses = ['A', 'X', '', 'D'];
  const stats = computeScore(examMock, responses);
  assert.equal(stats.correct, 2);
  assert.equal(stats.incorrect, 1);
  assert.equal(stats.blank, 1);
  assert.equal(stats.score, (2 * 1) - (1 * 0.5));
});
