import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './ctx/auth'
import App from './App'
import SwaggerViewer from './pages/SwaggerViewer'
import './style/app.css'

const isSwagger = window.location.pathname === '/swagger-viewer'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isSwagger
      ? <SwaggerViewer />
      : (
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      )
    }
  </StrictMode>,
)
