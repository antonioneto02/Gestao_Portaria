'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

function listModules(dirRelative) {
  const dir = path.join(__dirname, '..', '..', dirRelative);
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.js') && !f.endsWith('.test.js'))
    .map((f) => [`${dirRelative}/${f}`, path.join(dir, f)]);
}

const modules = [
  ...listModules('controllers'),
  ...listModules('models'),
  ...listModules('models/orm'),
];

test('modules', async (t) => {
  for (const [name, fullPath] of modules) {
    await t.test(`${name} carrega e exporta algo válido`, () => {
      const mod = require(fullPath);
      // models/orm exportam a classe Sequelize direto (function); os
      // demais exportam um objeto de funções.
      if (typeof mod === 'function') {
        return;
      }
      assert.equal(typeof mod, 'object', `${name} não exporta objeto nem função`);
      const keys = Object.keys(mod);
      assert.ok(keys.length > 0, `${name} não exporta nada`);
      for (const key of keys) {
        assert.ok(['function', 'string', 'number', 'object'].includes(typeof mod[key]), `${name}.${key} tem tipo inesperado`);
      }
    });
  }
});
