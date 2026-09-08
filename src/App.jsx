// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './hooks/useToast'
import Layout from './components/Layout'
import Login              from './pages/Login'
import Dashboard          from './pages/Dashboard'
import Registro           from './pages/Registro'
import Personal           from './pages/Personal'
import NuevoEmpleado      from './pages/NuevoEmpleado'
import Historial          from './pages/Historial'
import Catalogos          from './pages/Catalogos'
import Usuarios           from './pages/Usuarios'
import Fitoproteccion     from './pages/Fitoproteccion'
import LaboresCulturales  from './pages/LaboresCulturales'
import ProduccionFinca    from './pages/ProduccionFinca'
import EstacionSinclair   from './pages/EstacionSinclair'
import { puedeVerModulo } from './config/modulos'

function RutaProtegida({ children, modulo }) {
  const { usuario, cargando } = useAuth()
  if (cargando) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem', color: 'var(--muted)', fontFamily: 'DM Mono, monospace', fontSize: '.9rem' }}>
      <span className="spinner" /> Iniciando SinclairApp...
    </div>
  )
  if (!usuario) return <Navigate to="/login" replace />
  // Rutas de un módulo restringido (Fitoprotección, Labores Culturales, etc.):
  // si el usuario no tiene ese módulo asignado (y no es admin), lo mandamos al dashboard.
  if (modulo && !puedeVerModulo(usuario, modulo)) return <Navigate to="/dashboard" replace />
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
            <Route path="/registro"  element={<RutaProtegida modulo="planillas"><Registro /></RutaProtegida>} />
            <Route path="/personal"  element={<RutaProtegida modulo="planillas"><Personal /></RutaProtegida>} />
            <Route path="/personal/nuevo" element={<RutaProtegida modulo="planillas"><NuevoEmpleado /></RutaProtegida>} />
            <Route path="/historial" element={<RutaProtegida modulo="planillas"><Historial /></RutaProtegida>} />
            <Route path="/catalogos" element={<RutaProtegida modulo="planillas"><Catalogos /></RutaProtegida>} />
            <Route path="/fitoproteccion"      element={<RutaProtegida modulo="fitoproteccion"><Fitoproteccion /></RutaProtegida>} />
            <Route path="/labores-culturales"  element={<RutaProtegida modulo="laboresCulturales"><LaboresCulturales /></RutaProtegida>} />
            <Route path="/produccion-finca"    element={<RutaProtegida modulo="produccionFinca"><ProduccionFinca /></RutaProtegida>} />
            <Route path="/estacion-sinclair"   element={<RutaProtegida modulo="estacionSinclair"><EstacionSinclair /></RutaProtegida>} />
            <Route path="/usuarios"  element={<RutaProtegida><Usuarios /></RutaProtegida>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
