'use strict';

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const questions = [
      // French
      {
        category: 'Français - Grammaire',
        content: JSON.stringify({
          questionText: "Complétez la phrase : 'Les enfants ... à la plage.' (aller)",
          expectedAnswer: "vont",
          insights: "Conjugaison simple du verbe 'aller' au présent de l'indicatif."
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        category: 'Français - Orthographe',
        content: JSON.stringify({
          questionText: "Quelle est la bonne orthographe : 'addresse' ou 'adresse' ?",
          expectedAnswer: "adresse",
          insights: "Orthographe d'un mot courant avec une double consonne souvent erronée."
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // General Knowledge
      {
        category: 'Culture Générale',
        content: JSON.stringify({
          questionText: "Qui a peint la Joconde ?",
          expectedAnswer: "Léonard de Vinci",
          insights: "Question de culture générale artistique très connue."
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        category: 'Culture Générale',
        content: JSON.stringify({
          questionText: "Quelle est la planète la plus proche du Soleil ?",
          expectedAnswer: "Mercure",
          insights: "Question de science (astronomie) de base."
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // English
      {
        category: 'Anglais - Vocabulaire',
        content: JSON.stringify({
          questionText: "What is the opposite of 'hot'?",
          expectedAnswer: "cold",
          insights: "Antonyme basique en anglais."
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        category: 'Anglais - Grammaire',
        content: JSON.stringify({
          questionText: "Choose the correct word: 'She ... a doctor.' (is/are)",
          expectedAnswer: "is",
          insights: "Conjugaison simple du verbe 'to be' à la troisième personne du singulier."
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      // Mathematics
      {
        category: 'Mathématiques',
        content: JSON.stringify({
          questionText: "Combien font 9 x 6 ?",
          expectedAnswer: "54",
          insights: "Calcul mental simple (multiplication)."
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        category: 'Mathématiques',
        content: JSON.stringify({
          questionText: "Quel est le résultat de 100 divisé par 4 ?",
          expectedAnswer: "25",
          insights: "Calcul mental simple (division)."
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await queryInterface.bulkInsert({ tableName: 'Questions', schema: 'app' }, questions, {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete({ tableName: 'Questions', schema: 'app' }, null, {});
  }
};
