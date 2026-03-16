'use strict';

require('dotenv').config();
const { Sequelize } = require('sequelize');
const dialect = process.env.DB_DIALECT || 'mssql';
const dialectOptions =
  dialect === 'mssql'
    ? { options: { encrypt: true, trustServerCertificate: true } }
    : {};

function makeSequelize(database, extra = {}) {
  return new Sequelize(
    database,
    process.env.DB_USER_ERP,
    process.env.DB_PASSWORD_ERP,
    {
      host:           process.env.DB_SERVER_ERP,
      dialect,
      logging:        false,
      dialectOptions: { ...dialectOptions, ...extra.dialectOptions },
      ...extra,
    }
  );
}

const sequelizeGestao = makeSequelize(
  process.env.DB_DATABASE_GESTAO || 'gestao_portaria'
);

const sequelizeDw = makeSequelize(
  process.env.DB_DATABASE_DW || 'dw',
  { dialectOptions: { options: { encrypt: true, trustServerCertificate: true, useUTC: false } } }
);

const sequelizeProtheus = makeSequelize(
  process.env.DB_DATABASE_PROTHEUS || 'p11_prod'
);

module.exports = { sequelizeGestao, sequelizeDw, sequelizeProtheus };
