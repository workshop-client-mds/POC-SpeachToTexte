'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Question extends Model {
    static associate(models) {
      // define association here
    }
  }
  Question.init(
    {
      category: DataTypes.STRING,
      content: DataTypes.JSONB,
    },
    {
      sequelize,
      modelName: 'Question',
      schema: 'app',
    },
  );
  return Question;
};
