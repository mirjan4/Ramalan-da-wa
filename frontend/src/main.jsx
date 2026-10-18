import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Globally prevent mouse wheel from changing input[type="number"] values
if (typeof window !== 'undefined') {
  window.addEventListener(
    'wheel',
    (e) => {
      if (document.activeElement && document.activeElement.tagName === 'INPUT' && document.activeElement.type === 'number') {
        document.activeElement.blur();
      }
    },
    { passive: true }
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
