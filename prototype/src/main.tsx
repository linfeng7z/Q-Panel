import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/global.css'
import './styles/shell.css'
import './styles/components.css'
import './styles/views.css'
import './styles/motion.css'
import './styles/electron.css'
import App from './App'

if (window.qpanel?.isElectron) document.documentElement.classList.add('electron-runtime')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
