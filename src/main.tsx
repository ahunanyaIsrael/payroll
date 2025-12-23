import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom'
import { LucidProvider } from './contexts/LucidContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LucidProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </LucidProvider>
  </StrictMode>,
)
