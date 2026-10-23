// src/pages/RiegoTablet.jsx — Riego · Modo Tablet
// Pantalla completa (sin menú) para el estacionero en campo: una tarjeta por
// estación con "Iniciar turno" (la hora de inicio es la de ese momento) y
// "Finalizar turno" (hora fin = ahora), más la opción de seguir enseguida con el
// siguiente turno. Mismo patrón que pages/EstacionTablet.jsx.
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Maximize2, Minimize2, RefreshCw } from 'lucide-react'
import LOGO from '../assets/logo'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import TurnoRiegoModal from '../components/TurnoRiegoModal'
import {
  TarjetaEstacion, TablaTurnos, leerEstacionero, guardarEstacionero, validarTurno, bodyTurno, prefillSiguiente,
} from '../components/RiegoComunes'
import { hoyLocal } from '../utils/fecha'

const ESTILOS = `
.rt-raiz { min-height: 100vh; background: #f1f5f9; font-family: Inter, sans-serif; padding-bottom: 2rem; }
.rt-raiz button { touch-action: manipulation; -webkit-tap-highlight-color: transparent; font-family: inherit; }
.rt-header { background: var(--verde); color: #fff; padding: .75rem 1rem; display: flex; align-items: center; justify-content: space-between; gap: .75rem; position: sticky; top: 0; z-index: 20; }
.rt-icono { background: rgba(255,255,255,.16); border: none; color: #fff; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
.rt-main { padding: 1rem; display: flex; flex-direction: column; gap: 1rem; max-width: 1400px; margin: 0 auto; }
.rt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
.rt-grid .btn-primary { font-size: 1rem; }
`

export default function RiegoTablet() {
  const api = useApi()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [estaciones, setEstaciones] = useState([])
  const [enCurso, setEnCurso] = useState([])
  const [turnosHoy, setTurnosHoy] = useState([])
  const [cargando, setCargando] = useState(true)
  const [ahora, setAhora] = useState(new Date())
  const [modal, setModal] = useState(null) // { modo: 'iniciar'|'finalizar', estacionId?, turno?, prefill? }
  const [guardando, setGuardando] = useState(false)
  const [pantallaCompleta, setPantallaCompleta] = useState(false)

  useEffect(() => { cargarTodo() }, [])
  useEffect(() => { const id = setInterval(() => setAhora(new Date()), 30000); return () => clearInterval(id) }, [])
  useEffect(() => {
    const alCambiar = () => setPantallaCompleta(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', alCambiar)
    return () => document.removeEventListener('fullscreenchange', alCambiar)
  }, [])

  async function cargarTodo() {
    try {
      const hoy = hoyLocal()
      const [e, a, b] = await Promise.all([
        api.get('/riego/estaciones'),
        api.get('/riego/turnos/en-curso'),
        api.get(`/riego/turnos?desde=${hoy}&hasta=${hoy}&limite=200`),
      ])
      if (e?.ok) setEstaciones(e.data)
      if (a?.ok) setEnCurso(a.data)
      if (b?.ok) setTurnosHoy(b.data)
    } finally { setCargando(false) }
  }

  function alternarPantallaCompleta() {
    try {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
      else document.exitFullscreen?.()
    } catch { /* algunos navegadores de tablet no lo permiten */ }
  }

  const enCursoPorEstacion = useMemo(() => Object.fromEntries(enCurso.map(t => [t.estacion?._id, t])), [enCurso])
  const sugerencias = useMemo(() => {
    const productos = new Set(), estacioneros = new Set()
    ;[...turnosHoy, ...enCurso].forEach(t => { (t.productos || []).forEach(p => productos.add(p.nombre)); if (t.estacionero) estacioneros.add(t.estacionero) })
    return { productos: [...productos].sort(), estacioneros: [...estacioneros].sort() }
  }, [turnosHoy, enCurso])

  async function alGuardar(f, { siguiente } = {}) {
    const modo = modal.modo
    const error = validarTurno(modo, f)
    if (error) return toast(error, 'error')
    setGuardando(true)
    try {
      const res = modo === 'finalizar'
        ? await api.put(`/riego/turnos/${modal.turno._id}`, bodyTurno(modo, f))
        : await api.post('/riego/turnos', bodyTurno(modo, f))
      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')
      guardarEstacionero(f.estacionero)
      toast(modo === 'iniciar' ? `💧 Regando lote ${f.lote}` : '✅ Turno finalizado', 'ok')
      cargarTodo()
      if (siguiente) setModal({ modo: 'iniciar', estacionId: f.estacion, prefill: prefillSiguiente(f, estaciones) })
      else setModal(null)
    } finally { setGuardando(false) }
  }

  const regando = enCurso.length

  return (
    <div className="rt-raiz">
      <style>{ESTILOS}</style>

      <div className="rt-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', minWidth: 0 }}>
          <button className="rt-icono" onClick={() => navigate('/riego')} aria-label="Volver"><ArrowLeft size={22} /></button>
          <img src={LOGO} alt="Sinclair" style={{ height: 38, width: 38, objectFit: 'contain' }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, whiteSpace: 'nowrap' }}>Turnos de Riego</div>
            <div style={{ fontSize: '.78rem', opacity: .85, textTransform: 'capitalize' }}>
              {ahora.toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long' })} · {regando} regando ahora
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button className="rt-icono" onClick={cargarTodo} aria-label="Actualizar"><RefreshCw size={20} /></button>
          {document.documentElement.requestFullscreen && (
            <button className="rt-icono" onClick={alternarPantallaCompleta} aria-label="Pantalla completa">
              {pantallaCompleta ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
            </button>
          )}
        </div>
      </div>

      <div className="rt-main">
        {cargando ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}><span className="spinner" /></div>
        ) : !estaciones.length ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--muted)' }}>No hay estaciones activas. Créalas en Riego → Catálogos.</div>
        ) : (
          <div className="rt-grid">
            {estaciones.map(e => (
              <TarjetaEstacion key={e._id} estacion={e} turno={enCursoPorEstacion[e._id]} ahora={ahora}
                onIniciar={est => setModal({ modo: 'iniciar', estacionId: est._id })}
                onFinalizar={t => setModal({ modo: 'finalizar', turno: t })} />
            ))}
          </div>
        )}

        {/* Turnos abiertos en estaciones que ya no están activas */}
        {enCurso.filter(t => !estaciones.some(e => e._id === t.estacion?._id)).map(t => (
          <div key={t._id} className="card" style={{ borderColor: 'var(--warn)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.75rem' }}>
            <span>Turno abierto en la estación {t.estacion?.nombre} (inactiva), lote {t.lote}.</span>
            <button className="btn-secondary" onClick={() => setModal({ modo: 'finalizar', turno: t })}>Finalizar</button>
          </div>
        ))}

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontSize: '.9rem', fontWeight: 700 }}>Turnos de hoy</div>
          <TablaTurnos turnos={turnosHoy} conTotales />
        </div>
      </div>

      {modal && (
        <TurnoRiegoModal
          key={`${modal.modo}-${modal.turno?._id || modal.estacionId}-${modal.prefill ? 'p' : ''}`}
          modo={modal.modo} turno={modal.turno} estacionId={modal.estacionId} prefill={modal.prefill}
          estaciones={estaciones} estacioneroGuardado={leerEstacionero()}
          productosSugeridos={sugerencias.productos} estacionerosSugeridos={sugerencias.estacioneros}
          guardando={guardando} onGuardar={alGuardar} onClose={() => setModal(null)} />
      )}
    </div>
  )
}
