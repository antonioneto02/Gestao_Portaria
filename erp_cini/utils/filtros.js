'use strict';

const { Op, fn, col, where } = require('sequelize');

const contem = (coluna, termo) => where(fn('LOWER', col(coluna)), { [Op.like]: `%${String(termo).toLowerCase()}%` });

module.exports = { contem };
