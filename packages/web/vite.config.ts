import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Base configuration
  const config = {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };

  // Local development mode - hybrid local/emulated setup
  if (mode === 'local-dev') {
    return {
      ...config,
      server: {
        ...config.server,
        port: 5173, // Vite default port
        host: true, // Allow external connections
      },
    };
  }

  return config;
});
