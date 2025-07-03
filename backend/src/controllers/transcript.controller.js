const transcriptService = require('../services/transcript.service');

class TranscriptController {
  async create(req, res) {
    try {
      const transcript = await transcriptService.create(req.body);
      res.status(201).json(transcript);
    } catch (error) {
      res.status(500).json({ message: 'Error creating transcript', error: error.message });
    }
  }

  async findAll(req, res) {
    try {
      const transcripts = await transcriptService.findAll();
      res.status(200).json(transcripts);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching transcripts', error: error.message });
    }
  }

  async findOne(req, res) {
    try {
      const transcript = await transcriptService.findOne(req.params.id);
      if (transcript) {
        res.status(200).json(transcript);
      } else {
        res.status(404).json({ message: 'Transcript not found' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error fetching transcript', error: error.message });
    }
  }

  async update(req, res) {
    try {
      const transcript = await transcriptService.update(req.params.id, req.body);
      if (transcript) {
        res.status(200).json(transcript);
      } else {
        res.status(404).json({ message: 'Transcript not found' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error updating transcript', error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const result = await transcriptService.delete(req.params.id);
      if (result) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: 'Transcript not found' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error deleting transcript', error: error.message });
    }
  }
}

module.exports = new TranscriptController();
