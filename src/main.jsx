import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    beforeSend(event) {
      if (event.request?.data) {
        const data = event.request.data;
        if (typeof data === 'object') {
          if (data.pdfBase64) data.pdfBase64 = '[REDACTED]';
          if (data.memo) data.memo = '[REDACTED]';
        }
      }
      if (event.contexts?.state) {
        event.contexts.state = '[REDACTED]';
      }
      return event;
    },
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      'Network request failed',
    ],
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={({ resetError }) => (
        <div style={{ padding: 32, textAlign: 'center', fontFamily: 'Noto Sans JP, sans-serif' }}>
          <h1 style={{ marginBottom: 12 }}>申し訳ありません、エラーが発生しました</h1>
          <p style={{ marginBottom: 24, color: '#666' }}>ページを再読み込みしてもう一度お試しください。</p>
          <button onClick={resetError} style={{ padding: '10px 24px', cursor: 'pointer' }}>再試行</button>
        </div>
      )}
    >
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
