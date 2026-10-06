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
import EstacionTablet     from './pages/EstacionTablet'
import PasesSalida        from './pages/PasesSalida'
import PasesTablet        from './pages/PasesTablet'
import Caseta             from './pages/Caseta'
import { puedeVerModulo } from './config/modulos'

function RutaProtegida({ children, modulo, soloAdmin, sinLayout }) {
  const { usuario, cargando } = useAuth()
  if (cargando) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem', color: 'var(--muted)', fontFamily: 'DM Mono, monospace', fontSize: '.9rem' }}>
      <span className="spinner" /> Iniciando SinclairApp...
    </div>
  )
  if (!usuario) return <Navigate to="/login" replace />
  // Rutas exclusivas de admin (ej. Usuarios): cualquier otro rol va al dashboard.
  if (soloAdmin && usuario.rol !== 'admin') return <Navigate to="/dashboard" replace />
  // Rutas de un módulo restringido (Fitoprotección, Labores Culturales, etc.):
  // si el usuario no tiene ese módulo asignado (y no es admin), lo mandamos al dashboard.
  if (modulo && !puedeVerModulo(usuario, modulo)) return <Navigate to="/dashboard" replace />
  // La pantalla de Caseta es de pantalla completa (sin sidebar) para
  // cualquier rol que la visite — es un tablero, no una sección más del menú.
  if (sinLayout) return children
  return <Layout>{children}</Layout>
}

// '/' y '/dashboard' son la entrada por defecto — pero la cuenta de
// caseta (guardia) nunca debe caer en el dashboard, solo en su pantalla.
function InicioSegunRol({ children }) {
  const { usuario, cargando } = useAuth()
  if (cargando) return null
  if (usuario?.rol === 'guardia') return <Navigate to="/caseta" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<InicioSegunRol><Navigate to="/dashboard" replace /></InicioSegunRol>} />
            <Route path="/dashboard" element={<InicioSegunRol><RutaProtegida><Dashboard /></RutaProtegida></InicioSegunRol>} />
            <Route path="/caseta" element={<RutaProtegida modulo="pasesSalida" sinLayout><Caseta /></RutaProtegida>} />
            <Route path="/pases-salida" element={<RutaProtegida modulo="pasesSalida"><PasesSalida /></RutaProtegida>} />
            <Route path="/pases-salida/tablet" element={<RutaProtegida modulo="pasesSalida" sinLayout><PasesTablet /></RutaProtegida>} />
            <Route path="/registro"  element={<RutaProtegida modulo="planillas"><Registro /></RutaProtegida>} />
            <Route path="/personal"  element={<RutaProtegida modulo="planillas"><Personal /></RutaProtegida>} />
            <Route path="/personal/nuevo" element={<RutaProtegida modulo="planillas"><NuevoEmpleado /></RutaProtegida>} />
            <Route path="/historial" element={<RutaProtegida modulo="planillas"><Historial /></RutaProtegida>} />
            <Route path="/catalogos" element={<RutaProtegida modulo="planillas"><Catalogos /></RutaProtegida>} />
            <Route path="/fitoproteccion"      element={<RutaProtegida modulo="fitoproteccion"><Fitoproteccion /></RutaProtegida>} />
            <Route path="/labores-culturales"  element={<RutaProtegida modulo="laboresCulturales"><LaboresCulturales /></RutaProtegida>} />
            <Route path="/produccion-finca"    element={<RutaProtegida modulo="produccionFinca"><ProduccionFinca /></RutaProtegida>} />
            <Route path="/estacion-sinclair"   element={<RutaProtegida modulo="estacionSinclair"><EstacionSinclair /></RutaProtegida>} />
            <Route path="/estacion-sinclair/tablet" element={<RutaProtegida modulo="estacionSinclair" sinLayout><EstacionTablet /></RutaProtegida>} />
            <Route path="/usuarios"  element={<RutaProtegida soloAdmin><Usuarios /></RutaProtegida>} />
            <Route path="*" element={<InicioSegunRol><Navigate to="/dashboard" replace /></InicioSegunRol>} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
