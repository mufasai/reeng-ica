import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext';
import { SidebarProvider } from './context/SidebarContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <SidebarProvider>
        <App />
      </SidebarProvider>
    </AuthProvider>
  </StrictMode>,
)
