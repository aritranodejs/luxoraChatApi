'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove the accessToken column from the users table
    await queryInterface.removeColumn('users', 'accessToken');
  },

  async down(queryInterface, Sequelize) {
    // Add the column back in case of rollback
    await queryInterface.addColumn('users', 'accessToken', {
      type: Sequelize.STRING,
      allowNull: true
    });
  }
};