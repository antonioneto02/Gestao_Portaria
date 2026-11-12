'use strict';

const path = require('path');
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

const ATIVO = (process.env.TESTE_DIALETO || '').toLowerCase() === 'postgres' && !!process.env.TESTE_PG_DATABASE;

if (ATIVO) {
  const dotenv = require('dotenv');
  dotenv.config({ path: process.env.ENV_FILE || path.join(__dirname, '..', '..', '.env'), override: true });
  dotenv.config = () => ({ parsed: {} });
  Object.assign(process.env, {
    DB_DIALECT: 'postgres',
    PG_HOST: process.env.TESTE_PG_SERVER || 'localhost',
    PG_PORT: process.env.TESTE_PG_PORT || '5432',
    PG_USER: process.env.TESTE_PG_USER || 'postgres',
    PG_PASSWORD: process.env.TESTE_PG_PASSWORD || '',
    PG_DATABASE: process.env.TESTE_PG_DATABASE,
    PG_SSL: process.env.TESTE_PG_SSL || '',
  });
}

describe('Portaria no PostgreSQL (cópia do banco migrado)', { skip: !ATIVO && 'defina TESTE_DIALETO=postgres e TESTE_PG_*' }, () => {
  let conexoes, orm, cargas;
  const criados = [];

  before(() => {
    conexoes = require('../../config/sequelize');
    orm = require('../../models/orm');
    cargas = require('../../models/cargaPortariaModel');
    assert.equal(conexoes.sequelizeGestao.getDialect(), 'postgres');
    assert.equal(conexoes.sequelizeDw.getDialect(), 'mssql');
    assert.equal(conexoes.sequelizeProtheus.getDialect(), 'mssql');
  });

  after(async () => {
    for (const r of criados.reverse()) await r.destroy().catch(() => {});
    await conexoes.sequelizeGestao.close();
    await conexoes.sequelizeDw.close();
    await conexoes.sequelizeProtheus.close();
  });

  test('agendamento com visitantes: gravar, ler datas e apagar', async () => {
    const quando = new Date('2026-11-20T13:00:00.000Z');
    const ag = await orm.Agendamento.create({ tipo: 'VISITA', data_hora: quando, assunto: '[TESTE] PG', nome: 'Fornecedor Teste', status: 'AGENDADO' });
    criados.push(ag);
    const v = await orm.Visitante.create({ nome: '[TESTE] Visitante', agendamento_id: ag.id });
    criados.push(v);
    const lido = await orm.Agendamento.findByPk(ag.id);
    assert.equal(lido.data_hora.toISOString(), quando.toISOString());
    const visitantes = await orm.Visitante.findAll({ where: { agendamento_id: ag.id }, raw: true });
    assert.equal(visitantes.length, 1);
    assert.ok(visitantes[0].dt_inclusao instanceof Date);
  });

  test('busca de cargas ignora maiúsculas e devolve peso numérico', async () => {
    const c = await orm.CargaPortaria.create({ filial: '0101-Cini SJP', carga: 'TESTEPG123', placa: 'ABC1D23', peso: 1234.5, status: 'AGUARDANDO', motorista: 'Motorista Teste' });
    criados.push(c);
    const achadas = await cargas.search({ placa: 'abc1d23' });
    const minha = achadas.find(x => (x.id || (x.get && x.get('id'))) === c.id);
    assert.ok(minha, 'carga não encontrada pela placa em minúsculas');
    const peso = minha.peso !== undefined ? minha.peso : minha.get('peso');
    assert.equal(Number(peso), 1234.5);
  });

  test('horário de retirada único por pedido', async () => {
    const h = await orm.HorarioAgendamento.create({ pedido: 'PEDTESTEPG', data: new Date('2026-11-21T12:00:00Z'), status: 'AGENDADO' });
    criados.push(h);
    const achado = await orm.HorarioAgendamento.findOne({ where: { pedido: 'PEDTESTEPG' } });
    assert.equal(achado.id, h.id);
  });
});
