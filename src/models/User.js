const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const User = sequelize.define('users', {
    id: {
        type: DataTypes.BIGINT,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING
    },
    slug: {
        type: DataTypes.STRING
    },
    email: {
        type: DataTypes.STRING
    },
    emailToken: {
        type: DataTypes.STRING
    },
    emailTokenExpiry: {
        type: DataTypes.DATE
    },
    emailVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    countryCode: {
        type: DataTypes.STRING
    },
    mobile: {
        type: DataTypes.STRING
    },
    peerId: {
        type: DataTypes.STRING
    },
    otp: {
        type: DataTypes.STRING
    },
    otpExpiry: {
        type: DataTypes.DATE
    },
    password: {
        type: DataTypes.STRING
    },
    passwordResetToken: {
        type: DataTypes.STRING
    },
    passwordResetTokenExpiry: {
        type: DataTypes.DATE
    },
    authToken: {
        type: DataTypes.STRING
    },
    role: {
        type: DataTypes.ENUM('admin', 'user'),
        defaultValue: 'user',
        allowNull: false,
    },
    isAI: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
    },
    isOnline: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    lastSeen: {
        type: DataTypes.DATE
    },
    avatar: {
        type: DataTypes.STRING
    },
    cover: {
        type: DataTypes.STRING
    },
    bio: {
        type: DataTypes.TEXT
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'delete'),
        defaultValue: 'active',
        allowNull: false,
    },
}, {
    timestamps: true, // enables createdAt and updatedAt
    paranoid: true // enables soft deletion
});

module.exports = {
    User
};