'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('messages', 'isEncrypted', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      after: 'content'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('messages', 'isEncrypted');
  }
}; 