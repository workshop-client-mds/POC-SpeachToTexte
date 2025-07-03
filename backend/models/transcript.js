'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Transcript extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Transcript.init({
    rawText: DataTypes.TEXT,
    cleanedText: DataTypes.TEXT,
    contextQuestion: DataTypes.TEXT,
    language: DataTypes.STRING,
    llmResponse: DataTypes.JSONB
  }, {
    sequelize,
    modelName: 'Transcript',
  });
  return Transcript;
};