const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database');

class Limite extends Model {}

Limite.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    valor: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    periodo: {
        type: DataTypes.STRING(20),
        allowNull: false,
    },
    mes: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    ano: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW,
    },
}, {
    sequelize,
    modelName: 'Limite',
    tableName: 'limites',
    timestamps: false,
});

module.exports = Limite;

