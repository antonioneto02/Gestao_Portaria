'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { DIALETO, ativo, prepararBanco, emTransacaoDesfeita, restaurarIdentidades, semPermissaoDeGravar } = require('./ambiente');

describe(`Gestão de portaria no banco real (${DIALETO || 'desligado'})`, { skip: !ativo && 'defina TESTE_DIALETO=mssql ou TESTE_DIALETO=postgres + TESTE_PG_*' }, () => {
  let sequelize, m, agendamentos, cargas, horarios, semPermissao;

  before(async () => {
    m = require('../../models');
    sequelize = m.sequelize;
    agendamentos = require('../../models/agendamentoModel');
    cargas = require('../../models/cargaPortariaModel');
    horarios = require('../../models/horariosRetiraModel');
    assert.equal(sequelize.getDialect(), DIALETO);
    await prepararBanco(sequelize);
    semPermissao = await semPermissaoDeGravar(sequelize);
  });

  after(async () => {
    if (!semPermissao) await restaurarIdentidades(sequelize);
    await sequelize.close();
  });

  const gravando = fn => t => (semPermissao ? t.skip(semPermissao) : emTransacaoDesfeita(sequelize, fn));

  test('agendamentos: inclusão e ordem por data com datas vazias no fim (igual ao SQL Server)', gravando(async () => {
    const semData = await m.Agendamento.create({ tipo: 'ZZ', nome: 'ZZ sem data', status: 'Pendente', dt_criacao: new Date() });
    const id = await agendamentos.insert({ tipo: 'ZZ', nome: 'ZZ Visita ORM', data_hora: '2099-01-02T10:00', criado_por: 'teste' });
    const todos = (await agendamentos.getAll()).filter(a => a.tipo === 'ZZ');
    assert.deepEqual(todos.map(a => a.id), [id, semData.id]);
    const lido = await agendamentos.getById(id);
    assert.equal(lido.status, 'Pendente');
  }));

  test('cargas: busca por placa/carga/filial ignora maiúsculas', gravando(async () => {
    await cargas.insert({ filial: 'ZZ01', carga: 'CARGA-ZZ-ORM', placa: 'ZZZ9Z99', tipo_entrega: 'X', motorista: 'M', peso: 10.5, criado_por: 't', dt_entrega: new Date() });
    const achadas = await cargas.search({ placa: 'zzz9z', carga: 'carga-zz' });
    assert.equal(achadas.length, 1);
    assert.equal(Number(achadas[0].peso), 10.5);
  }));

  test('horários de retirada: período em ordem crescente', gravando(async () => {
    await m.HorarioAgendamento.create({ pedido: 'ZZ2', data: new Date(2099, 0, 3, 9), status: 'PENDENTE', dt_criacao: new Date() });
    await m.HorarioAgendamento.create({ pedido: 'ZZ1', data: new Date(2099, 0, 2, 9), status: 'PENDENTE', dt_criacao: new Date() });
    const lista = await horarios.getReservationsBetween(new Date(2099, 0, 1), new Date(2099, 0, 5));
    assert.deepEqual(lista.filter(h => /^ZZ/.test(h.pedido)).map(h => h.pedido), ['ZZ1', 'ZZ2']);
  }));
});
