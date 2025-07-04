'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'Questions',
      {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        category: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        content: {
          type: Sequelize.JSONB,
          allowNull: false,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      },
      {
        schema: 'app',
      },
    );
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable({ tableName: 'Questions', schema: 'app' });
  },
};
