import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { captureAttribution } from './lib/leads';
import { SITE } from './sites';

captureAttribution();

// Each site in the family re-skins the shared UI through the theme tokens.
const t = SITE.theme;
for (const [k, v] of Object.entries({ ink: t.ink, 'ink-soft': t.inkSoft, go: t.go, mint: t.mint, 'mint-soft': t.mintSoft, paper: t.paper }))
  document.documentElement.style.setProperty(`--color-${k}`, v);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
