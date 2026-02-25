const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database');

class Gasto extends Model {}

Gasto.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    descricao: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    valor: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    categoria: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    data: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    tipo: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: 'gasto',
    },
    forma_pagamento: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
    },
}, {
    sequelize,
    modelName: 'Gasto',
    tableName: 'gastos',
    timestamps: false,
});

module.exports = Gasto;

