import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource-variable/inter';
import './styles/tokens.css';
import './legacy/legacy.css';
import './styles/app.css';
import { App } from './App';
import { getState } from './lib/state';
import { applyTheme } from './lib/ui';

// thème posé avant le premier rendu : pas de flash clair/sombre
applyTheme(getState().settings.theme);

createRoot(document.getElementById('root')!).render(<App />);

// service worker : hors ligne + réception des rappels push
registerSW({ immediate: true });
