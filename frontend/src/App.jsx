import { useState, useRef, useEffect } from 'react';
import recorderService from './services/recorderService';

// Check for browser support for the Web Speech API
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const isSpeechRecognitionSupported = !!SpeechRecognition;

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [ttsText, setTtsText] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [status, setStatus] = useState('Prêt');
  const [nativeApiFailed, setNativeApiFailed] = useState(false);
  const [language, setLanguage] = useState('fr-FR');
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);

  const recognition = useRef(null);
  const finalTranscriptRef = useRef('');
  const currentQuestionRef = useRef(null);

  // Setup SpeechRecognition on component mount if supported
  useEffect(() => {
    if (isSpeechRecognitionSupported) {
      setupNativeRecognition();
    } else {
      setStatus('Prêt');
      setIsFallbackMode(true);
    }
  }, []);

  useEffect(() => {
    if (isSpeechRecognitionSupported) {
      if (recognition.current && isRecording) {
        recognition.current.stop();
      }
      setupNativeRecognition();
    }
  }, [language]); // Re-run when language changes

  // Keep a ref in sync with the latest question state to avoid stale closures
  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);

  const setupNativeRecognition = () => {
    recognition.current = new SpeechRecognition();
    recognition.current.continuous = true;
    recognition.current.interimResults = true;
    recognition.current.lang = language;

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
      setStatus(
        `Erreur de reconnaissance: ${event.error}. Tentative de bascule vers le fallback.`,
      );
      setNativeApiFailed(true);
      setIsFallbackMode(true);
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
          setStatus(
            'API native échouée. Bascule vers le fallback WebSocket...',
          );
        } else {
          setStatus('Écoute en cours (Fallback WebSocket)...');
        }

        const onTranscript = (text) => {
          setTranscript(text);
          handleCleanRequest(text);
        };
        const onError = (error) => setStatus(error);
        recorderService.startRecording(onTranscript, onError, language);
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
        body: JSON.stringify({
          text: rawText,
          questionContext: currentQuestionRef.current
            ? currentQuestionRef.current.content
            : null,
          lang: language,
        }),
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
      const response = await fetch(
        `http://${window.location.hostname}:3001/api/tts`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: ttsText, lang: language }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `TTS API request failed with status ${response.status}`,
        );
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

  const fetchRandomQuestion = async () => {
    setStatus("Recherche d'une question...");
    try {
      const response = await fetch(
        'http://localhost:3001/api/questions/random',
      );
      if (!response.ok) {
        throw new Error('Failed to fetch question');
      }
      const data = await response.json();
      setCurrentQuestion(data);
      setStatus('Prêt');
    } catch (error) {
      console.error('Failed to fetch random question:', error);
      setStatus('Erreur lors de la récupération de la question.');
      setCurrentQuestion(null);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/transcripts');
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  const toggleHistory = () => {
    if (!showHistory) {
      fetchHistory();
    }
    setShowHistory(!showHistory);
  };

  return (
    <div className="bg-gray-50 min-h-screen font-sans text-gray-800">
      {/* Header */}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Transcription Card */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Transcription en Direct</h2>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-gray-100 border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="fr-FR">Français (France)</option>
                  <option value="en-US">English (US)</option>
                </select>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <span>Statut:</span>
                <span className="flex items-center gap-1.5 bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                  <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                  {status}
                </span>
                {isFallbackMode && (
                  <span className="text-yellow-600">(Mode Fallback)</span>
                )}
              </div>
              <div className="min-h-[120px] bg-gray-100 rounded-md p-4 mb-6 border border-gray-200">
                <p className="text-gray-700">
                  {transcript ||
                    'Cliquez sur "Démarrer l\'enregistrement" pour commencer...'}
                </p>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={handleToggleRecording}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg text-lg font-semibold transition-all duration-300 shadow-sm ${isRecording ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} focus:outline-none focus:ring-4 ring-opacity-50 ${isRecording ? 'ring-red-300' : 'ring-blue-300'}`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                  {isRecording ? 'Arrêter' : "Démarrer l'enregistrement"}
                </button>
              </div>
            </div>

            {/* Synthèse Vocale Card */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-4">Synthèse Vocale</h2>
              <textarea
                className="w-full bg-gray-100 p-3 rounded-md mb-4 border border-gray-200 focus:ring-2 focus:ring-green-500 focus:outline-none"
                rows="3"
                placeholder="Saisissez votre texte ici..."
                value={ttsText}
                onChange={(e) => setTtsText(e.target.value)}
              ></textarea>
              <div className="flex justify-end">
                <button
                  onClick={handleTtsRequest}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Écouter
                </button>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1 space-y-8">
            {/* Contexte IA Card */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-2">Contexte IA</h2>
              <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-4 text-center mb-4">
                {currentQuestion ? (
                  <div>
                    <p className="text-sm font-medium text-blue-600 mb-1">
                      {currentQuestion.category}
                    </p>
                    <p className="font-semibold">
                      {currentQuestion.content.questionText}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm">
                    Générez une question pour tester votre compréhension orale.
                  </p>
                )}
              </div>
              <button
                onClick={fetchRandomQuestion}
                className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                    clipRule="evenodd"
                  />
                </svg>
                Nouvelle Question
              </button>
            </div>

            {/* Historique Card */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-4">Historique</h2>
              <div className="text-center text-gray-500 space-y-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 mx-auto text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm">Aucun enregistrement récent.</p>
              </div>
              <button
                onClick={toggleHistory}
                className="mt-4 w-full flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Voir tout l'historique
              </button>
            </div>
          </div>
        </div>
        {showHistory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="history-panel bg-white rounded-lg p-6 shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">
                  Historique des Transcriptions
                </h2>
                <button
                  onClick={toggleHistory}
                  className="text-gray-500 hover:text-gray-800"
                >
                  &times;
                </button>
              </div>
              <div className="history-list space-y-4">
                {history.length > 0 ? (
                  history.map((item) => (
                    <div
                      key={item.id}
                      className="history-item border-b border-gray-200 pb-3"
                    >
                      <p className="text-sm text-gray-500">
                        {new Date(item.createdAt).toLocaleString()} |{' '}
                        {item.language}
                      </p>
                      <p>
                        <strong>Original:</strong> {item.rawText}
                      </p>
                      <p>
                        <strong>Corrigé:</strong> {item.cleanedText}
                      </p>
                    </div>
                  ))
                ) : (
                  <p>Aucun historique trouvé.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
