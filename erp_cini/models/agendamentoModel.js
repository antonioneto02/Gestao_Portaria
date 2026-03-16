'use strict';

const { Op } = require('sequelize');
const Agendamento = require('./orm/Agendamento');
const Visitante   = require('./orm/Visitante');

function formatDate(d) {
  if (!(d instanceof Date)) return d;
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${Y}-${M}-${D} ${h}:${m}:${s}`;
}

function toPlain(row) {
  const obj = row.get ? row.get({ plain: true }) : Object.assign({}, row);
  for (const k in obj) {
    if (obj[k] instanceof Date) obj[k] = formatDate(obj[k]);
  }
  return obj;
}

function parseDataHora(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const s = String(value).trim();
  const m = s.match(/(\d{4})-(\d{2})-(\d{2}).*?(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    return new Date(
      parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10),
      parseInt(m[4], 10), parseInt(m[5], 10), m[6] ? parseInt(m[6], 10) : 0
    );
  }
  const parsed = new Date(s);
  return isNaN(parsed) ? null : parsed;
}

async function getAll() {
  try {
    const rows = await Agendamento.findAll({ order: [['data_hora', 'DESC']] });
    return rows.map(toPlain);
  } catch (err) {
    console.error('agendamentoModel.getAll error:', err.message);
    throw err;
  }
}

async function getPending() {
  try {
    const rows = await Agendamento.findAll({
      where: { status: 'Pendente' },
      order: [['data_hora', 'ASC']],
    });
    return rows.map(toPlain);
  } catch (err) {
    console.error('agendamentoModel.getPending error:', err.message);
    throw err;
  }
}

async function getToday() {
  try {
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const rows  = await Agendamento.findAll({
      where: { data_hora: { [Op.between]: [start, end] } },
      order: [['data_hora', 'DESC']],
    });
    return rows.map(toPlain);
  } catch (err) {
    console.error('agendamentoModel.getToday error:', err.message);
    throw err;
  }
}

async function getById(id) {
  try {
    const row = await Agendamento.findByPk(parseInt(id, 10));
    return row ? toPlain(row) : null;
  } catch (err) {
    console.error('agendamentoModel.getById error:', err.message);
    throw err;
  }
}

async function insert(payload) {
  try {
    const created = await Agendamento.create({
      tipo:             payload.tipo             || null,
      data_hora:        parseDataHora(payload.data_hora),
      assunto:          payload.assunto          || null,
      nome:             payload.nome             || payload.nome_solicitante || null,
      nome_solicitante: payload.nome             || payload.nome_solicitante || null,
      telefone:         payload.telefone         || null,
      cpf_cnpj:         payload.cpf_cnpj         || null,
      responsavel:      payload.responsavel      || payload.responsavel_name || null,
      observacoes:      payload.observacoes      || null,
      status:           'Pendente',
      criado_por:       payload.criado_por       || payload.createdBy || null,
      dt_criacao:       new Date(),
    });

    try {
      if (created.id) {
        await Visitante.create({
          nome:           created.nome,
          agendamento_id: created.id,
          dt_inclusao:    new Date(),
        });
      }
    } catch (e) {
      console.error('Erro ao inserir visitante:', e.message);
    }

    return created.id;
  } catch (err) {
    console.error('agendamentoModel.insert error:', err.message);
    throw err;
  }
}

async function updateStatus(id, status, marcadoPor, telefone, cpf_cnpj, dt_cheg) {
  try {
    const updates = { status };
    if (marcadoPor != null) updates.concluido_por = String(marcadoPor);
    if (telefone   != null) updates.telefone      = String(telefone);
    if (cpf_cnpj   != null) updates.cpf_cnpj      = String(cpf_cnpj);
    if (dt_cheg    != null) updates.dt_cheg        = dt_cheg;

    await Agendamento.update(updates, { where: { id: parseInt(id, 10) } });

    const visitorUpdates = {};
    if (telefone != null) visitorUpdates.telefone = String(telefone);
    if (cpf_cnpj != null) visitorUpdates.cpf_cnpj = String(cpf_cnpj);

    if (Object.keys(visitorUpdates).length) {
      try {
        await Visitante.update(visitorUpdates, { where: { agendamento_id: parseInt(id, 10) } });
      } catch (e) {
        console.error('Erro ao atualizar visitante:', e.message);
      }
    }
  } catch (err) {
    console.error('agendamentoModel.updateStatus error:', err.message);
    throw err;
  }
}

async function deleteById(id) {
  try {
    await Agendamento.destroy({ where: { id: parseInt(id, 10) } });
  } catch (err) {
    console.error('agendamentoModel.deleteById error:', err.message);
    throw err;
  }
}

async function markAsSent(ids) {
  try {
    const idList = ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    if (!idList.length) return;
    await Agendamento.update({ enviou: 1 }, { where: { id: { [Op.in]: idList } } });
  } catch (err) {
    console.error('agendamentoModel.markAsSent error:', err.message);
    throw err;
  }
}

module.exports = {
  getAll,
  getToday,
  getPending,
  getById,
  insert,
  updateStatus,
  deleteById,
  markAsSent,
};
