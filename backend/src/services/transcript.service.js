const { Transcript } = require('../../models');

class TranscriptService {
  async create(data) {
    return await Transcript.create(data);
  }

  async findAll() {
    return await Transcript.findAll({
      order: [['createdAt', 'DESC']],
    });
  }

  async findOne(id) {
    return await Transcript.findByPk(id);
  }

  async update(id, data) {
    const transcript = await this.findOne(id);
    if (transcript) {
      return await transcript.update(data);
    }
    return null;
  }

  async delete(id) {
    const transcript = await this.findOne(id);
    if (transcript) {
      await transcript.destroy();
      return true;
    }
    return false;
  }
}

module.exports = new TranscriptService();
