'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('settings', 'isForUser', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: 'value'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('settings', 'isForUser');
  }
}; 