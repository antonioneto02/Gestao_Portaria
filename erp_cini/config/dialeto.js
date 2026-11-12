'use strict';

const { Op } = require('sequelize');
const { sequelizeGestao } = require('./sequelize');

const ehPostgres = () => sequelizeGestao.getDialect() === 'postgres';
const contem = texto => ({ [ehPostgres() ? Op.iLike : Op.like]: `%${texto}%` });

module.exports = { ehPostgres, contem };
