const sql = require('mssql');
const dbDw = require('../config/dbConfigDw');

async function getAll() {
  try {
    const pool = await new sql.ConnectionPool(dbDw).connect();
    try {
      
      const q = `SELECT * FROM [dw].[dbo].[AGENDAMENTO_PORTAL] ORDER BY data_hora DESC`;
      const r = await pool.request().query(q);
      const rows = r.recordset || [];
      const normalized = rows.map(row => {
        const copy = Object.assign({}, row);
        for (const k in copy) {
            if (copy[k] instanceof Date) {
              const d = copy[k];
              const Y = d.getFullYear();
              const M = String(d.getMonth() + 1).padStart(2, '0');
              const D = String(d.getDate()).padStart(2, '0');
              const h = String(d.getHours()).padStart(2, '0');
              const m = String(d.getMinutes()).padStart(2, '0');
              const s = String(d.getSeconds()).padStart(2, '0');
              copy[k] = `${Y}-${M}-${D} ${h}:${m}:${s}`;
          }
        }
        return copy;
      });
      return normalized;
    } finally {
      try { await pool.close(); } catch(_){ }
    }
  } catch (err) {
    console.error('agendamentoModel.getAll error:', err && err.message ? err.message : err);
    throw err;
  }
}

async function getToday() {
  try {
    const pool = await new sql.ConnectionPool(dbDw).connect();
    try {
      const q = `SELECT * FROM [dw].[dbo].[AGENDAMENTO_PORTAL] WHERE CAST(data_hora AS DATE) = CAST(GETDATE() AS DATE) ORDER BY data_hora DESC`;
      const r = await pool.request().query(q);
      const rows = r.recordset || [];
      const normalized = rows.map(row => {
        const copy = Object.assign({}, row);
        for (const k in copy) {
            if (copy[k] instanceof Date) {
              const d = copy[k];
              const Y = d.getFullYear();
              const M = String(d.getMonth() + 1).padStart(2, '0');
              const D = String(d.getDate()).padStart(2, '0');
              const h = String(d.getHours()).padStart(2, '0');
              const m = String(d.getMinutes()).padStart(2, '0');
              const s = String(d.getSeconds()).padStart(2, '0');
              copy[k] = `${Y}-${M}-${D} ${h}:${m}:${s}`;
          }
        }
        return copy;
      });
      return normalized;
    } finally {
      try { await pool.close(); } catch(_){ }
    }
  } catch (err) {
    console.error('agendamentoModel.getToday error:', err && err.message ? err.message : err);
    throw err;
  }
}

async function insert(payload) {
  try {
    const pool = await new sql.ConnectionPool(dbDw).connect();
    try {
      const req = pool.request();
      req.input('tipo', sql.VarChar(100), payload.tipo || null);
      let dt = null;
      try {
        if (payload.data_hora instanceof Date) {
          dt = payload.data_hora;
        } else if (payload.data_hora) {
          const s = String(payload.data_hora).trim();
          const m = s.match(/(\d{4})-(\d{2})-(\d{2}).*?(\d{2}):(\d{2})(?::(\d{2}))?/);
          if (m) {
            const y = parseInt(m[1], 10);
            const mo = parseInt(m[2], 10) - 1;
            const d = parseInt(m[3], 10);
            const hh = parseInt(m[4], 10);
            const mm = parseInt(m[5], 10);
            const ss = m[6] ? parseInt(m[6], 10) : 0;
            dt = new Date(y, mo, d, hh, mm, ss);
          } else {
            const parsed = new Date(s);
            if (!isNaN(parsed)) dt = parsed;
          }
        }
      } catch (e) {
        dt = null;
      }
      req.input('data_hora', sql.DateTime2, dt || null);
      req.input('assunto', sql.VarChar(1000), payload.assunto || null);

      req.input('nome', sql.VarChar(250), payload.nome || payload.nome_solicitante || null);
      req.input('telefone', sql.VarChar(50), payload.telefone || null);
      req.input('cpf_cnpj', sql.VarChar(50), payload.cpf_cnpj || null);
      req.input('responsavel', sql.VarChar(250), payload.responsavel || payload.responsavel_name || null);
      req.input('observacoes', sql.VarChar(2000), payload.observacoes || null);
      req.input('status', sql.VarChar(50), 'Pendente');
      req.input('criado_por', sql.VarChar(250), payload.criado_por || payload.createdBy || null);
      let insertSql;
      try {
        const colRes = await pool.request().query("SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='dbo' AND TABLE_NAME='AGENDAMENTO_PORTAL' AND COLUMN_NAME='nome_solicitante'");
        if (colRes && colRes.recordset && colRes.recordset.length) {
          insertSql = `INSERT INTO [dw].[dbo].[AGENDAMENTO_PORTAL] (tipo, data_hora, assunto, nome, nome_solicitante, telefone, cpf_cnpj, responsavel, observacoes, status, criado_por, dt_criacao) VALUES (@tipo, @data_hora, @assunto, @nome, @nome, @telefone, @cpf_cnpj, @responsavel, @observacoes, @status, @criado_por, GETDATE())`;
        } else {
          insertSql = `INSERT INTO [dw].[dbo].[AGENDAMENTO_PORTAL] (tipo, data_hora, assunto, nome, telefone, cpf_cnpj, responsavel, observacoes, status, criado_por, dt_criacao) VALUES (@tipo, @data_hora, @assunto, @nome, @telefone, @cpf_cnpj, @responsavel, @observacoes, @status, @criado_por, GETDATE())`;
        }
      } catch (e) {
        insertSql = `INSERT INTO [dw].[dbo].[AGENDAMENTO_PORTAL] (tipo, data_hora, assunto, nome, telefone, cpf_cnpj, responsavel, observacoes, status, criado_por, dt_criacao) VALUES (@tipo, @data_hora, @assunto, @nome, @telefone, @cpf_cnpj, @responsavel, @observacoes, @status, @criado_por, GETDATE())`;
      }

      await req.query(insertSql);
    } finally {
      try { await pool.close(); } catch(_){}
    }
  } catch (err) {
    console.error('agendamentoModel.insert error:', err && err.message ? err.message : err);
    throw err;
  }
}

async function updateStatus(id, status, marcadoPor, telefone, cpf_cnpj, dt_cheg) {
  try {
    const pool = await new sql.ConnectionPool(dbDw).connect();
    try {
      const req = pool.request();
      req.input('id', sql.Int, parseInt(id, 10));
      req.input('status', sql.VarChar(50), status);
      let hasConcluidoPor = false;
      try {
        const colRes2 = await pool.request().query("SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='dbo' AND TABLE_NAME='AGENDAMENTO_PORTAL' AND COLUMN_NAME='concluido_por'");
        if (colRes2 && colRes2.recordset && colRes2.recordset.length) hasConcluidoPor = true;
      } catch (e) {
        hasConcluidoPor = false;
      }
      const setParts = ['status = @status'];
      if (hasConcluidoPor && typeof marcadoPor !== 'undefined' && marcadoPor !== null) {
        req.input('concluido_por', sql.VarChar(250), String(marcadoPor));
        setParts.push('concluido_por = @concluido_por');
      }
      if (typeof telefone !== 'undefined' && telefone !== null) {
        req.input('telefone', sql.VarChar(50), String(telefone) || null);
        setParts.push('telefone = @telefone');
      }
      if (typeof cpf_cnpj !== 'undefined' && cpf_cnpj !== null) {
        req.input('cpf_cnpj', sql.VarChar(50), String(cpf_cnpj) || null);
        setParts.push('cpf_cnpj = @cpf_cnpj');
      }
      // Check if column 'dt_cheg' exists and include it if provided
      let hasDtCheg = false;
      try {
        const colResDt = await pool.request().query("SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='dbo' AND TABLE_NAME='AGENDAMENTO_PORTAL' AND COLUMN_NAME='dt_cheg'");
        if (colResDt && colResDt.recordset && colResDt.recordset.length) hasDtCheg = true;
      } catch (e) { hasDtCheg = false; }
      if (hasDtCheg && typeof dt_cheg !== 'undefined' && dt_cheg !== null) {
        req.input('dt_cheg', sql.DateTime2, dt_cheg);
        setParts.push('dt_cheg = @dt_cheg');
      }

      const q = `UPDATE [dw].[dbo].[AGENDAMENTO_PORTAL] SET ${setParts.join(', ')} WHERE id = @id`;
      await req.query(q);
    } finally {
      try { await pool.close(); } catch(_){ }
    }
  } catch (err) {
    console.error('agendamentoModel.updateStatus error:', err && err.message ? err.message : err);
    throw err;
  }
}

module.exports = {
  getAll,
  getToday,
  insert,
  updateStatus
};
