'use strict';

const { DataTypes } = require('sequelize');
const { sequelizeGestao } = require('../../config/sequelize');
const HorarioAgendamento = sequelizeGestao.define('HorarioAgendamento', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  pedido:       { type: DataTypes.STRING(100) },
  data:         { type: DataTypes.DATE },
  criado_por:   { type: DataTypes.STRING(200) },
  nome_cli:     { type: DataTypes.STRING(500) },
  cod_cli:      { type: DataTypes.STRING(100) },
  categoria:    { type: DataTypes.STRING(50) },
  observacao:   { type: DataTypes.STRING(1000) },
  status:       { type: DataTypes.STRING(50) },
  data_entrada: { type: DataTypes.DATE },
  data_saida:   { type: DataTypes.DATE },
  dt_criacao:   { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName:  'HORARIOS_AGENDAMENTO',
  schema:     'dbo',
  timestamps: false,
});

module.exports = HorarioAgendamento;
