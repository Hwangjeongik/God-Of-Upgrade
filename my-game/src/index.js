import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { TonConnectUIProvider } from '@tonconnect/ui-react';

// 🔒 내 서버 주소에서 직접 공식 신분증(Manifest)을 가져오는 자동 인식 시스템
const manifestUrl = window.location.origin + "/tonconnect-manifest.json";

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <TonConnectUIProvider manifestUrl={manifestUrl}>
    <App />
  </TonConnectUIProvider>
);