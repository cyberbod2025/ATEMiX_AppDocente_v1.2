import test from 'node:test';
import assert from 'node:assert/strict';
import { generateBadgeSVG } from '../modules/insignias.js';

test('generateBadgeSVG produce an svg snippet with custom design', () => {
  const svg = generateBadgeSVG({ shape: 'estrella', fill: '#ff0000', accent: '#0044ff', icon: '🎯' });
  assert.ok(svg.includes('<svg'), 'should include svg tag');
  assert.ok(svg.includes('🎯'), 'should contain the chosen icon');
  assert.ok(svg.includes('#ff0000'), 'should apply primary color');
});
