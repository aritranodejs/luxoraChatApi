const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

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