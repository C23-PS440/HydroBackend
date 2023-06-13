const Sequelize = require('sequelize');

// Connection to local database
const db = new Sequelize({
  dialect: 'mysql',
  host: '34.101.210.160',
  port: parseInt(process.env.DB_PORT || 3306),
  database: 'capstone-database',
  username: 'root',
  password: ',8<bUPJ@7$65nOTR',
});

module.exports = db;
