// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './hooks/useToast'
import Layout from './components/Layout'
import Login        from './pages/Login'
import Dashboard    from './pages/Dashboard'
import Registro     from './pages/Registro'
import Personal     from './pages/Personal'
import NuevoEmpleado from './pages/NuevoEmpleado'
import Historial    from './pages/Historial'
import Catalogos    from './pages/Catalogos'

function RutaProtegida({ children }) {
  const { usuario, cargando } = useAuth()
  if (cargando) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem', color: 'var(--muted)', fontFamily: 'DM Mono, monospace', fontSize: '.9rem' }}>
      <span className="spinner" /> Iniciando SinclairApp...
    </div>
  )
  if (!usuario) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<RutaProtegida><Dashboard /></RutaProtegida>} />
            <Route path="/registro"  element={<RutaProtegida><Registro /></RutaProtegida>} />
            <Route path="/personal"  element={<RutaProtegida><Personal /></RutaProtegida>} />
            <Route path="/personal/nuevo" element={<RutaProtegida><NuevoEmpleado /></RutaProtegida>} />
            <Route path="/historial" element={<RutaProtegida><Historial /></RutaProtegida>} />
            <Route path="/catalogos" element={<RutaProtegida><Catalogos /></RutaProtegida>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
