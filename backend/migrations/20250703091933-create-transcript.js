'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'Transcripts',
      {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        rawText: {
          type: Sequelize.TEXT,
        },
        cleanedText: {
          type: Sequelize.TEXT,
        },
        contextQuestion: {
          type: Sequelize.TEXT,
        },
        language: {
          type: Sequelize.STRING,
        },
        llmResponse: {
          type: Sequelize.JSONB,
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
    await queryInterface.dropTable({ tableName: 'Transcripts', schema: 'app' });
  },
};
