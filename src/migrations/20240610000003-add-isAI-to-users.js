'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'isAI', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: 'role'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'isAI');
  }
}; 