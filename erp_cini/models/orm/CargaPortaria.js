'use strict';

const { DataTypes } = require('sequelize');
const { sequelizeGestao } = require('../../config/sequelize');
const CargaPortaria = sequelizeGestao.define('CargaPortaria', {
  id:           { type: DataTypes.INTEGER,       primaryKey: true, autoIncrement: true },
  filial:       { type: DataTypes.STRING(50) },
  carga:        { type: DataTypes.STRING(200) },
  dt_entrega:   { type: DataTypes.DATE },
  placa:        { type: DataTypes.STRING(50) },
  tipo_entrega: { type: DataTypes.STRING(200) },
  motorista:    { type: DataTypes.STRING(200) },
  peso:         { type: DataTypes.DECIMAL(18, 3) },
  status:       { type: DataTypes.STRING(50) },
  telefone:     { type: DataTypes.STRING(50) },
  cpf_cnpj:     { type: DataTypes.STRING(50) },
  criado_por:   { type: DataTypes.STRING(200) },
  dt_criacao:   { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName:  'CARGAS_PORTARIA',
  schema:     'dbo',
  timestamps: false,
});

module.exports = CargaPortaria;
