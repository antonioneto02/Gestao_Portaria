const sql = require('mssql');
const dbDw = require('../config/dbConfigDw');

async function getTopPeople(limit = 1000) {
  try {
    const pool = await new sql.ConnectionPool(dbDw).connect();
    try {
      const q = `SELECT TOP (${limit}) [Filial], [Codigo], [Nome], [Telefone], [Email], [Rg], [CNPJ], [Sexo], [DataNascimento] FROM [dw].[dbo].[V_PESSOAS] ORDER BY Nome`;
      const r = await pool.request().query(q);
      return (r && r.recordset) ? r.recordset.map(row => ({ filial: row.Filial, codigo: row.Codigo, nome: row.Nome, telefone: row.Telefone, email: row.Email, rg: row.Rg, cnpj: row.CNPJ, sexo: row.Sexo, dataNascimento: row.DataNascimento })) : [];
    } finally {
      try { await pool.close(); } catch(_){}
    }
  } catch (e) {
    console.error('Erro conferenciaModel.getTopPeople:', e && e.message ? e.message : e);
    return [];
  }
}

async function searchPeopleByName(name, limit = 5000) {
  try {
    const pool = await new sql.ConnectionPool(dbDw).connect();
    try {
      const req = pool.request();
      req.input('q', sql.NVarChar, `%${name}%`);
      const q = `SELECT TOP (${limit}) [Filial], [Codigo], [Nome], [Telefone], [Email], [Rg], [CNPJ], [Sexo], [DataNascimento] FROM [dw].[dbo].[V_PESSOAS] WHERE Nome LIKE @q COLLATE Latin1_General_CI_AI ORDER BY Nome`;
      const r = await req.query(q);
      return (r && r.recordset) ? r.recordset.map(row => ({ filial: row.Filial, codigo: row.Codigo, nome: row.Nome, telefone: row.Telefone, email: row.Email, rg: row.Rg, cnpj: row.CNPJ, sexo: row.Sexo, dataNascimento: row.DataNascimento })) : [];
    } finally {
      try { await pool.close(); } catch(_){}
    }
  } catch (e) {
    console.error('Erro conferenciaModel.searchPeopleByName:', e && e.message ? e.message : e);
    return [];
  }
}

module.exports = { getTopPeople, searchPeopleByName };
