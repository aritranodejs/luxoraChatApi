'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT
      },
      name: {
        type: Sequelize.STRING
      },
      slug: {
        type: Sequelize.STRING,
        unique: true
      },
      email: {
        type: Sequelize.STRING,
        unique: true
      },
      emailToken: {
        type: Sequelize.STRING
      },
      emailTokenExpiry: {
        type: Sequelize.DATE
      },
      emailVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      countryCode: {
        type: Sequelize.STRING
      },
      mobile: {
        type: Sequelize.STRING
      },
      otp: {
        type: Sequelize.STRING
      },
      otpExpiry: {
        type: Sequelize.DATE
      },
      password: {
        type: Sequelize.STRING
      },
      passwordResetToken: {
        type: Sequelize.STRING
      },
      passwordResetTokenExpiry: {
        type: Sequelize.DATE
      },
      authToken : {
        type: Sequelize.STRING
      },
      role: {
        type: Sequelize.ENUM('admin', 'user'),
        defaultValue: 'user',
        allowNull: false,
      },
      isOnline: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      lastSeen: {
        type: Sequelize.DATE
      },
      avatar: {
        type: Sequelize.STRING
      },
      cover: {
        type: Sequelize.STRING
      },
      bio: {
        type: Sequelize.TEXT
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'delete'),
        defaultValue: 'active',
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      deletedAt: {
        type: Sequelize.DATE
      }
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('users');
  }
};