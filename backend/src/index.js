import 'dotenv/config';
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import OpenAI from 'openai';
import { toFile } from 'openai/uploads';

// --- OpenAI Client Setup ---
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- Basic Server Setup ---
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- Health Check Endpoint ---
app.get('/', (req, res) => {
  res.send('Backend is running!');
});

// --- STT WebSocket Endpoint ---
wss.on('connection', (ws) => {
  console.log('Client connected for STT');

  ws.on('message', async (message) => {
    try {
      // The 'message' is a Buffer. Convert it to a File-like object
      // the OpenAI API understands, providing a filename.
      const file = await toFile(message, 'audio.webm', { type: 'audio/webm' });

      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        language: 'fr',
        response_format: 'json',
        // Add a prompt to guide the AI and prevent hallucinations on silent audio
        prompt: 'Ceci est une transcription d\'un utilisateur parlant dans un microphone.',
      });

      console.log('Transcription result:', transcription.text);
      ws.send(JSON.stringify({ transcript: transcription.text }));

    } catch (error) {
      console.error('Error during transcription:', error);
      ws.send(JSON.stringify({ error: 'Transcription failed.' }));
    }
  });

  ws.on('close', () => console.log('Client disconnected'));
  ws.on('error', (error) => console.error('WebSocket error:', error));
});

// --- TTS REST Endpoint ---
app.post('/api/tts', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  console.log(`Received TTS request for text: "${text}"`);

  try {
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy', // As specified in prd.md
      input: text,
    });

    res.setHeader('Content-Type', 'audio/mpeg');
    // The response is a Readable stream. We pipe it to the client.
    mp3.body.pipe(res);

  } catch (error) {
    console.error('Error during TTS generation:', error);
    res.status(500).json({ error: 'Failed to generate audio.' });
  }
});



// --- Start Server ---
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
