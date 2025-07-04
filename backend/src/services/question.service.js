const { Question } = require('../../models');
const { Sequelize } = require('sequelize');

const getRandomQuestion = async () => {
  // Use RANDOM() for PostgreSQL to efficiently get a random row
  const question = await Question.findOne({
    order: Sequelize.literal('RANDOM()'),
  });
  return question;
};

module.exports = {
  getRandomQuestion,
};
