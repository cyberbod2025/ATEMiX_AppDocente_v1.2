import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularPuntaje } from '../modules/insignias.js';

test('calcularPuntaje suma total', () => {
  const config = { formula: 'suma', escala: 100, ponderaciones: {}, topN: 3 };
  const insignias = [
    { puntos: 10 },
    { puntos: 5.5 },
    { puntos: 2 }
  ];
  assert.equal(calcularPuntaje(insignias, config), 17.5);
});

test('calcularPuntaje ponderado aplica pesos', () => {
  const config = { formula: 'ponderado', escala: 100, ponderaciones: { civico: 2, esfuerzo: 0.5 }, topN: 3 };
  const insignias = [
    { puntos: 3, tipo: 'civico' },
    { puntos: 4, tipo: 'esfuerzo' },
    { puntos: 2 }
  ];
  const result = calcularPuntaje(insignias, config);
  assert.equal(result, 3 * 2 + 4 * 0.5 + 2 * 1);
});

test('calcularPuntaje topN considera mejores n', () => {
  const config = { formula: 'topN', topN: 2, escala: 100 };
  const insignias = [
    { puntos: 1 },
    { puntos: 10 },
    { puntos: 5 }
  ];
  assert.equal(calcularPuntaje(insignias, config), 15);
});

test('calcularPuntaje escala 10 convierte a escala decimal', () => {
  const config = { formula: 'suma', escala: 10 };
  const insignias = [
    { puntos: 18 }
  ];
  assert.equal(calcularPuntaje(insignias, config), 1.8);
});
