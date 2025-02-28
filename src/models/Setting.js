const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Setting = sequelize.define('settings', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true
    },
    key: {
        type: DataTypes.STRING
    },
    value: {
        type: DataTypes.STRING
    }
}, {
    timestamps: true
});

module.exports = {
    Setting
};