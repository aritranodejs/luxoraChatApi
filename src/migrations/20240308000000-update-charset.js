'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Update database character set
        await queryInterface.sequelize.query('ALTER DATABASE ' + process.env.DB_DATABASE + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
        
        // Update all tables
        const tables = await queryInterface.sequelize.query('SHOW TABLES;');
        for (const table of tables[0]) {
            const tableName = table[Object.keys(table)[0]];
            await queryInterface.sequelize.query(`ALTER TABLE ${tableName} CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        }
    },

    down: async (queryInterface, Sequelize) => {
        // Revert database character set
        await queryInterface.sequelize.query('ALTER DATABASE ' + process.env.DB_DATABASE + ' CHARACTER SET utf8 COLLATE utf8_general_ci;');
        
        // Revert all tables
        const tables = await queryInterface.sequelize.query('SHOW TABLES;');
        for (const table of tables[0]) {
            const tableName = table[Object.keys(table)[0]];
            await queryInterface.sequelize.query(`ALTER TABLE ${tableName} CONVERT TO CHARACTER SET utf8 COLLATE utf8_general_ci;`);
        }
    }
}; 