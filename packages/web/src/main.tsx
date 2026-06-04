import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';
import App from './App.tsx';
import { bridgeViteEnvToGlobal } from './config/viteEnvBridge.ts';

bridgeViteEnvToGlobal(import.meta.env);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
