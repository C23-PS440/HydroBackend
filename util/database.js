const Sequelize = require('sequelize');

// Connection to local database
const db = new Sequelize({
  dialect: 'mysql',
  host: 'localhost',
  port: parseInt(process.env.DB_PORT || 3306),
  database: 'capstone-database',
  username: 'root',
  password: '',
});

module.exports = db;
