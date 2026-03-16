'use strict';

const { Op } = require('sequelize');
const CargaPortaria = require('./orm/CargaPortaria');
const DimMotorista  = require('./orm/DimMotorista');
const FILIAL_PADRAO    = '0101-Cini SJP';
const TIPOS_PRINCIPAIS = ['02-Rota', '01-AS'];

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}
function endOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

async function getAll() {
  try {
    return await CargaPortaria.findAll({
      where: {
        filial:       FILIAL_PADRAO,
        tipo_entrega: { [Op.in]: TIPOS_PRINCIPAIS },
      },
      order: [['dt_criacao', 'DESC']],
    });
  } catch (err) {
    console.error('cargaPortariaModel.getAll error:', err.message);
    throw err;
  }
}

async function getByDateRange(startDate, endDate) {
  try {
    return await CargaPortaria.findAll({
      where: {
        dt_criacao:   { [Op.between]: [startOfDay(startDate), endOfDay(endDate)] },
        filial:       FILIAL_PADRAO,
        tipo_entrega: { [Op.in]: TIPOS_PRINCIPAIS },
      },
      order: [['dt_criacao', 'DESC']],
    });
  } catch (err) {
    console.error('cargaPortariaModel.getByDateRange error:', err.message);
    throw err;
  }
}

async function getTodayByDtEntrega() {
  try {
    const hoje = new Date();
    return await CargaPortaria.findAll({
      where: {
        dt_entrega:   { [Op.between]: [startOfDay(hoje), endOfDay(hoje)] },
        filial:       FILIAL_PADRAO,
        tipo_entrega: { [Op.in]: TIPOS_PRINCIPAIS },
      },
    });
  } catch (err) {
    console.error('cargaPortariaModel.getTodayByDtEntrega error:', err && err.message ? err.message : err);
    try {
      const hoje = new Date();
      const rows = await CargaPortaria.findAll({
        where: {
          filial:       FILIAL_PADRAO,
          tipo_entrega: { [Op.in]: TIPOS_PRINCIPAIS },
        },
      });

      const start = startOfDay(hoje);
      const end = endOfDay(hoje);

      return rows.filter(r => {
        try {
          const raw = r.dt_entrega;
          if (!raw) return false;
          const d = new Date(raw);
          if (isNaN(d)) return false;
          return d >= start && d <= end;
        } catch (_) { return false; }
      });
    } catch (err2) {
      console.error('cargaPortariaModel.getTodayByDtEntrega fallback error:', err2 && err2.message ? err2.message : err2);
      throw err;
    }
  }
}

async function search({ placa, carga, filial }) {
  try {
    const conditions = [];
    if (placa)  conditions.push({ placa:  { [Op.like]: `%${placa}%` } });
    if (carga)  conditions.push({ carga:  { [Op.like]: `%${carga}%` } });
    if (filial) conditions.push({ filial: { [Op.like]: `%${filial}%` } });
    if (!conditions.length) return [];

    return await CargaPortaria.findAll({
      where: { [Op.and]: conditions },
      order: [['dt_criacao', 'DESC']],
      limit: 200,
    });
  } catch (err) {
    console.error('cargaPortariaModel.search error:', err.message);
    throw err;
  }
}

async function insert({ filial, carga, dt_entrega, placa, tipo_entrega, motorista, peso, criado_por }) {
  try {
    let cpf_cnpj  = null;
    let telefone  = null;

    if (motorista) {
      try {
        const mot = await DimMotorista.findOne({
          where: {
            [Op.or]: [
              { NOME:          motorista },
              { COD_MOTORISTA: motorista },
              { NOME:          { [Op.like]: `%${motorista}%` } },
            ],
          },
        });
        if (mot) {
          cpf_cnpj = mot.CPF_CNPJ  || null;
          telefone = mot.WHATSAPP  || null;
        }
      } catch (_) {}
    }

    let pesoVal = null;
    try {
      if (peso !== null && peso !== undefined && peso !== '') {
        pesoVal = parseFloat(String(peso).replace(',', '.'));
        if (isNaN(pesoVal)) pesoVal = null;
      }
    } catch (_) {}

    await CargaPortaria.create({
      filial,
      carga,
      dt_entrega:   dt_entrega || null,
      placa,
      tipo_entrega,
      motorista,
      peso:         pesoVal,
      status:       'Concluída',
      telefone:     telefone ? String(telefone).replace(/\D+/g, '') : null,
      cpf_cnpj:     cpf_cnpj  ? String(cpf_cnpj).replace(/\D+/g, '')  : null,
      criado_por,
      dt_criacao:   new Date(),
    });
  } catch (err) {
    console.error('cargaPortariaModel.insert error:', err.message);
    throw err;
  }
}

async function deleteById(id) {
  try {
    await CargaPortaria.destroy({ where: { id: parseInt(id, 10) } });
  } catch (err) {
    console.error('cargaPortariaModel.deleteById error:', err.message);
    throw err;
  }
}

module.exports = { getAll, getByDateRange, getTodayByDtEntrega, search, insert, deleteById };
