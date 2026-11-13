'use strict';

require('dotenv').config();
const { Sequelize } = require('sequelize');
const sequelizePg = require('./sequelizePg');

const DIALETO = (process.env.DB_DIALECT || 'mssql').toLowerCase();
if (!['mssql', 'postgres'].includes(DIALETO)) throw new Error(`DB_DIALECT não suportado: ${DIALETO} (use mssql ou postgres).`);
const OPCOES_MSSQL = { options: { encrypt: true, trustServerCertificate: true } };

if (DIALETO === 'postgres') {
  const pg = Sequelize.DataTypes.postgres;
  pg.DECIMAL.parse = v => Number(v);
  pg.DATEONLY.parse = v => v;
  require('pg').types.setTypeParser(1114, v => new Date(`${v.replace(' ', 'T')}Z`));
}

function makeSequelize(database, extra = {}) {
  return sequelizePg.criar(Sequelize, {
    banco: database,
    usuario: process.env.DB_USER_ERP,
    senha: process.env.DB_PASSWORD_ERP,
    host: process.env.DB_SERVER_ERP,
    opcoes: {
      logging: false,
      dialectOptions: { ...OPCOES_MSSQL, ...extra.dialectOptions },
      ...extra,
    },
  });
}

const sequelizeGestao = makeSequelize(process.env.DB_DATABASE_GESTAO || 'gestao_portaria');
const schemaGestao = DIALETO === 'postgres' ? undefined : 'dbo';

const sequelizeDw = makeSequelize(
  process.env.DB_DATABASE_DW || 'dw',
  { dialectOptions: { options: { encrypt: true, trustServerCertificate: true, useUTC: false } } }
);

const sequelizeProtheus = makeSequelize(
  process.env.DB_DATABASE_PROTHEUS || 'p2510'
);

module.exports = { sequelizeGestao, sequelizeDw, sequelizeProtheus, schemaGestao };
