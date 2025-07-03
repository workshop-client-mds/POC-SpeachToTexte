const express = require('express');
const router = express.Router();
const transcriptController = require('../controllers/transcript.controller');

// Define CRUD routes for transcripts
router.get('/', transcriptController.findAll);
router.post('/', transcriptController.create);
router.get('/:id', transcriptController.findOne);
router.put('/:id', transcriptController.update);
router.delete('/:id', transcriptController.delete);

module.exports = router;
