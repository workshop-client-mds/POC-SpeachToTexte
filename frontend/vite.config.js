import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces for Docker
    port: 3000,
    strictPort: true,
    https: true, // Enable HTTPS
  },
});
