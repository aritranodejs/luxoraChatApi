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
    }
}, {
    timestamps: true
});

module.exports = {
    UserSetting
};