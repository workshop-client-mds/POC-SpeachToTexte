import { useState, useRef, useEffect } from 'react';
import recorderService from './services/recorderService';

// Check for browser support for the Web Speech API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const isSpeechRecognitionSupported = !!SpeechRecognition;

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [ttsText, setTtsText] = useState('');
  const [contextQuestion, setContextQuestion] = useState(
    ''
  );
  const [status, setStatus] = useState('Prêt');
  const [nativeApiFailed, setNativeApiFailed] = useState(false);

  const recognition = useRef(null);
  const finalTranscriptRef = useRef('');
  const contextQuestionRef = useRef('');

  // Setup SpeechRecognition on component mount if supported
  useEffect(() => {
    if (isSpeechRecognitionSupported) {
      setupNativeRecognition();
    } else {
      setStatus('Fallback WebSocket : prêt à enregistrer.');
    }
  }, []); // Empty dependency array ensures this runs only once

  const setupNativeRecognition = () => {
    recognition.current = new SpeechRecognition();
    recognition.current.continuous = true;
    recognition.current.interimResults = true;
    recognition.current.lang = 'fr-FR';

    recognition.current.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      finalTranscriptRef.current = finalTranscript;
      setTranscript(finalTranscript + interimTranscript);
    };

    recognition.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setStatus(`Erreur de reconnaissance: ${event.error}. Tentative de bascule vers le fallback.`);
      setNativeApiFailed(true);
    };

    recognition.current.onend = () => {
      setIsRecording(false);
      const textToClean = finalTranscriptRef.current.trim();
      if (textToClean) {
        handleCleanRequest(textToClean);
      } else {
        setStatus('Prêt');
      }
    };
  };

  const handleToggleRecording = () => {
    const shouldUseNative = isSpeechRecognitionSupported && !nativeApiFailed;

    if (isRecording) {
      // Stop recording for either method
      if (shouldUseNative) {
        recognition.current.stop();
      } else {
        recorderService.stopRecording();
      }
      setIsRecording(false);
      // For WebSocket, the final transcript is handled differently
      if (!shouldUseNative) {
        setStatus('Transcription en cours via WebSocket...');
      }
    } else {
      // Start recording for either method
      setTranscript('');
      finalTranscriptRef.current = '';
      setIsRecording(true);
      
      if (shouldUseNative) {
        setStatus('Écoute en cours (API native)...');
        recognition.current.start();
      } else {
        // Use WebSocket fallback
        if (isSpeechRecognitionSupported && nativeApiFailed) {
          setStatus('API native échouée. Bascule vers le fallback WebSocket...');
        } else {
          setStatus('Écoute en cours (Fallback WebSocket)...');
        }

        const onTranscript = (text) => {
          setTranscript(text);
          handleCleanRequest(text);
        };
        const onError = (error) => setStatus(error);
        recorderService.startRecording(onTranscript, onError);
      }
    }
  };

  const handleCleanRequest = async (rawText) => {
    if (!rawText) return;
    setStatus('Nettoyage de la transcription...');
    try {
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText, question: contextQuestionRef.current }),
      });
      if (!response.ok) throw new Error('Clean API request failed');
      const data = await response.json();

      const cleanedText = data.cleanedText || '[Nettoyage échoué]';

      console.log('--- Transcription Avant/Après ---');
      console.log('Brute:    ', rawText);
      console.log('Nettoyée: ', cleanedText);
      console.log('---------------------------------');

      // Update the main transcript display with the cleaned text
      setTranscript(cleanedText);
      // Also, pre-fill the Text-to-Speech input with the cleaned text
      setTtsText(cleanedText);
      
      setStatus('Prêt');
    } catch (error) {
      console.error('Cleaning request error:', error);
      setStatus(`Erreur de nettoyage: ${error.message}`);
    }
  };

  const handleTtsRequest = async () => {
    if (!ttsText.trim()) return;
    setStatus('Synthèse vocale en cours...');
    try {
      const response = await fetch(`http://${window.location.hostname}:3001/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: ttsText }),
      });

      if (!response.ok) {
        throw new Error(`TTS API request failed with status ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();
      audio.onended = () => setStatus('Prêt');

    } catch (error) {
      console.error('TTS request error:', error);
      setStatus('Erreur de synthèse vocale.');
    }
  };

  return (
    <div className="text-white min-h-screen flex flex-col items-center justify-center font-sans p-4">
      <div className="w-full max-w-2xl space-y-8">
        
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h1 className="text-3xl font-bold text-center mb-2">Speech-to-Text</h1>
          <p className="text-center text-gray-400 mb-4">Statut: {status}</p>
          <div className="min-h-[120px] bg-gray-900 rounded-md p-4 mb-6 border border-gray-700">
            <p className="text-gray-300">{transcript || 'Cliquez sur "Parler" pour commencer la transcription.'}</p>
          </div>
          <div className="flex justify-center">
            <button
              onClick={handleToggleRecording}
              
              className={`px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 ${isRecording ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-4 ring-opacity-50 ${isRecording ? 'ring-red-400' : 'ring-blue-400'} disabled:bg-gray-500 disabled:cursor-not-allowed`}>
              {isRecording ? 'Stop' : 'Parler'}
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <div className="mb-6">
            <label htmlFor="question" className="block text-lg font-medium text-gray-300 mb-2">
              Question de Contexte
            </label>
            <input
              type="text"
              id="question"
              value={contextQuestion}
              onChange={(e) => {
                setContextQuestion(e.target.value);
                contextQuestionRef.current = e.target.value; 
              }}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Entrez la question posée à l'utilisateur..."
            />
          </div>

          <h2 className="text-2xl font-bold mb-4">Actions</h2>
          <textarea 
            className="w-full bg-gray-700 text-white p-3 rounded-md mb-4 border border-gray-600 focus:ring-2 focus:ring-green-500 focus:outline-none"
            rows="3"
            placeholder="Entrez du texte à synthétiser..."
            value={ttsText}
            onChange={(e) => setTtsText(e.target.value)}
          ></textarea>
          <div className="flex justify-center">
            <button 
              onClick={handleTtsRequest}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-500"
              disabled={status !== 'Prêt'}
            >
              Lire le texte
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
