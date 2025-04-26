'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('settings', [
      {
        key: 'site_name',
        value: 'Luxora Chat',
        isForUser: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        key: 'site_logo',
        value: '/assets/images/logo.png',
        isForUser: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        key: 'site_favicon',
        value: '/assets/images/favicon.ico',
        isForUser: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        key: 'site_description',
        value: 'A secure chat application with real-time messaging',
        isForUser: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        key: 'site_keywords',
        value: 'chat, secure, messaging, real-time',
        isForUser: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        key: 'default_theme',
        value: 'light_mode',
        isForUser: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        key: 'maintenance_mode',
        value: 'false',
        isForUser: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        key: 'allow_registration',
        value: 'true',
        isForUser: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('settings', null, {});
  }
}; 