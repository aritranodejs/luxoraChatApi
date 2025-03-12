'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn("users", "peerId", {
      type: Sequelize.STRING,
      allowNull: true,
      after: "mobile",
    });
  },
  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn("users", "peerId");
  }
};
