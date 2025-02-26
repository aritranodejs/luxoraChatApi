const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Friend = sequelize.define('friends', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  senderId: {
    type: DataTypes.INTEGER
  },
  receiverId: {
    type: DataTypes.INTEGER
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'rejected')
  }
}, {
  timestamps: true, // enables createdAt and updatedAt
});

module.exports = {
  Friend
};