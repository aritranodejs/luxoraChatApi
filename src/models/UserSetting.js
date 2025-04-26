const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const UserSetting = sequelize.define('users_settings', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true
    },
    userId: {
        type: DataTypes.BIGINT
    },
    settingId: {
        type: DataTypes.BIGINT
    },
    value: {
        type: DataTypes.STRING,
        allowNull: true // Allow null so we can fall back to global setting
    }
}, {
    timestamps: true
});

module.exports = {
    UserSetting
};