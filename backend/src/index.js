import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';

import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import { WebSocketServer } from 'ws';

// --- OpenAI Client Setup ---
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- Basic Server Setup ---
const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- Health Check Endpoint ---
app.get('/', (req, res) => {
  res.send('Backend is running!');
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
      model: 'gpt-4o-mini-tts',
      voice: 'alloy',
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

// --- Chat Endpoint for Cleaning Text ---
app.post('/api/chat', async (req, res) => {
  const { text, question } = req.body; // question is optional

  console.log('--- Cleaning Request ---');
  console.log('Texte à nettoyer:', text);
  if (question) {
    console.log('Question de contexte:', question);
  }
  console.log('------------------------');

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    // Construct the user message based on whether a question is provided
    const userContent = question
      ? `Question: "${question}"\n\nTranscription brute de la réponse: "${text}"`
      : `Transcription brute: "${text}"`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano', // Using a newer, more capable model
      temperature: 0.2, // Lower temperature for more deterministic corrections
      messages: [
        {
          role: 'system',
          content: `Tu es un assistant de correction linguistique de très haut niveau. Ton rôle est d'analyser une transcription audio qui peut contenir des erreurs, des hésitations ou des tics de langage.\n\nTa mission est la suivante :\n1.  **Corrige et nettoie** : Corrige les erreurs de transcription et nettoie la phrase des hésitations, répétitions et tics de langage pour la rendre claire et naturelle.\n2.  **Utilise le contexte (si fourni)** : Si une **question** est fournie, utilise-la comme indice principal pour déduire le sens réel de la réponse et effectuer des corrections plus précises.\n3.  **Sois fidèle** : Ne change pas le sens de la réponse de l'utilisateur. Ton but est de restituer son intention le plus fidèlement possible.\n4.  **Gère l'incertitude** : Si la transcription est trop ambiguë pour être corrigée avec certitude, retourne '[Pas de réponse détectée]'.\n5.  **Format de sortie** : Ne retourne QUE le texte corrigé, sans aucune phrase d'introduction comme "Voici le texte corrigé :".\n\nExemple avec question :\n-   **Question fournie** : "Quelle est la capitale du Royaume-Uni ?"\n-   **Transcription brute** : "euh... je crois que c'est... langue... non, lande... oui, lande"\n-   **Sortie attendue** : "Je crois que c'est Londres."\n\nExemple sans question :\n-   **Transcription brute** : "euh... j'aimerais... j'aimerais réserver une table pour... pour deux personnes ce soir."\n-   **Sortie attendue** : "J'aimerais réserver une table pour deux personnes ce soir."`,
        },
        {
          role: 'user',
          content: userContent,
        },
      ],
    });

    const aiResponse = completion.choices[0].message.content;
    console.log('--- Cleaning Result ---');
    console.log('Texte nettoyé:', aiResponse);
    console.log('-----------------------');
    res.json({ cleanedText: aiResponse });
  } catch (error) {
    console.error('Error during chat completion:', error);
    res.status(500).json({ error: 'Failed to get chat response.' });
  }
});

// --- WebSocket Server for Real-time Transcription ---
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Client connected via WebSocket for transcription.');
  let audioChunks = [];

  ws.on('message', async (message) => {
    // All messages from the 'ws' library are Buffers. We must try to interpret them.
    let command;
    try {
      // Attempt to parse the message as a JSON command.
      command = JSON.parse(message.toString());
      console.log(
        '[Backend] Message successfully parsed as JSON command:',
        command,
      );
    } catch (e) {
      // If parsing fails, it's not a command, so it must be audio data.
      console.log(
        '[Backend] Message is not a JSON command, treating as binary audio data.',
      );
      audioChunks.push(message);
      return; // Stop processing this message further.
    }

    // If we're here, the message was a valid JSON command.
    if (command && command.event === 'end') {
      if (audioChunks.length === 0) {
        console.log(
          '[Backend] Received "end" command but no audio was recorded.',
        );
        return;
      }

      console.log('End of audio stream received. Processing...');
      try {
        const audioBuffer = Buffer.concat(audioChunks);
        const mimeType = command.mimeType || 'audio/webm';
        const fileName = `upload.${mimeType.split('/')[1].split(';')[0]}`;

        const audioFile = await toFile(audioBuffer, fileName, {
          type: mimeType,
        });

        const transcription = await openai.audio.transcriptions.create({
          model: 'whisper-1',
          file: audioFile,
          language: 'fr',
          prompt:
            'Cette transcription est en français et concerne une conversation générale.',
        });

        console.log('--- Fallback Transcript (Raw) ---');
        console.log('Texte brut de Whisper:', transcription.text);
        console.log('---------------------------------');
        ws.send(
          JSON.stringify({ event: 'transcript', data: transcription.text }),
        );

        audioChunks = []; // Reset for the next recording.
      } catch (error) {
        console.error('Error during STT processing via WebSocket:', error);
        ws.send(
          JSON.stringify({
            event: 'error',
            message: 'Failed to process audio.',
          }),
        );
      }
    } else {
      console.log(
        `[Backend] Received a command, but it's not 'end' or not actionable now:`,
        command,
      );
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected from WebSocket.');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// --- Start Server ---
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
