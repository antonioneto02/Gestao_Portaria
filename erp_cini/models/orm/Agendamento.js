'use strict';

const { DataTypes } = require('sequelize');
const { sequelizeGestao } = require('../../config/sequelize');
const Agendamento = sequelizeGestao.define('Agendamento', {
  id:               { type: DataTypes.INTEGER,     primaryKey: true, autoIncrement: true },
  tipo:             { type: DataTypes.STRING(100) },
  data_hora:        { type: DataTypes.DATE },
  assunto:          { type: DataTypes.STRING(1000) },
  nome:             { type: DataTypes.STRING(250) },
  nome_solicitante: { type: DataTypes.STRING(250) },
  telefone:         { type: DataTypes.STRING(50) },
  cpf_cnpj:         { type: DataTypes.STRING(50) },
  responsavel:      { type: DataTypes.STRING(250) },
  observacoes:      { type: DataTypes.STRING(2000) },
  status:           { type: DataTypes.STRING(50) },
  criado_por:       { type: DataTypes.STRING(250) },
  concluido_por:    { type: DataTypes.STRING(250) },
  dt_cheg:          { type: DataTypes.DATE },
  dt_criacao:       { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  enviou:           { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName:  'AGENDAMENTO_PORTAL',
  schema:     'dbo',
  timestamps: false,
});

module.exports = Agendamento;
