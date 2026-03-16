'use strict';

const { Op } = require('sequelize');
const Pessoa = require('./orm/Pessoa');

function mapPessoa(row) {
  const r = row.get ? row.get({ plain: true }) : row;
  return {
    filial:         r.Filial,
    codigo:         r.Codigo,
    nome:           r.Nome,
    telefone:       r.Telefone,
    email:          r.Email,
    rg:             r.Rg,
    cnpj:           r.CNPJ,
    sexo:           r.Sexo,
    dataNascimento: r.DataNascimento,
  };
}

async function getTopPeople(limit = 1000) {
  try {
    const rows = await Pessoa.findAll({ order: [['Nome', 'ASC']], limit });
    return rows.map(mapPessoa);
  } catch (e) {
    console.error('conferenciaModel.getTopPeople:', e.message);
    return [];
  }
}

async function searchPeopleByName(name, limit = 5000) {
  try {
    const rows = await Pessoa.findAll({
      where: { Nome: { [Op.like]: `%${name}%` } },
      order: [['Nome', 'ASC']],
      limit,
    });
    return rows.map(mapPessoa);
  } catch (e) {
    console.error('conferenciaModel.searchPeopleByName:', e.message);
    return [];
  }
}

module.exports = { getTopPeople, searchPeopleByName };
