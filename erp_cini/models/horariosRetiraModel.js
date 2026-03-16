'use strict';

const { Op } = require('sequelize');
const HorarioAgendamento  = require('./orm/HorarioAgendamento');
const DimCliente          = require('./orm/DimCliente');
const FatoFilaNotificacao = require('./orm/FatoFilaNotificacao');

function toPlain(row) {
  return row.get ? row.get({ plain: true }) : Object.assign({}, row);
}

function mapRow(r) {
  return {
    id:           r.id,
    pedido:       r.pedido,
    data:         r.data,
    categoria:    r.categoria,
    observacao:   r.observacao,
    usuario:      r.criado_por,
    cliente_nome: r.nome_cli,
    cliente_cod:  r.cod_cli,
    status:       r.status,
    data_entrada: r.data_entrada,
    data_saida:   r.data_saida,
    created_at:   r.dt_criacao,
  };
}

async function enrichWithClientInfo(rows) {
  const codes = [...new Set(rows.map(r => r.cliente_cod).filter(Boolean))];
  if (!codes.length) return rows;

  const clients = await DimCliente.findAll({ where: { COD_CLIENTE: { [Op.in]: codes } } });
  const map = {};
  for (const c of clients) map[c.COD_CLIENTE] = c;

  return rows.map(r => {
    const c = map[r.cliente_cod];
    return Object.assign({}, r, {
      cliente_nome:     r.cliente_nome || (c && (c.FANTASIA || c.NOME)) || null,
      cliente_fantasia: c ? c.FANTASIA : null,
    });
  });
}
async function getReservationsBetween(startDate, endDate) {
  try {
    const rows = await HorarioAgendamento.findAll({
      where: { data: { [Op.between]: [startDate, endDate] } },
      order: [['data', 'ASC']],
    });
    const plain = rows.map(r => mapRow(toPlain(r)));
    return enrichWithClientInfo(plain);
  } catch (e) {
    console.error('horariosRetiraModel.getReservationsBetween:', e.message);
    return [];
  }
}

async function getReservationByDateTime(dt) {
  try {
    const row = await HorarioAgendamento.findOne({ where: { data: dt } });
    return row ? mapRow(toPlain(row)) : null;
  } catch (e) {
    console.error('horariosRetiraModel.getReservationByDateTime:', e.message);
    return null;
  }
}

async function getReservationById(id) {
  try {
    const row = await HorarioAgendamento.findByPk(id);
    return row ? mapRow(toPlain(row)) : null;
  } catch (e) {
    console.error('horariosRetiraModel.getReservationById:', e.message);
    return null;
  }
}

async function getAllReservations() {
  try {
    const rows = await HorarioAgendamento.findAll({ order: [['dt_criacao', 'DESC']] });
    return rows.map(r => {
      const p = toPlain(r);
      return {
        id:           p.id,
        pedido:       p.pedido,
        data:         p.data,
        nome_cli:     p.nome_cli,
        cod_cli:      p.cod_cli,
        categoria:    p.categoria,
        observacao:   p.observacao,
        criado_por:   p.criado_por,
        status:       p.status,
        data_entrada: p.data_entrada,
        data_saida:   p.data_saida,
        dt_criacao:   p.dt_criacao,
      };
    });
  } catch (e) {
    console.error('horariosRetiraModel.getAllReservations:', e.message);
    return [];
  }
}

async function createReservation({
  pedido, dt_horario, usuario, cliente_nome, cliente_cod,
  categoria, observacao, status,
  attachment_path, attachment_name, attachment_b64, attachment_mimetype,
}) {
  try {
    const actualStatus = (status && String(status).trim()) ? String(status).trim() : 'PENDENTE';
    const created = await HorarioAgendamento.create({
      pedido:     pedido       || null,
      data:       dt_horario,
      criado_por: usuario      || null,
      nome_cli:   cliente_nome || null,
      cod_cli:    cliente_cod  || null,
      categoria:  categoria    || null,
      observacao: observacao   || null,
      status:     actualStatus,
    });
    const newId = created.id;
    try {
      const cat = (categoria || '').toString().trim().toLowerCase();
      if (['retira', 'viagem', 'doacao'].includes(cat) && newId) {
        let cliente_fantasia = null;
        try {
          if (cliente_cod) {
            const dimCli = await DimCliente.findOne({ where: { COD_CLIENTE: String(cliente_cod) } });
            if (dimCli) cliente_fantasia = dimCli.FANTASIA || null;
          }
        } catch (_) {}

        let dtFormatted = '';
        try {
          const dtObj = dt_horario ? new Date(dt_horario) : null;
          if (dtObj && !isNaN(dtObj.getTime())) {
            dtFormatted = dtObj.toLocaleString('pt-BR', {
              weekday: 'long', day: '2-digit', month: '2-digit',
              year: 'numeric', hour: '2-digit', minute: '2-digit',
            });
          } else {
            dtFormatted = String(dt_horario || '');
          }
        } catch (_) { dtFormatted = String(dt_horario || ''); }

        const assunto       = `Novo agendamento - ${(categoria || '').toUpperCase()} (${String(pedido || '').trim()})`;
        const categoryLabel = cat === 'retira' ? 'retirada' : cat === 'doacao' ? 'doação' : cat;
        const corpo         = `<!doctype html><html><body>` +
          `<p>Olá,</p>` +
          `<p>Um novo agendamento para <strong>${categoryLabel}</strong> foi criado com os dados abaixo:</p>` +
          `<ul>` +
          `<li><strong>Pedido:</strong> ${pedido || ''}</li>` +
          `<li><strong>Horário:</strong> ${dtFormatted}</li>` +
          `<li><strong>Reserva criada por:</strong> ${usuario || ''}</li>` +
          `<li><strong>Cliente:</strong> ${cliente_nome || ''} (${cliente_cod || ''})</li>` +
          `<li><strong>Fantasia:</strong> ${cliente_fantasia || ''}</li>` +
          `<li><strong>Categoria:</strong> ${(categoria || '').toUpperCase()}</li>` +
          `<li><strong>Observação:</strong> ${observacao || ''}</li>` +
          `</ul>` +
          `<p>Por favor, verifique e entre em contato em caso de dúvidas.</p>` +
          `<p>Atenciosamente,<br/>Equipe CINI</p>` +
          `</body></html>`;

        const metadadosObj = { assunto, reserva_id: newId };
        if (cliente_fantasia)   metadadosObj.cliente_fantasia   = cliente_fantasia;
        if (attachment_path)    metadadosObj.attachment_path    = attachment_path;
        if (attachment_name)    metadadosObj.attachment_name    = attachment_name;
        if (attachment_b64)     metadadosObj.attachment_b64     = attachment_b64;
        if (attachment_mimetype) metadadosObj.attachment_mimetype = attachment_mimetype;

        const notifBase = {
          TIPO_MENSAGEM:   'EMAIL',
          MENSAGEM:        corpo,
          TEMPLATE_NAME:   null,
          TEMPLATE_PARAMS: null,
          STATUS:          'PENDENTE',
          TENTATIVAS:      0,
          ERRO:            null,
          DTINC:           new Date(),
          DTENVIO:         null,
          MESSAGE_ID:      null,
          METADADOS:       JSON.stringify(metadadosObj),
        };

        await FatoFilaNotificacao.create({ ...notifBase, DESTINATARIO: 'ti02@cini.com.br' });
        await FatoFilaNotificacao.create({ ...notifBase, DESTINATARIO: '' });
      }
    } catch (eCentral) {
      console.error('Erro ao enfileirar notificação central:', eCentral.message);
    }

    return newId;
  } catch (e) {
    const msg = (e && e.message) ? e.message.toString() : String(e);
    if (msg.includes('IX_HORARIOS_AGENDAMENTO_UNQ_DATA') || msg.toLowerCase().includes('unique')) {
      const err = new Error('Slot already booked');
      err.code = 'SLOT_BOOKED';
      throw err;
    }
    console.error('horariosRetiraModel.createReservation:', e.message);
    throw e;
  }
}

async function updateReservationDates(id, { data_entrada, data_saida }) {
  try {
    const updates = { data_entrada: data_entrada || null, data_saida: data_saida || null };
    if (data_entrada && data_saida)   updates.status = 'CONCLUIDO';
    else if (data_entrada && !data_saida) updates.status = 'FALTA DT SAIDA';

    await HorarioAgendamento.update(updates, { where: { id } });
    const row = await HorarioAgendamento.findByPk(id);
    return row ? mapRow(toPlain(row)) : null;
  } catch (e) {
    console.error('horariosRetiraModel.updateReservationDates:', e.message);
    throw e;
  }
}

async function conclude(id) {
  try {
    await HorarioAgendamento.update(
      { status: 'Concluído', data_saida: new Date() },
      { where: { id: parseInt(id, 10) } }
    );
  } catch (e) {
    console.error('horariosRetiraModel.conclude:', e.message);
    throw e;
  }
}

async function deleteById(id) {
  try {
    await HorarioAgendamento.destroy({ where: { id: parseInt(id, 10) } });
  } catch (e) {
    console.error('horariosRetiraModel.deleteById:', e.message);
    throw e;
  }
}

module.exports = {
  getReservationsBetween,
  getReservationByDateTime,
  getReservationById,
  getAllReservations,
  createReservation,
  updateReservationDates,
  conclude,
  deleteById,
};
