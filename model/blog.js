const Sequelize = require('sequelize');
const sequelize = require('../util/database.js');
const User = require('./user.js');

// Table Blog
const Blog = sequelize.define(
  'blog',
  {
    blogId: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    blogTitle: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    blogDescription: {
      type: Sequelize.TEXT('long'),
      allowNull: false,
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

module.exports = Blog;
