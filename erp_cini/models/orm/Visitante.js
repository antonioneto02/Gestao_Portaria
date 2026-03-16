'use strict';

const { DataTypes } = require('sequelize');
const { sequelizeGestao } = require('../../config/sequelize');
const Visitante = sequelizeGestao.define('Visitante', {
  id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nome:           { type: DataTypes.STRING(500) },
  telefone:       { type: DataTypes.STRING(50) },
  cpf_cnpj:       { type: DataTypes.STRING(50) },
  agendamento_id: { type: DataTypes.INTEGER },
  dt_inclusao:    { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName:  'VISITANTES',
  schema:     'dbo',
  timestamps: false,
});

module.exports = Visitante;
