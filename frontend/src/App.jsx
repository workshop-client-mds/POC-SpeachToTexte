import { useState, useRef } from 'react';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  const [ttsText, setTtsText] = useState('');
  const [status, setStatus] = useState('Prêt');

  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const ws = useRef(null);

  const setupWebSocket = () => {
    ws.current = new WebSocket(`ws://${window.location.hostname}:3001`);
    ws.current.onopen = () => console.log('WebSocket for STT connected');
    ws.current.onclose = () => console.log('WebSocket for STT disconnected');
    ws.current.onerror = (error) => console.error('WebSocket error:', error);
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // Check if the 'transcript' property exists, even if it's an empty string
      if (data.hasOwnProperty('transcript')) {
        setTranscript(data.transcript || '[Silence ou erreur de transcription]');
        setStatus('Prêt');
      } else if (data.error) {
        console.error('Transcription error from backend:', data.error);
        setTranscript(''); // Clear previous transcript on error
        setStatus(`Erreur: ${data.error}`);
      }
    };
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      mediaRecorder.current.stop();
      setIsRecording(false);
      setStatus('Transcription en cours...');
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setupWebSocket(); // Open WS connection on record start
        mediaRecorder.current = new MediaRecorder(stream);

        mediaRecorder.current.ondataavailable = (event) => {
          audioChunks.current.push(event.data);
        };

        mediaRecorder.current.onstop = () => {
          const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
          if (ws.current && ws.current.readyState === WebSocket.OPEN) {
            ws.current.send(audioBlob);
          } else {
            console.error('WebSocket not open. Cannot send audio.');
            setStatus('Erreur de connexion WebSocket.');
          }
          audioChunks.current = [];
        };

        audioChunks.current = [];
        mediaRecorder.current.start();
        setIsRecording(true);
        setTranscript(''); // Clear previous transcript
        setStatus('Enregistrement...');
      } catch (error) {
        console.error('Error accessing microphone:', error);
        setStatus('Erreur: accès au microphone refusé.');
      }
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
    <div className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center font-sans p-4">
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
              className={`px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 ${isRecording ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-4 ring-opacity-50 ${isRecording ? 'ring-red-400' : 'ring-blue-400'}`}>
              {isRecording ? 'Stop' : 'Parler'}
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-3xl font-bold text-center mb-4">Text-to-Speech</h2>
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
