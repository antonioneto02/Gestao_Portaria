'use strict';

const fs = require('fs');
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

test('DB_DIALECT=postgres só move o banco da portaria; dw e Protheus seguem no SQL Server', () => {
  const r = rodar(LER, { DB_DIALECT: 'postgres', PG_HOST: 'pg', PG_DATABASE: 'cini_portaria', DB_SERVER_ERP: 'sql' });
  assert.equal(r.saida, 'postgres|mssql|mssql|-|dbo', r.erro);
});

test('DDL do PostgreSQL tem as tabelas e colunas dos models da portaria', () => {
  const ddl = fs.readFileSync(path.join(RAIZ, 'database', 'sql', 'postgres', 'create_tables.sql'), 'utf8');
  const r = rodar("const o=require('./models/orm');console.log('JSON:'+JSON.stringify(['Agendamento','CargaPortaria','HorarioAgendamento','Visitante'].map(n=>[o[n].tableName,Object.values(o[n].rawAttributes).map(a=>a.field)])))",
    { DB_DIALECT: 'postgres', PG_HOST: 'pg', PG_DATABASE: 'd', DB_SERVER_ERP: 'sql' });
  const modelos = JSON.parse((r.saida.match(/JSON:(.*)$/) || [])[1] || 'null');
  assert.ok(Array.isArray(modelos), r.erro);
  for (const [tabela, colunas] of modelos) {
    const bloco = ddl.split(/CREATE TABLE IF NOT EXISTS /).find(b => b.startsWith(`"${tabela}"`));
    assert.ok(bloco, `tabela ${tabela} ausente do DDL`);
    for (const c of colunas) assert.ok(bloco.includes(`"${c}"`), `coluna ${tabela}.${c} ausente do DDL`);
  }
});
