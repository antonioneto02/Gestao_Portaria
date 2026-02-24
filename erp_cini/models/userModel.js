const sql = require('mssql');
const dbProtheus = require('../config/dbConfigProtheus');

async function getAll() {
  try {
    const pool = await new sql.ConnectionPool(dbProtheus).connect();
    try {
      const q = `SELECT RA_FILIAL, RA_MAT, RA_NOME, RA_DDDCELU, RA_NUMCELU, RA_TELEFON FROM SRA010 WHERE ISNULL(D_E_L_E_T_,'') <> '*'`;
      const r = await pool.request().query(q);
      const rs = r.recordset || [];
      return rs.map(u => ({
        RA_FILIAL: (u.RA_FILIAL || '').toString().trim(),
        RA_MAT: (u.RA_MAT || '').toString().trim(),
        RA_NOME: (u.RA_NOME || '').toString().trim(),
        RA_DDDCELU: (u.RA_DDDCELU || '').toString().trim(),
        RA_NUMCELU: (u.RA_NUMCELU || '').toString().trim(),
        RA_TELEFON: (u.RA_TELEFON || '').toString().trim()
      }));
    } finally {
      try { await pool.close(); } catch(_){}
    }
  } catch (err) {
    console.error('userModel.getAll error:', err && err.message ? err.message : err);
    throw err;
  }
}

module.exports = { getAll };
