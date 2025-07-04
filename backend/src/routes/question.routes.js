const express = require('express');
const router = express.Router();
const { getRandomQuestion } = require('../services/question.service');

// GET /api/questions/random - Get a random question
router.get('/random', async (req, res) => {
  try {
    const question = await getRandomQuestion();
    if (!question) {
      return res.status(404).json({ message: 'No questions found.' });
    }
    res.json(question);
  } catch (error) {
    console.error('Error fetching random question:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
