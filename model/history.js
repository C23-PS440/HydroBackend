const Sequelize = require('sequelize');
const sequelize = require('../util/database');
const User = require('./user.js');

// Table History
const History = sequelize.define(
  'history',
  {
    historyId: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    plantImage: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    plantName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    diseaseName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    diseaseRecognition: {
      type: Sequelize.TEXT('long'),
      allowNull: true,
    },
    diseaseCause: {
      type: Sequelize.TEXT('long'),
      allowNull: true,
    },
    solution: {
      type: Sequelize.TEXT('long'),
      allowNull: true,
    },
    dateAndTime: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    userId: {
      type: Sequelize.STRING,
      allowNull: false,
      foreignKey: {
        model: User,
        column: 'id',
      },
    },
  },
  { timestamps: false }
);

module.exports = History;
