const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const multer = require('multer');
const OpenAI = require('openai');
const { toFile } = require('openai/uploads');
const { Readable } = require('stream');
const transcriptRoutes = require('./routes/transcript.routes');
const questionRoutes = require('./routes/question.routes');
const transcriptService = require('./services/transcript.service');

// --- OpenAI Client Setup ---
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- Basic Server Setup ---
const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = ['http://localhost:3000', 'https://localhost:3000'];
    // In a production environment, you should use a proper whitelist of allowed domains.
    // For this development setup, we'll allow requests from our frontend's origin.
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // This allows the server to accept cookies from the client.
};

app.use(cors(corsOptions));
app.use(express.json());

// --- Transcript History Routes ---
app.use('/api/transcripts', transcriptRoutes);
app.use('/api/questions', questionRoutes);

// --- Health Check Endpoint ---
app.get('/', (req, res) => {
  res.send('Backend is running!');
});

// --- TTS REST Endpoint ---
app.post('/api/tts', async (req, res) => {
  const { text, lang = 'fr-FR' } = req.body; // Default to French
  const voice = lang.startsWith('en') ? 'nova' : 'alloy'; // English voice vs. French voice
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
const getSystemPrompt = (lang) => {
  if (lang.startsWith('en')) {
    return `You are a world-class language correction assistant. Your role is to analyze an audio transcription that may contain errors, hesitations, or filler words.\n\nYour mission is as follows:\n1. **Correct and clean**: Correct transcription errors and clean the sentence of hesitations, repetitions, and filler words to make it clear and natural.\n2. **Use context (if provided)**: If a **question** is provided, use it as the main clue to infer the real meaning of the answer and make more accurate corrections.\n3. **Be faithful**: Do not change the meaning of the user's response. Your goal is to restore their intention as faithfully as possible.\n4. **Handle uncertainty**: If the transcription is too ambiguous to be corrected with certainty, return '[No answer detected]'.\n5. **Output format**: Return ONLY the corrected text, without any introductory phrases like "Here is the corrected text:".`;
  }
  // Default to French
  return `Tu es un assistant de correction linguistique de très haut niveau. Ton rôle est d'analyser une transcription audio qui peut contenir des erreurs, des hésitations ou des tics de langage.\n\nTa mission est la suivante :\n1.  **Corrige et nettoie** : Corrige les erreurs de transcription et nettoie la phrase des hésitations, répétitions et tics de langage pour la rendre claire et naturelle.\n2.  **Utilise le contexte (si fourni)** : Si une **question** est fournie, utilise-la comme indice principal pour déduire le sens réel de la réponse et effectuer des corrections plus précises.\n3.  **Sois fidèle** : Ne change pas le sens de la réponse de l'utilisateur. Ton but est de restituer son intention le plus fidèlement possible.\n4.  **Gère l'incertitude** : Si la transcription est trop ambiguë pour être corrigée avec certitude, retourne '[Pas de réponse détectée]'.\n5.  **Format de sortie** : Ne retourne QUE le texte corrigé, sans aucune phrase d'introduction comme "Voici le texte corrigé :".`;
};

app.post('/api/chat', async (req, res) => {
  const { text: rawText, questionContext, lang } = req.body;

  if (!rawText) {
    return res.status(400).json({ message: 'Text to clean is required.' });
  }

  let completion;
  let evaluationResult;

  try {
    let systemPrompt;
    let userPrompt;

    if (questionContext && questionContext.questionText) {
      // New logic for evaluating an answer

      systemPrompt = `
      You are an expert, multilingual quiz evaluator. Your role is to analyze a user's spoken answer to a given question and provide a structured evaluation.
      
      **CONTEXT:**
      - Language of interaction: ${lang}
      - Question: You will be provided with the question text.
      - Expected Answer: You will be provided with the ideal answer.
      - User's Transcript: You will receive the raw, unedited text transcribed from the user's speech.
      
      **PRIMARY DIRECTIVE:**
      Evaluate the user's answer based on its semantic meaning compared to the expected answer. Your response MUST be a single, minified JSON object with NO markdown formatting.
      
      **JSON OUTPUT STRUCTURE:**
      {
        "evaluation": "string",
        "feedback": "string"
      }
      
      **EVALUATION CATEGORIES (for the "evaluation" field):**
      1.  **"correct"**: The user's answer is semantically equivalent to the expected answer. Synonyms are acceptable. Ignore minor speech disfluencies (e.g., "uhm", "like").
      2.  **"partially_correct"**: The user's answer contains some correct elements but is incomplete or contains a significant error.
      3.  **"incorrect"**: The user's answer is factually wrong.
      4.  **"irrelevant"**: The user's answer is off-topic, nonsensical, or an explicit refusal to answer (e.g., "I don't know", "pass", "blablabla").
      
      **FEEDBACK RULES (for the "feedback" field):**
      - The feedback must be a single, concise, and encouraging sentence in ${lang}.
      - **If correct:** Start with "Correct !". Example: "Correct ! La réponse est bien 42."
      - **If partially_correct:** Start with "Presque !". Briefly mention what was right. Example: "Presque ! Vous avez mentionné deux des trois couleurs primaires."
      - **If incorrect:** Start with "Incorrect.". Provide the correct answer. Example: "Incorrect. La bonne réponse était Canberra."
      - **If irrelevant:** Use the exact phrase: "[Réponse non pertinente ou inaudible]"
      
      **SPECIAL INSTRUCTIONS:**
      - **Numerical Answers:** Be strict. If the expected answer is "42", "41.9" is incorrect.
      - **Lists:** If the answer is a list, "partially_correct" is appropriate if the user names only some items.
      - **Focus on Meaning:** Do not penalize for grammatical errors in the raw transcript; focus on the core meaning.
      
      Your entire output must be ONLY the JSON object.`;

      userPrompt = `Question: "${questionContext.questionText}"\nExpected Answer: "${questionContext.expectedAnswer}"\nUser's Spoken Answer: "${rawText}"`;
    } else {
      // Fallback to old cleaning logic if no question context is provided
      systemPrompt = `You are an expert linguist. Your task is to correct and rephrase the following text. The language is ${lang}. If the text is empty or nonsensical, return "[Pas de réponse détectée]".`;
      userPrompt = rawText;
    }

    console.log('--- Evaluation Request ---');
    console.log('System Prompt:', systemPrompt);
    console.log('User Prompt:', userPrompt);
    console.log('------------------------');

    completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2, // Lower temperature for more deterministic evaluation
      max_tokens: 100,
    });

    evaluationResult = completion.choices[0].message.content.trim();

    console.log('--- Evaluation Result ---');
    console.log('IA Feedback:', evaluationResult);
    console.log('-----------------------');

    // Save the transcript to the database
    await transcriptService.create({
      rawText,
      cleanedText: evaluationResult, // We now save the feedback as the 'cleanedText'
      contextQuestion: questionContext ? questionContext.questionText : null,
      language: lang,
      llmResponse: completion.choices[0],
    });

    res.json({ cleanedText: evaluationResult });
  } catch (error) {
    console.error('Error during chat completion:', error);
    res.status(500).json({ message: 'Failed to evaluate text' });
  }
});

// --- WebSocket Server for Real-time Transcription ---
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Client connected via WebSocket for transcription.');
  let audioChunks = [];
  let transcriptionLanguage = 'fr'; // Default language

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
      if (command.event === 'start') {
        transcriptionLanguage = command.lang === 'en-US' ? 'en' : 'fr';
        console.log(
          `[Backend] Transcription language set to: ${transcriptionLanguage}`,
        );
        return; // Don't process audio chunks for a start command
      }
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
      console.log('[Backend] Received "end" command:', command);
      if (audioChunks.length === 0) {
        console.log(
          '[Backend] Received "end" command but no audio was recorded.',
        );
        return;
      }

      console.log('End of audio stream received. Processing...');
      console.log('Received MIME type:', command.mimeType);
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
          language: transcriptionLanguage,
          prompt:
            transcriptionLanguage === 'fr'
              ? 'Cette transcription est en français et concerne une conversation générale.'
              : 'This transcription is in English and concerns a general conversation.',
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
