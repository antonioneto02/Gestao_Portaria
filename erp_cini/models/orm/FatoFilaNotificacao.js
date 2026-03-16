'use strict';

const { DataTypes } = require('sequelize');
const { sequelizeDw } = require('../../config/sequelize');
const FatoFilaNotificacao = sequelizeDw.define('FatoFilaNotificacao', {
  ID:              { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  TIPO_MENSAGEM:   { type: DataTypes.STRING(100) },
  DESTINATARIO:    { type: DataTypes.STRING(500) },
  MENSAGEM:        { type: DataTypes.TEXT },
  TEMPLATE_NAME:   { type: DataTypes.STRING(200) },
  TEMPLATE_PARAMS: { type: DataTypes.TEXT },
  STATUS:          { type: DataTypes.STRING(50) },
  TENTATIVAS:      { type: DataTypes.INTEGER, defaultValue: 0 },
  ERRO:            { type: DataTypes.STRING(1000) },
  DTINC:           { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  DTENVIO:         { type: DataTypes.DATE },
  MESSAGE_ID:      { type: DataTypes.STRING(200) },
  METADADOS:       { type: DataTypes.TEXT },
}, {
  tableName:  'FATO_FILA_NOTIFICACOES',
  schema:     'dbo',
  timestamps: false,
});

module.exports = FatoFilaNotificacao;
