'use strict';

require('dotenv').config();
const { Sequelize } = require('sequelize');

const DIALETO = (process.env.DB_DIALECT || 'mssql').toLowerCase();
if (!['mssql', 'postgres'].includes(DIALETO)) throw new Error(`DB_DIALECT não suportado: ${DIALETO} (use mssql ou postgres).`);

function conexaoSqlServer(database, extra = {}) {
  return new Sequelize(
    database,
    process.env.DB_USER_ERP,
    process.env.DB_PASSWORD_ERP,
    {
      host: process.env.DB_SERVER_ERP,
      dialect: 'mssql',
      logging: false,
      dialectOptions: { options: { encrypt: true, trustServerCertificate: true, ...extra.options } },
    }
  );
}

function conexaoGestao() {
  if (DIALETO === 'postgres') {
    const pg = Sequelize.DataTypes.postgres;
    pg.DECIMAL.parse = v => Number(v);
    pg.BIGINT.parse = v => Number(v);
    pg.DATEONLY.parse = v => v;
    return new Sequelize(
      process.env.DB_DATABASE_GESTAO || 'gestao_portaria',
      process.env.DB_USER_GESTAO,
      process.env.DB_PASSWORD_GESTAO,
      {
        host: process.env.DB_SERVER_GESTAO,
        port: process.env.DB_PORT_GESTAO ? Number(process.env.DB_PORT_GESTAO) : undefined,
        dialect: 'postgres',
        timezone: 'America/Sao_Paulo',
        logging: false,
        dialectOptions: process.env.DB_SSL_GESTAO === '1' ? { ssl: { rejectUnauthorized: false } } : {},
      }
    );
  }
  return new Sequelize(
    process.env.DB_DATABASE_GESTAO || 'gestao_portaria',
    process.env.DB_USER_GESTAO || process.env.DB_USER_ERP,
    process.env.DB_PASSWORD_GESTAO || process.env.DB_PASSWORD_ERP,
    {
      host: process.env.DB_SERVER_GESTAO || process.env.DB_SERVER_ERP,
      port: process.env.DB_PORT_GESTAO ? Number(process.env.DB_PORT_GESTAO) : undefined,
      dialect: 'mssql',
      logging: false,
      dialectOptions: { options: { encrypt: true, trustServerCertificate: true } },
    }
  );
}

const sequelizeGestao = conexaoGestao();

const sequelizeDw = conexaoSqlServer(process.env.DB_DATABASE_DW || 'dw', { options: { useUTC: false } });

const sequelizeProtheus = conexaoSqlServer(process.env.DB_DATABASE_PROTHEUS || 'p11_prod');

const esquemaGestao = DIALETO === 'mssql' ? 'dbo' : undefined;

function ordemSqlServer(coluna, direcao) {
  if (DIALETO !== 'postgres') return [coluna, direcao];
  return [coluna, direcao === 'DESC' ? 'DESC NULLS LAST' : 'ASC NULLS FIRST'];
}

module.exports = { sequelizeGestao, sequelizeDw, sequelizeProtheus, esquemaGestao, ordemSqlServer };
