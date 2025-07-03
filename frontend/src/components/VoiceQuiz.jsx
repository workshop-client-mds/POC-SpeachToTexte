import { useState, useEffect } from 'react';

const VoiceQuiz = () => {
  const [questions] = useState([
    {
      type: "qcm",
      text: "Quel est le résultat de deux plus deux ?",
      expectedAnswers: ["quatre", "4"]
    },
    {
      type: "cloze",
      text: "La capitale de la France est ___ .",
      expectedAnswers: ["paris"]
    }
  ]);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [transcription, setTranscription] = useState('Texte reconnu : ...');
  const [result, setResult] = useState('');
  const [isListening, setIsListening] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
    displayQuestion();
    readQuestion();
  }, [currentQuestionIndex]);

  const displayQuestion = () => {
    setResult('');
    setTranscription('Texte reconnu : ...');
  };

  const readQuestion = () => {
    const q = questions[currentQuestionIndex];
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(q.text.replace("___", "blanc"));
    msg.lang = "fr-FR";
    msg.rate = 0.95;
    msg.pitch = 1.1;
    msg.volume = 1;
    
    // Try to use a French voice if available
    const voices = window.speechSynthesis.getVoices();
    const frVoice = voices.find(v => v.lang && v.lang.startsWith('fr'));
    if (frVoice) msg.voice = frVoice;
    
    window.speechSynthesis.speak(msg);
  };

  const validateWithChatGPT = async (question, userAnswer) => {
    try {
      // Use your existing backend API for validation
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: userAnswer, 
          question: `Est-ce que la réponse "${userAnswer}" est correcte pour la question: "${question}"? Répondez uniquement par "oui" ou "non".`
        }),
      });
      
      if (!response.ok) {
        throw new Error('Validation API request failed');
      }
      
      const data = await response.json();
      const cleanedResponse = data.cleanedText?.toLowerCase() || '';
      
      // Check if the response contains "oui" or use fallback validation
      const isCorrectFromAPI = cleanedResponse.includes('oui');
      
      if (isCorrectFromAPI) {
        return true;
      }
      
      // Fallback to simple validation
      const q = questions[currentQuestionIndex];
      const lowerAnswer = userAnswer.toLowerCase().trim();
      return q.expectedAnswers.some(expected => 
        lowerAnswer.includes(expected.toLowerCase())
      );
      
    } catch (error) {
      console.error('API validation error:', error);
      
      // Fallback to simple validation
      const q = questions[currentQuestionIndex];
      const lowerAnswer = userAnswer.toLowerCase().trim();
      return q.expectedAnswers.some(expected => 
        lowerAnswer.includes(expected.toLowerCase())
      );
    }
  };

  const startRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Votre navigateur ne supporte pas la reconnaissance vocale.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    
    setIsListening(true);
    recognition.start();

    recognition.onstart = () => {
      setTranscription("Écoute en cours...");
    };

    recognition.onresult = async (event) => {
      const lastResult = event.results[event.results.length - 1];
      const transcript = lastResult[0].transcript.trim().toLowerCase();
      
      setTranscription("Texte reconnu : " + transcript);
      
      if (lastResult.isFinal) {
        setIsListening(false);
        setResult("Vérification...");
        
        try {
          const isCorrect = await validateWithChatGPT(currentQuestion.text, transcript);
          
          if (isCorrect) {
            setResult("✅ Bonne réponse !");
            speak("Bonne réponse !");
            
            setTimeout(() => {
              if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(currentQuestionIndex + 1);
              } else {
                setResult("🎉 Fin du quiz !");
                speak("Félicitations ! Vous avez terminé le quiz.");
              }
            }, 1500);
          } else {
            setResult("❌ Mauvaise réponse.");
            speak("Mauvaise réponse.");
          }
        } catch (e) {
          setResult("Erreur : " + e.message);
        }
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      setResult("Erreur : " + event.error);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  };

  const speak = (text) => {
    window.speechSynthesis.cancel();
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = "fr-FR";
    window.speechSynthesis.speak(msg);
  };

  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setResult('');
    setTranscription('Texte reconnu : ...');
  };

  return (
    <div className="bg-gray-100 min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* H5P Audio Recorder Embeds */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">
            Exemples H5P - Speak the Words
          </h2>
          <div className="space-y-4">
            <iframe 
              src="https://h5p.org/h5p/embed/72682" 
              width="100%" 
              height="179" 
              frameBorder="0" 
              allowFullScreen="allowfullscreen" 
              allow="geolocation *; microphone *; camera *; midi *; encrypted-media *" 
              title="Speak the Words"
              className="w-full rounded-lg border"
            />
            <iframe 
              src="https://h5p.org/h5p/embed/119337" 
              width="100%" 
              height="604" 
              frameBorder="0" 
              allowFullScreen="allowfullscreen" 
              allow="geolocation *; microphone *; camera *; midi *; encrypted-media *" 
              title="Speak the Words Set"
              className="w-full rounded-lg border"
            />
            <iframe 
              src="https://h5p.org/h5p/embed/119342" 
              width="100%" 
              height="311" 
              frameBorder="0" 
              allowFullScreen="allowfullscreen" 
              allow="geolocation *; microphone *; camera *; midi *; encrypted-media *" 
              title="Example Content - Speak the words set - Numeric Quiz"
              className="w-full rounded-lg border"
            />
            <iframe 
              src="https://h5p.org/h5p/embed/119355" 
              width="100%" 
              height="311" 
              frameBorder="0" 
              allowFullScreen="allowfullscreen" 
              allow="geolocation *; microphone *; camera *; midi *; encrypted-media *" 
              title="Example Content - Speak the words set - Geography Quiz"
              className="w-full rounded-lg border"
            />
          </div>
        </div>

        {/* Voice Quiz Section */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
            🎤 Test vocal
          </h1>
          
          <div className="mb-6">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <strong className="text-blue-800">Question {currentQuestionIndex + 1}/{questions.length}:</strong>
              <p className="text-blue-700 mt-2">{currentQuestion.text}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 justify-center mb-6">
            <button
              onClick={readQuestion}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
            >
              🔊 Lire la question
            </button>
            
            <button
              onClick={startRecognition}
              disabled={isListening}
              className={`font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2 ${
                isListening 
                  ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              🎙️ {isListening ? 'Écoute...' : 'Répondre oralement'}
            </button>

            {currentQuestionIndex === questions.length - 1 && result.includes('Fin du quiz') && (
              <button
                onClick={resetQuiz}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
              >
                🔄 Recommencer
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700">{transcription}</p>
            </div>
            
            {result && (
              <div className={`rounded-lg p-4 font-bold ${
                result.includes('✅') ? 'bg-green-100 text-green-800' :
                result.includes('❌') ? 'bg-red-100 text-red-800' :
                result.includes('🎉') ? 'bg-purple-100 text-purple-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {result}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceQuiz;
