'use strict';

require('dotenv').config();
const { Sequelize } = require('sequelize');

const DIALETO = (process.env.DB_DIALECT || 'mssql').toLowerCase();
if (!['mssql', 'postgres'].includes(DIALETO)) throw new Error(`DB_DIALECT não suportado: ${DIALETO} (use mssql ou postgres).`);
const OPCOES_MSSQL = { options: { encrypt: true, trustServerCertificate: true } };

function makeSequelize(database, extra = {}) {
  return new Sequelize(
    database,
    process.env.DB_USER_ERP,
    process.env.DB_PASSWORD_ERP,
    {
      host:           process.env.DB_SERVER_ERP,
      dialect:        'mssql',
      logging:        false,
      dialectOptions: { ...OPCOES_MSSQL, ...extra.dialectOptions },
      ...extra,
    }
  );
}

function makeGestao() {
  if (DIALETO !== 'postgres') return makeSequelize(process.env.DB_DATABASE_GESTAO || 'gestao_portaria');
  const pg = Sequelize.DataTypes.postgres;
  pg.DECIMAL.parse = v => Number(v);
  pg.DATEONLY.parse = v => v;
  require('pg').types.setTypeParser(1114, v => new Date(`${v.replace(' ', 'T')}Z`));
  return new Sequelize(process.env.PG_DATABASE, process.env.PG_USER, process.env.PG_PASSWORD, {
    host: process.env.PG_HOST,
    port: Number(process.env.PG_PORT || 5432),
    dialect: 'postgres',
    logging: false,
    dialectOptions: process.env.PG_SSL === '1' ? { ssl: { rejectUnauthorized: false } } : {},
  });
}

const sequelizeGestao = makeGestao();
const schemaGestao = DIALETO === 'postgres' ? undefined : 'dbo';

const sequelizeDw = makeSequelize(
  process.env.DB_DATABASE_DW || 'dw',
  { dialectOptions: { options: { encrypt: true, trustServerCertificate: true, useUTC: false } } }
);

const sequelizeProtheus = makeSequelize(
  process.env.DB_DATABASE_PROTHEUS || 'p2510'
);

module.exports = { sequelizeGestao, sequelizeDw, sequelizeProtheus, schemaGestao };
