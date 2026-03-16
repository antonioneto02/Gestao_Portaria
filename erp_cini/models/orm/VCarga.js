'use strict';

const { DataTypes } = require('sequelize');
const { sequelizeDw } = require('../../config/sequelize');
const VCarga = sequelizeDw.define('VCarga', {
  FILIAL:       { type: DataTypes.STRING },
  CARGA:        { type: DataTypes.STRING, primaryKey: true },
  DT_ENTREG:    { type: DataTypes.STRING },
  PLACA:        { type: DataTypes.STRING },
  TIPO_ENTREGA: { type: DataTypes.STRING },
  MOTORISTA:    { type: DataTypes.STRING },
  PESO:         { type: DataTypes.DECIMAL },
}, {
  tableName:  'V_CARGAS',
  schema:     'dbo',
  timestamps: false,
});

module.exports = VCarga;
