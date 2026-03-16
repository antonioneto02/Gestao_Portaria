'use strict';

const { DataTypes } = require('sequelize');
const { sequelizeDw } = require('../../config/sequelize');
const DimCliente = sequelizeDw.define('DimCliente', {
  CHAVE_CLIENTE: { type: DataTypes.STRING, primaryKey: true },
  COD_CLIENTE:   { type: DataTypes.STRING },
  NOME:          { type: DataTypes.STRING },
  FANTASIA:      { type: DataTypes.STRING },
}, {
  tableName:  'DIM_CLIENTES',
  schema:     'dbo',
  timestamps: false,
});

module.exports = DimCliente;
