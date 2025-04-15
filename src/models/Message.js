const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Message = sequelize.define('message', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true
  },
  senderId: {
    type: DataTypes.INTEGER
  },
  receiverId: {
    type: DataTypes.INTEGER
  },
  content: {
    type: DataTypes.TEXT
  },
  isEncrypted: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  status: {
    type: DataTypes.ENUM('sent', 'delivered', 'read')
  }
}, {
  timestamps: true, // enables createdAt and updatedAt
  paranoid: true // enables soft deletion
});

module.exports = {
  Message
};