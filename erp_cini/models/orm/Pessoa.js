'use strict';

const { DataTypes } = require('sequelize');
const { sequelizeDw } = require('../../config/sequelize');
const Pessoa = sequelizeDw.define('Pessoa', {
  Filial:         { type: DataTypes.STRING },
  Codigo:         { type: DataTypes.STRING, primaryKey: true },
  Nome:           { type: DataTypes.STRING },
  Telefone:       { type: DataTypes.STRING },
  Email:          { type: DataTypes.STRING },
  Rg:             { type: DataTypes.STRING },
  CNPJ:           { type: DataTypes.STRING },
  Sexo:           { type: DataTypes.STRING },
  DataNascimento: { type: DataTypes.DATEONLY },
}, {
  tableName:  'V_PESSOAS',
  schema:     'dbo',
  timestamps: false,
});

module.exports = Pessoa;
