const { Model, DataTypes } = require('sequelize');
const sequelize = require('../database');

class Investimento extends Model {}

Investimento.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    valor: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    descricao: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    data: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    sequelize,
    modelName: 'Investimento',
    tableName: 'investimentos',
    timestamps: false,
});

module.exports = Investimento;

