'use strict';

const { DataTypes } = require('sequelize');
const { sequelizeDw } = require('../../config/sequelize');
const DimMotorista = sequelizeDw.define('DimMotorista', {
  COD_MOTORISTA: { type: DataTypes.STRING, primaryKey: true },
  NOME:          { type: DataTypes.STRING },
  CPF_CNPJ:      { type: DataTypes.STRING },
  WHATSAPP:      { type: DataTypes.STRING },
}, {
  tableName:  'DIM_MOTORISTAS',
  schema:     'dbo',
  timestamps: false,
});

module.exports = DimMotorista;
