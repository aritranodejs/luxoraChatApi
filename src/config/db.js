const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_DATABASE,
    process.env.DB_USERNAME || 'root',
    process.env.DB_PASSWORD || '',
    {
        host: process.env.DB_HOST,
        dialect: process.env.DB_DIALECT || 'mysql',
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,  // Maximum wait time for acquiring a connection
            idle: 10000      // Maximum idle time before connection is released
        }
    }
);
module.exports = {
    sequelize
};