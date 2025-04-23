'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Rename the column from authToken to accessToken
    await queryInterface.renameColumn('users', 'authToken', 'accessToken');
  },

  async down(queryInterface, Sequelize) {
    // Revert the change by renaming the column back to authToken
    await queryInterface.renameColumn('users', 'accessToken', 'authToken');
  }
};