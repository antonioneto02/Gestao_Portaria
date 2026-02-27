const sql = require('mssql');
const dbDw = require('../config/dbConfigDw');
const dbCentral = require('../config/database');

async function getReservationsBetween(startDate, endDate) {
  try {
    const pool = await new sql.ConnectionPool(dbDw).connect();
    try {
      const req = pool.request();
      req.input('start', sql.DateTime2, startDate);
      req.input('end', sql.DateTime2, endDate);
        const q = `SELECT h.id, h.pedido, h.data, h.categoria AS categoria, h.observacao AS observacao, h.criado_por AS usuario, h.nome_cli AS cliente_nome, h.cod_cli AS cliente_cod, h.status AS status, h.data_entrada AS data_entrada, h.data_saida AS data_saida, h.dt_criacao AS created_at,
                 c.NOME AS cliente_nome_dim, c.FANTASIA AS cliente_fantasia
               FROM [dw].[dbo].[HORARIOS_AGENDAMENTO] h
               LEFT JOIN [dw].[dbo].[DIM_CLIENTES] c ON c.COD_CLIENTE = h.cod_cli
               WHERE h.data BETWEEN @start AND @end`;
      const r = await req.query(q);
      const rows = r.recordset || [];
      return rows.map(row => {
        const nome = row.cliente_nome || row.cliente_fantasia || row.cliente_nome_dim || null;
        return Object.assign({}, row, { cliente_nome: nome, cliente_cod: row.cliente_cod });
      });
    } finally {
      try { await pool.close(); } catch(_){}
    }
  } catch (e) {
    console.error('Erro horariosRetiraModel.getReservationsBetween:', e && e.message ? e.message : e);
    return [];
  }
}

async function getReservationByDateTime(dt) {
  try {
    const pool = await new sql.ConnectionPool(dbDw).connect();
    try {
        const r = await pool.request().input('dt', sql.DateTime2, dt).query('SELECT TOP 1 id, pedido, data, categoria AS categoria, observacao AS observacao, criado_por AS usuario, nome_cli AS cliente_nome, cod_cli AS cliente_cod, status AS status, data_entrada AS data_entrada, data_saida AS data_saida, dt_criacao AS created_at FROM [dw].[dbo].[HORARIOS_AGENDAMENTO] WHERE data = @dt');
      const row = (r.recordset && r.recordset[0]) || null;
      if (!row) return null;
      return Object.assign({}, row);
    } finally {
      try { await pool.close(); } catch(_){}
    }
  } catch (e) {
    console.error('Erro horariosRetiraModel.getReservationByDateTime:', e && e.message ? e.message : e);
    return null;
  }
}

async function getReservationById(id) {
  try {
    const pool = await new sql.ConnectionPool(dbDw).connect();
    try {
      const r = await pool.request().input('id', sql.Int, id).query('SELECT TOP 1 id, pedido, data, categoria AS categoria, observacao AS observacao, criado_por AS usuario, nome_cli AS cliente_nome, cod_cli AS cliente_cod, status AS status, data_entrada AS data_entrada, data_saida AS data_saida, dt_criacao AS created_at FROM [dw].[dbo].[HORARIOS_AGENDAMENTO] WHERE id = @id');
      const row = (r.recordset && r.recordset[0]) || null;
      if (!row) return null;
      return Object.assign({}, row);
    } finally {
      try { await pool.close(); } catch(_){ }
    }
  } catch (e) {
    console.error('Erro horariosRetiraModel.getReservationById:', e && e.message ? e.message : e);
    return null;
  }
}

async function getAllReservations() {
  try {
    const pool = await new sql.ConnectionPool(dbDw).connect();
    try {
      const req = pool.request();
      const q = `SELECT id, pedido, data, nome_cli, cod_cli, categoria, observacao, criado_por, status, data_entrada, data_saida, dt_criacao FROM [dw].[dbo].[HORARIOS_AGENDAMENTO] ORDER BY dt_criacao DESC`;
      const r = await req.query(q);
      const rows = r.recordset || [];
      return rows.map(row => ({
        id: row.id,
        pedido: row.pedido,
        data: row.data,
        nome_cli: row.nome_cli || row.cliente_nome || null,
        cod_cli: row.cod_cli,
        categoria: row.categoria,
        observacao: row.observacao,
        criado_por: row.criado_por || row.usuario || null,
        status: row.status,
        data_entrada: row.data_entrada,
        data_saida: row.data_saida,
        dt_criacao: row.dt_criacao
      }));
    } finally {
      try { await pool.close(); } catch(_){}
    }
  } catch (e) {
    console.error('Erro horariosRetiraModel.getAllReservations:', e && e.message ? e.message : e);
    return [];
  }
}

async function createReservation({ pedido, dt_horario, usuario, cliente_nome, cliente_cod, categoria, observacao, status, attachment_path, attachment_name, attachment_b64, attachment_mimetype }) {
  try {
    const pool = await new sql.ConnectionPool(dbDw).connect();
    try {
      const req = pool.request();
      req.input('pedido', sql.NVarChar(100), pedido || null);
      req.input('data', sql.DateTime2, dt_horario);
        const actualStatus = (status && String(status).trim()) ? String(status).trim() : 'PENDENTE';
        req.input('criado_por', sql.NVarChar(200), usuario || null);
        req.input('nome_cli', sql.NVarChar(500), cliente_nome || null);
        req.input('cod_cli', sql.NVarChar(100), cliente_cod || null);
        req.input('categoria', sql.NVarChar(50), categoria || null);
        req.input('observacao', sql.NVarChar(1000), observacao || null);
        req.input('status', sql.NVarChar(50), actualStatus);
        const q = `INSERT INTO [dw].[dbo].[HORARIOS_AGENDAMENTO] (pedido, data, criado_por, nome_cli, cod_cli, categoria, observacao, status) VALUES (@pedido, @data, @criado_por, @nome_cli, @cod_cli, @categoria, @observacao, @status); SELECT SCOPE_IDENTITY() AS id;`;
      const r = await req.query(q);
      const newId = (r.recordset && r.recordset[0] && r.recordset[0].id) ? r.recordset[0].id : null;

      try {
        const cat = (categoria || '').toString().trim().toLowerCase();
        const sendEmailFor = ['retira', 'viagem', 'doacao'];
        if (sendEmailFor.includes(cat) && newId) {
          const poolCentral = await new sql.ConnectionPool(dbCentral).connect();
          try {
            const reqCentral = poolCentral.request();
                const assunto = `Novo agendamento - ${(categoria || '').toString().toUpperCase()} (${String(cliente_cod || '').trim()})`;
            let dtFormatted = '';
            let cliente_fantasia = null;
            try {
              if (cliente_cod) {
                const poolLookup = await new sql.ConnectionPool(dbDw).connect();
                try {
                  const rLookup = await poolLookup.request().input('cod', sql.NVarChar(100), String(cliente_cod)).query('SELECT TOP 1 FANTASIA FROM [dw].[dbo].[DIM_CLIENTES] WHERE COD_CLIENTE = @cod');
                  if (rLookup.recordset && rLookup.recordset[0]) cliente_fantasia = rLookup.recordset[0].FANTASIA || null;
                } finally {
                  try { await poolLookup.close(); } catch(_){}
                }
              }
            } catch(eLookup) {}
            try {
              const dtObj = dt_horario ? new Date(dt_horario) : null;
              if (dtObj && !isNaN(dtObj.getTime())) {
                dtFormatted = dtObj.toLocaleString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
              } else {
                dtFormatted = String(dt_horario || '');
              }
            } catch (e) { dtFormatted = String(dt_horario || ''); }

            const categoryLabel = (cat === 'retira') ? 'retirada' : (cat === 'doacao' ? 'doação' : cat);
            const corpo = `<!doctype html><html><body>` +
              `<p>Olá,</p>` +
              `<p>Um novo agendamento para <strong>${categoryLabel}</strong> foi criado com os dados abaixo:</p>` +
              `<ul>` +
              `<li><strong>Pedido:</strong> ${pedido || ''}</li>` +
              `<li><strong>Horário:</strong> ${dtFormatted}</li>` +
              `<li><strong>Reserva criada por:</strong> ${usuario || ''}</li>` +
              `<li><strong>Cliente:</strong> ${cliente_nome || ''} (${cliente_cod || ''})</li>` +
              `<li><strong>Fantasia:</strong> ${cliente_fantasia || ''}</li>` +
              `<li><strong>Categoria:</strong> ${(categoria || '').toString().toUpperCase()}</li>` +
              `<li><strong>Observação:</strong> ${observacao || ''}</li>` +
              `</ul>` +
              `<p>Por favor, verifique e entre em contato em caso de dúvidas.</p>` +
              `<p>Atenciosamente,<br/>Equipe CINI</p>` +
              `</body></html>`;
            reqCentral.input('destinatario', sql.NVarChar(500), 'ti02@cini.com.br');
            reqCentral.input('mensagem', sql.NVarChar(sql.MAX), corpo);
            reqCentral.input('tipo_mensagem', sql.NVarChar(50), 'EMAIL');
            reqCentral.input('status', sql.NVarChar(50), 'PENDENTE');
            reqCentral.input('tentativas', sql.Int, 0);
            reqCentral.input('template_name', sql.NVarChar(200), null);
            reqCentral.input('template_params', sql.NVarChar(sql.MAX), null);
            const metadadosObj = { assunto, reserva_id: newId };
            if (cliente_fantasia) metadadosObj.cliente_fantasia = cliente_fantasia;
            if (attachment_path) metadadosObj.attachment_path = attachment_path;
            if (attachment_name) metadadosObj.attachment_name = attachment_name;
            if (attachment_b64) metadadosObj.attachment_b64 = attachment_b64;
            if (attachment_mimetype) metadadosObj.attachment_mimetype = attachment_mimetype;
            reqCentral.input('metadados', sql.NVarChar(sql.MAX), JSON.stringify(metadadosObj));
            reqCentral.input('erro', sql.NVarChar(1000), null);
            reqCentral.input('dtenvio', sql.DateTime2, null);
            reqCentral.input('message_id', sql.NVarChar(200), null);
            const qCentral = `INSERT INTO [dw].[dbo].[FATO_FILA_NOTIFICACOES_DEV] (TIPO_MENSAGEM, DESTINATARIO, MENSAGEM, TEMPLATE_NAME, TEMPLATE_PARAMS, STATUS, TENTATIVAS, ERRO, DTINC, DTENVIO, MESSAGE_ID, METADADOS) VALUES (@tipo_mensagem, @destinatario, @mensagem, @template_name, @template_params, @status, @tentativas, @erro, GETDATE(), @dtenvio, @message_id, @metadados)`;
            await reqCentral.query(qCentral);
          } finally {
            try { await poolCentral.close(); } catch(_){}
          }
        }
      } catch (eCentral) {
        console.error('Erro ao enfileirar notificação central:', eCentral && eCentral.message ? eCentral.message : eCentral);
      }

      return newId;
    } finally {
      try { await pool.close(); } catch(_){}
    }
  } catch (e) {
    const msg = (e && e.message) ? e.message.toString() : String(e);
      if (msg.indexOf('IX_HORARIOS_AGENDAMENTO_UNQ_DATA') !== -1 || msg.toLowerCase().indexOf('unique') !== -1) {
      const err = new Error('Slot already booked');
      err.code = 'SLOT_BOOKED';
      throw err;
    }
    console.error('Erro horariosRetiraModel.createReservation:', e && e.message ? e.message : e);
    throw e;
  }
}

async function updateReservationDates(id, { data_entrada, data_saida }) {
  try {
    const pool = await new sql.ConnectionPool(dbDw).connect();
    try {
      const req = pool.request();
      req.input('id', sql.Int, id);
      req.input('data_entrada', sql.DateTime2, data_entrada || null);
      req.input('data_saida', sql.DateTime2, data_saida || null);
      let q = `UPDATE [dw].[dbo].[HORARIOS_AGENDAMENTO] SET data_entrada = @data_entrada, data_saida = @data_saida`;
      if (data_entrada && data_saida) {
        q += `, status = 'CONCLUIDO'`;
      } else if (data_entrada && !data_saida) {
        q += `, status = 'FALTA DT SAIDA'`;
      }
      q += ` WHERE id = @id; SELECT TOP 1 id, pedido, data, categoria AS categoria, observacao AS observacao, criado_por AS usuario, nome_cli AS cliente_nome, cod_cli AS cliente_cod, status AS status, data_entrada AS data_entrada, data_saida AS data_saida, dt_criacao AS created_at FROM [dw].[dbo].[HORARIOS_AGENDAMENTO] WHERE id = @id`;
      const r = await req.query(q);
      return (r.recordset && r.recordset[0]) ? r.recordset[0] : null;
    } finally {
      try { await pool.close(); } catch(_){ }
    }
  } catch (e) {
    console.error('Erro horariosRetiraModel.updateReservationDates:', e && e.message ? e.message : e);
    throw e;
  }
}

module.exports = {
  getReservationsBetween,
  getReservationByDateTime,
  getReservationById,
  createReservation
  , updateReservationDates
  , getAllReservations
};
