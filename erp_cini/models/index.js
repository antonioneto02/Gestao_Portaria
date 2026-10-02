'use strict';

const { sequelizeGestao: sequelize } = require('../config/sequelize');
const Agendamento = require('./orm/Agendamento');
const Visitante = require('./orm/Visitante');
const HorarioAgendamento = require('./orm/HorarioAgendamento');
const CargaPortaria = require('./orm/CargaPortaria');

const ORDEM = ['Agendamento', 'Visitante', 'HorarioAgendamento', 'CargaPortaria'];

module.exports = { sequelize, Agendamento, Visitante, HorarioAgendamento, CargaPortaria, ORDEM };
