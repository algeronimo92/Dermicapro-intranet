import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true, // Listen on all network interfaces
    watch: {
      // Forzar a Vite a revisar los archivos cada X tiempo en lugar de esperar eventos
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: 'http://backend:5000',
        changeOrigin: false,
        secure: false,
      },
      '/platform': {
        target: 'http://backend:5000',
        changeOrigin: false,
        secure: false,
      },
      '/uploads': {
        target: 'http://backend:5000',
        changeOrigin: false,
        secure: false,
      },
    },
    hmr: {
      clientPort: 5173,
    },
  },
});
