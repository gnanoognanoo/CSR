import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/sora/latin-500.css';
import '@fontsource/sora/latin-600.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import './styles.css';
import './foreground.css';
import './home-typography.css';
import './font-system.css';
import App from './App';

// Canvas labels must be drawn with the same loaded faces as the HTML interface.
const mountApplication = () => ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter><App /></BrowserRouter></React.StrictMode>);
Promise.all([
  '500 16px "Sora"', '600 16px "Sora"',
  '400 16px "DM Sans"', '500 16px "DM Sans"', '600 16px "DM Sans"',
  '400 16px "IBM Plex Mono"', '500 16px "IBM Plex Mono"',
].map(face => document.fonts.load(face))).then(mountApplication).catch(error => {
  console.error('CSR-RIT local font loading failed:', error);
  mountApplication();
});
