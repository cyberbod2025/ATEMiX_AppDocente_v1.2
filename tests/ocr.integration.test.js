import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOcrEntries } from '../modules/scanner.js';

test('parseOcrEntries extracts student names and responses', () => {
  const text = `Alumno: Ana López\nRespuestas: ABCDE\n\nPEDRO|BCDAB\n\nLuis Fernández\nRespuestas=ccaad`;
  const exam = { questions: 5 };
  const entries = parseOcrEntries(text, exam);
  assert.deepStrictEqual(entries, [
    { student: 'Ana López', responses: 'ABCDE' },
    { student: 'PEDRO', responses: 'BCDAB' },
    { student: 'Luis Fernández', responses: 'CCAAD' },
  ]);
});
