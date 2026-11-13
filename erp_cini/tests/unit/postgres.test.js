'use strict';

const path = require('path');
const { spawnSync } = require('child_process');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const RAIZ = path.join(__dirname, '..', '..');

function rodar(codigo, env) {
  const r = spawnSync(process.execPath, ['-e', codigo], { cwd: RAIZ, env: { ...process.env, DB_DIALECT: '', ...env }, encoding: 'utf8' });
  return { saida: r.stdout.trim().split('\n').pop(), erro: r.stderr };
}

const LER = "const c=require('./config/sequelize');const o=require('./models/orm');console.log([c.sequelizeGestao.getDialect(),c.sequelizeDw.getDialect(),c.sequelizeProtheus.getDialect(),o.Agendamento.getTableName().schema||'-',o.DimCliente.getTableName().schema||'-'].join('|'))";

test('sem DB_DIALECT tudo continua no SQL Server com schema dbo', () => {
  const r = rodar(LER, { DB_SERVER_ERP: 'sql' });
  assert.equal(r.saida, 'mssql|mssql|mssql|dbo|dbo', r.erro);
});

test('DB_DIALECT=postgres: portaria e dw vão para o PostgreSQL; o Protheus continua no SQL Server', () => {
  const r = rodar(LER, { DB_DIALECT: 'postgres', PG_HOST: 'pg', DB_SERVER_ERP: 'sql' });
  assert.equal(r.saida, 'postgres|postgres|mssql|-|dbo', r.erro);
});

