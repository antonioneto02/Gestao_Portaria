'use strict';

const { Op } = require('sequelize');
const Funcionario = require('./orm/Funcionario');

function mapFuncionario(row) {
  const r = row.get ? row.get({ plain: true }) : row;
  return {
    RA_FILIAL:  (r.RA_FILIAL  || '').toString().trim(),
    RA_MAT:     (r.RA_MAT     || '').toString().trim(),
    RA_NOME:    (r.RA_NOME    || '').toString().trim(),
    RA_DDDCELU: (r.RA_DDDCELU || '').toString().trim(),
    RA_NUMCELU: (r.RA_NUMCELU || '').toString().trim(),
    RA_TELEFON: (r.RA_TELEFON || '').toString().trim(),
  };
}
async function getAll() {
  try {
    const rows = await Funcionario.findAll({
      where: {
        [Op.or]: [
          { D_E_L_E_T_: { [Op.ne]: '*' } },
          { D_E_L_E_T_: null },
        ],
      },
      attributes: ['RA_FILIAL', 'RA_MAT', 'RA_NOME', 'RA_DDDCELU', 'RA_NUMCELU', 'RA_TELEFON'],
    });
    return rows.map(mapFuncionario);
  } catch (err) {
    console.error('userModel.getAll error:', err.message);
    throw err;
  }
}

async function getByMat(mat) {
  try {
    const matTrimmed = String(mat || '').trim();
    const matPadded  = matTrimmed.padStart(6, '0');
    const row = await Funcionario.findOne({
      where: {
        [Op.or]: [
          { RA_MAT: matTrimmed },
          { RA_MAT: matPadded },
        ],
      },
      attributes: ['RA_FILIAL', 'RA_MAT', 'RA_NOME', 'RA_DDDCELU', 'RA_NUMCELU', 'RA_TELEFON'],
    });
    return row ? mapFuncionario(row) : null;
  } catch (err) {
    console.error('userModel.getByMat error:', err.message);
    return null;
  }
}

async function findByNameTokens(nameTokens) {
  try {
    const conditions = nameTokens.map(t => ({ RA_NOME: { [Op.like]: `%${t}%` } }));
    const row = await Funcionario.findOne({
      where: { [Op.and]: conditions },
      attributes: ['RA_FILIAL', 'RA_MAT', 'RA_NOME', 'RA_DDDCELU', 'RA_NUMCELU', 'RA_TELEFON'],
    });
    return row ? mapFuncionario(row) : null;
  } catch (err) {
    console.error('userModel.findByNameTokens error:', err.message);
    return null;
  }
}

function resolvePhone(user) {
  if (!user) return null;
  const ddd = (user.RA_DDDCELU || '').toString().trim();
  const num = (user.RA_NUMCELU || '').toString().trim() || (user.RA_TELEFON || '').toString().trim();
  if (ddd && num) return (ddd + num).replace(/\D+/g, '');
  if (num)        return num.replace(/\D+/g, '');
  return null;
}

async function resolvePhoneByName(name) {
  try {
    if (!name) return null;
    const justDigits = String(name).replace(/\D+/g, '');
    if (justDigits.length >= 8 && justDigits.length <= 13) return justDigits;

    const rawName = String(name).replace(/[._\-@]/g, ' ').trim();
    if (!rawName) return null;
    const tokens = rawName.split(/\s+/).map(t => t.trim()).filter(t => t && t.length >= 2);
    if (!tokens.length) return null;

    const user = await findByNameTokens(tokens);
    return resolvePhone(user);
  } catch (e) {
    console.error('userModel.resolvePhoneByName error:', e.message);
    return null;
  }
}

module.exports = { getAll, getByMat, findByNameTokens, resolvePhone, resolvePhoneByName };
