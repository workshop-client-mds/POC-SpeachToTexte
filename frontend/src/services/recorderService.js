class RecorderService {
  constructor() {
    this.mediaRecorder = null;
    this.stream = null;
    this.socket = null;
    this.mimeType = '';
  }

  startRecording(onTranscript, onError, language = 'fr-FR') {
    // Use ws:// for local dev, wss:// for production
    const wsUrl = `ws://${window.location.hostname}:3001`;
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = async () => {
      try {
        // Send the language information as soon as the connection is open
        this.socket.send(JSON.stringify({ event: 'start', lang: language }));

        const supportedMimeType = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/ogg;codecs=opus',
          'audio/mp4',
        ].find((type) => MediaRecorder.isTypeSupported(type));

        if (!supportedMimeType) {
          throw new Error('Navigateur non supporté: aucun format audio trouvé.');
        }
        this.mimeType = supportedMimeType;

        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: this.mimeType });

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && this.socket.readyState === WebSocket.OPEN) {
            console.log(`[Frontend] Sending audio chunk of size: ${event.data.size}`);
            this.socket.send(event.data);
          }
        };

        this.mediaRecorder.start(1000); // Send data every 1000ms (1 second)

      } catch (error) {
        console.error('Error starting recording via WebSocket:', error);
        if (onError) onError(error.message);
        this.socket.close();
      }
    };

    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.event === 'transcript' && onTranscript) {
        onTranscript(message.data);
      }
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (onError) onError('Erreur de connexion WebSocket.');
    };

    this.socket.onclose = () => {
      console.log('WebSocket connection closed.');
      this.stopMediaStream();
    };
  }

  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
      // Signal to the backend that we are done sending audio
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        console.log('[Frontend] Sending "end" signal to backend.');
        this.socket.send(JSON.stringify({ event: 'end', mimeType: this.mimeType }));
      }
    }
    // The onclose event will handle stream cleanup
  }

  stopMediaStream() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
  }
}

const recorderService = new RecorderService();
export default recorderService;
