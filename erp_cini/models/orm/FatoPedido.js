'use strict';

const { DataTypes } = require('sequelize');
const { sequelizeDw } = require('../../config/sequelize');
const FatoPedido = sequelizeDw.define('FatoPedido', {
  NUMERO:       { type: DataTypes.STRING, primaryKey: true },
  CODFIL:       { type: DataTypes.STRING },
  DT_EMISSAO:   { type: DataTypes.DATE },
  CLIENTE:      { type: DataTypes.STRING },
  LOJA:         { type: DataTypes.STRING },
  MENNOTA:      { type: DataTypes.STRING },
  COD_VENDEDOR: { type: DataTypes.STRING },
  NUM_AFV:      { type: DataTypes.STRING },
  CONDPAG:      { type: DataTypes.STRING },
  CODTAB:       { type: DataTypes.STRING },
  CODTRANSP:    { type: DataTypes.STRING },
  TPFRETE:      { type: DataTypes.STRING },
  PERC_DESC:    { type: DataTypes.DECIMAL },
  SERIE:        { type: DataTypes.STRING },
  DT_INCLUSAO:  { type: DataTypes.DATE },
  DT_ALTERACAO: { type: DataTypes.DATE },
  CODVEND1:     { type: DataTypes.STRING },
  FRMPAG:       { type: DataTypes.STRING },
  CODTELE:      { type: DataTypes.STRING },
  VOLUME1:      { type: DataTypes.DECIMAL },
}, {
  tableName:  'FATO_PEDIDOS',
  schema:     'dbo',
  timestamps: false,
});

module.exports = FatoPedido;
