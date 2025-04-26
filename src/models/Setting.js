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
    },
    isForUser: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    timestamps: true
});

module.exports = {
    Setting
};