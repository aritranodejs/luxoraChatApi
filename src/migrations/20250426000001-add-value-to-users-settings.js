'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('users_settings', 'value', {
      type: Sequelize.STRING,
      allowNull: true, // Allow null so that if not set, we can fall back to global setting
      after: 'settingId'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('users_settings', 'value');
  }
}; 