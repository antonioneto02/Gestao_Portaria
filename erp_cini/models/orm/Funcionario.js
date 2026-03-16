'use strict';

const { DataTypes } = require('sequelize');
const { sequelizeProtheus } = require('../../config/sequelize');
const Funcionario = sequelizeProtheus.define('Funcionario', {
  RA_FILIAL:   { type: DataTypes.STRING(8) },
  RA_MAT:      { type: DataTypes.STRING(6), primaryKey: true },
  RA_NOME:     { type: DataTypes.STRING(40) },
  RA_DDDCELU:  { type: DataTypes.STRING(4) },
  RA_NUMCELU:  { type: DataTypes.STRING(15) },
  RA_TELEFON:  { type: DataTypes.STRING(15) },
  D_E_L_E_T_:  { type: DataTypes.STRING(1) },
}, {
  tableName:  'SRA010',
  timestamps: false,
});

module.exports = Funcionario;
