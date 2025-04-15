const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const EncryptionKey = sequelize.define('encryption_keys', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    }
  },
  friendId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    }
  },
  encryptedKey: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  timestamps: true,
  paranoid: true
});

module.exports = {
  EncryptionKey
}; 