'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const RAIZ = path.join(__dirname, '..', '..');

function rodar(codigo, env = {}) {
  const r = spawnSync(process.execPath, ['-e', codigo], { cwd: RAIZ, env: { ...process.env, DB_DIALECT: '', ...env }, encoding: 'utf8' });
  return { status: r.status, saida: r.stdout.trim(), erro: r.stderr };
}

const DIALETOS = "const c = require('./config/sequelize'); console.log([c.sequelizeGestao.getDialect(), c.sequelizeDw.getDialect(), c.sequelizeProtheus.getDialect()].join('|'))";

describe('ORM: dialeto do banco', () => {
  test('usa SQL Server por padrão', () => {
    const r = rodar(DIALETOS);
    assert.equal(r.saida, 'mssql|mssql|mssql', r.erro);
  });

  test('DB_DIALECT=postgres troca só as tabelas de gestão; DW e Protheus continuam SQL Server', () => {
    const r = rodar(DIALETOS, { DB_DIALECT: 'postgres' });
    assert.equal(r.saida, 'postgres|mssql|mssql', r.erro);
  });

  test('dialeto desconhecido falha logo ao subir', () => {
    const r = rodar("require('./config/sequelize')", { DB_DIALECT: 'oracle' });
    assert.notEqual(r.status, 0);
    assert.match(r.erro, /DB_DIALECT não suportado/);
  });
});

describe('ORM: DDL do PostgreSQL acompanha os models', () => {
  const ddl = fs.readFileSync(path.join(RAIZ, 'database', 'sql', 'postgres', 'create_tables.sql'), 'utf8');
  const tabelas = {};
  for (const m of ddl.matchAll(/CREATE TABLE IF NOT EXISTS "(\w+)" \(([\s\S]*?)\n\);/g)) {
    tabelas[m[1]] = new Set([...m[2].matchAll(/^\s*"(\w+)"/gm)].map(c => c[1]));
  }
  const modelos = require('../../models');

  for (const nome of modelos.ORDEM) {
    test(`${nome} tem tabela e todas as colunas no create_tables.sql`, () => {
      const model = modelos[nome];
      const colunas = tabelas[model.tableName];
      assert.ok(colunas, `tabela ${model.tableName} ausente no DDL`);
      for (const atributo of Object.values(model.rawAttributes)) {
        assert.ok(colunas.has(atributo.field), `${model.tableName}.${atributo.field} ausente no DDL`);
      }
    });
  }
});
