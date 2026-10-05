// src/pages/EstacionTablet.jsx
// Modo tablet de Estación Sinclair: pantalla completa, todo con un toque.
// Elige la unidad (botones grandes por categoría), escribe los galones en el
// teclado numérico y toca "Despachar". Usa los MISMOS endpoints y los mismos
// campos que la pantalla normal de Estación Sinclair (no hay nada nuevo en el
// backend) — solo cambia la forma de capturar.
import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, Fuel, Maximize2, Minimize2,
  Search, TriangleAlert, X,
} from 'lucide-react'
import LOGO from '../assets/logo'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../context/AuthContext'
import TecladoNumerico, { aplicarTecla } from '../components/TecladoNumerico'
import { hoyLocal, fechaCorta } from '../utils/fecha'

const SIN_MEDIDOR = ['Ninguno', 'Ninguno (temporal)']
const LLAVE_ENCARGADO = 'sinclair_encargado_bomba'

const CATEGORIAS = [
  { key: 'frecuentes',    label: 'Frecuentes',    color: '#16a34a' },
  { key: 'vehiculos',     label: 'Vehículos',     color: '#2563eb' },
  { key: 'tractores',     label: 'Tractores',     color: '#ca8a04' },
  { key: 'riego',         label: 'Riego',         color: '#0891b2' },
  { key: 'estacionarios', label: 'Estacionarios', color: '#475569' },
  { key: 'otros',         label: 'Otros',         color: '#7c3aed' },
  { key: 'todos',         label: 'Todas',         color: '#0f172a' },
]
const COLOR_CAT = Object.fromEntries(CATEGORIAS.map(c => [c.key, c.color]))

const norm = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

// El catálogo trae tipos escritos de varias formas ("Vehiculo" / "Vehículo",
// "Equipo Estacionario - Riego"...) — se agrupan en pocas categorías.
function categoriaDe(m) {
  const t = norm(m.tipo)
  if (t.includes('riego')) return 'riego'
  if (t.includes('tractor') || t.includes('pesado')) return 'tractores'
  if (t.includes('vehiculo') || t.includes('volqueta')) return 'vehiculos'
  if (t.includes('estacionario')) return 'estacionarios'
  return 'otros'
}

const etiquetaMedidor = (m) => (m.tipoMedidor === 'Kilometraje' ? 'Km' : m.tipoMedidor === 'Horometro' ? 'Hrs' : '')
const fmt = (n, dec = 2) => Number(n || 0).toLocaleString('es-HN', { maximumFractionDigits: dec })

export default function EstacionTablet() {
  const api        = useApi()
  const { toast }  = useToast()
  const { usuario } = useAuth()
  const navigate   = useNavigate()
  const panelRef   = useRef(null)

  const [maquinas, setMaquinas]     = useState([])
  const [cargando, setCargando]     = useState(true)
  const [rutas, setRutas]           = useState([])
  const [inventario, setInventario] = useState(null)
  const [recientes, setRecientes]   = useState([])   // últimos despachos: para la última lectura de cada unidad
  const [topIds, setTopIds]         = useState([])   // unidades más despachadas (se fija al cargar, no se reordena)
  const [hoyLista, setHoyLista]     = useState([])   // despachos de hoy (barra inferior)
  const [verHoy, setVerHoy]         = useState(false)

  const [categoria, setCategoria]   = useState('frecuentes')
  const [busqueda, setBusqueda]     = useState('')
  const [seleccionada, setSeleccionada] = useState(null)
  const [galones, setGalones]       = useState('')
  const [lectura, setLectura]       = useState('')
  const [campoActivo, setCampoActivo] = useState('galones')

  const [verExtras, setVerExtras]   = useState(false)
  const [fechaManual, setFechaManual] = useState('')     // vacío = hoy
  const [requisicion, setRequisicion] = useState('')
  const [ruta, setRuta]             = useState('')
  const [encargado, setEncargado]   = useState(() => localStorage.getItem(LLAVE_ENCARGADO) || '')

  const [guardando, setGuardando]   = useState(false)
  const [exito, setExito]           = useState(null)
  const [pantallaCompleta, setPantallaCompleta] = useState(false)

  // ── Carga inicial ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [m, r, inv] = await Promise.all([
        api.get('/estacion-sinclair/maquinaria'),
        api.get('/estacion-sinclair/rutas'),
        api.get('/estacion-sinclair/inventario'),
      ])
      if (m?.ok) setMaquinas(m.data)
      if (r?.ok) setRutas(r.data)
      if (inv?.ok) setInventario(inv.data)
      setCargando(false)
      // Lo demás no bloquea la pantalla: aparece cuando llega
      cargarRecientes()
      cargarHoy()
    })()
    const alCambiarPantalla = () => setPantallaCompleta(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', alCambiarPantalla)
    return () => document.removeEventListener('fullscreenchange', alCambiarPantalla)
  }, [])

  // El encargado por defecto es quien inició sesión; queda guardado en la tablet
  useEffect(() => {
    if (!encargado && usuario?.nombre) setEncargado(usuario.nombre)
  }, [usuario])

  useEffect(() => {
    if (!exito) return
    const t = setTimeout(() => setExito(null), 2600)
    return () => clearTimeout(t)
  }, [exito])

  async function cargarRecientes() {
    const res = await api.get('/estacion-sinclair/despachos?limite=400')
    if (!res?.ok) return
    setRecientes(res.data)
    const frec = {}
    for (const d of res.data) { const id = d.maquinaria?._id || d.maquinaria; if (id) frec[id] = (frec[id] || 0) + 1 }
    setTopIds(Object.entries(frec).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([id]) => id))
  }
  async function cargarHoy() {
    const hoy = hoyLocal()
    const res = await api.get(`/estacion-sinclair/despachos?desde=${hoy}&hasta=${hoy}&limite=200`)
    if (res?.ok) setHoyLista(res.data)
  }
  async function cargarInventario() {
    const res = await api.get('/estacion-sinclair/inventario')
    if (res?.ok) setInventario(res.data)
  }

  // ── Datos derivados ────────────────────────────────────────────
  // ultima = última lectura conocida de cada unidad (para avisar de un dedazo).
  const stats = useMemo(() => {
    const ultima = {}
    for (const d of recientes) {
      const id = d.maquinaria?._id || d.maquinaria
      if (!id) continue
      if (d.lecturaActual != null) {
        const t = new Date(d.fecha).getTime()
        const previo = ultima[id]
        if (!previo || t > previo.t || (t === previo.t && d.lecturaActual > previo.lectura)) {
          ultima[id] = { t, lectura: d.lecturaActual }
        }
      }
    }
    return { ultima }
  }, [recientes])

  const conteos = useMemo(() => {
    const c = { todos: maquinas.length, frecuentes: topIds.length }
    for (const m of maquinas) { const k = categoriaDe(m); c[k] = (c[k] || 0) + 1 }
    return c
  }, [maquinas, topIds])

  const lista = useMemo(() => {
    const q = norm(busqueda).trim()
    const porCodigo = (a, b) => a.codigo.localeCompare(b.codigo, 'es', { numeric: true })
    if (q) return maquinas.filter(m => norm(`${m.codigo} ${m.unidadDestino}`).includes(q)).sort(porCodigo)
    if (categoria === 'frecuentes' && topIds.length) {
      return topIds.map(id => maquinas.find(m => m._id === id)).filter(Boolean)
    }
    if (categoria === 'frecuentes' || categoria === 'todos') return [...maquinas].sort(porCodigo)
    return maquinas.filter(m => categoriaDe(m) === categoria).sort(porCodigo)
  }, [maquinas, busqueda, categoria, topIds])

  const requiereLectura = !!seleccionada && !SIN_MEDIDOR.includes(seleccionada.tipoMedidor)
  const ultimaLectura = seleccionada ? stats.ultima[seleccionada._id]?.lectura : null
  const galonesNum = Number(galones)
  const puedeDespachar = !!seleccionada && galonesNum > 0 && !guardando
  const fechaUsada = fechaManual || hoyLocal()
  const totalHoy = hoyLista.reduce((s, d) => s + (d.cantidadDieselGalones || 0), 0)

  // ── Acciones ───────────────────────────────────────────────────
  function elegirUnidad(m) {
    setSeleccionada(m)
    setGalones('')
    setLectura('')
    setCampoActivo('galones')
    // Solo en pantalla angosta (el panel queda debajo de las unidades); en horizontal ya está a la vista
    if (window.innerWidth < 900) setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  function soltarUnidad() {
    setSeleccionada(null)
    setGalones('')
    setLectura('')
  }

  function tecla(t) {
    if (!seleccionada) return
    if (campoActivo === 'lectura' && requiereLectura) {
      setLectura(v => aplicarTecla(v, t, { maxDecimales: 2, maxLargo: 9 }))
    } else {
      setGalones(v => aplicarTecla(v, t, { maxDecimales: 2, maxLargo: 7 }))
    }
  }

  function cambiarEncargado(v) {
    setEncargado(v)
    localStorage.setItem(LLAVE_ENCARGADO, v)
  }

  function alternarPantallaCompleta() {
    try {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
      else document.exitFullscreen?.()
    } catch { /* algunos navegadores de tablet no lo permiten */ }
  }

  async function despachar() {
    if (!seleccionada) return toast('Toca primero la unidad', 'error')
    if (!(galonesNum > 0)) return toast('Escribe los galones', 'error')

    const lec = lectura === '' ? null : Number(lectura)

    // Avisos contra errores de dedo en el teclado (todos se pueden aceptar)
    if (requiereLectura && lec == null &&
        !window.confirm('Esta unidad lleva medidor y no escribiste la lectura.\n¿Despachar sin lectura?')) {
      setCampoActivo('lectura'); return
    }
    if (lec != null && ultimaLectura != null && lec < ultimaLectura &&
        !window.confirm(`La lectura (${fmt(lec)}) es MENOR que la última registrada (${fmt(ultimaLectura)}).\n¿Es correcta?`)) {
      setCampoActivo('lectura'); return
    }
    if (galonesNum > 500 &&
        !window.confirm(`Escribiste ${fmt(galonesNum)} galones. ¿Es correcto?`)) return
    if (inventario && galonesNum > inventario.existenciaActualGalones &&
        !window.confirm(`Esto es más que la existencia actual (${fmt(inventario.existenciaActualGalones)} gal).\n¿Despachar de todos modos?`)) return

    setGuardando(true)
    try {
      // Mismo payload que el formulario normal de Estación Sinclair
      const res = await api.post('/estacion-sinclair/despachos', {
        maquinaria: seleccionada._id,
        fecha: fechaUsada,
        numeroRequisicion: requisicion,
        lecturaActual: lec,
        cantidadDieselGalones: galonesNum,
        encargadoBomba: encargado,
        ruta,
      })
      if (!res?.ok) return toast(res?.mensaje || 'No se pudo guardar el despacho', 'error')

      setExito({
        codigo: seleccionada.codigo,
        nombre: seleccionada.unidadDestino,
        galones: galonesNum,
        alerta: res.data?.calculado?.alerta,
        rendimiento: res.data?.calculado?.rendimiento,
      })
      // Actualiza "última lectura" y frecuentes sin volver a pedir todo al servidor
      setRecientes(prev => [{ ...res.data, maquinaria: { _id: seleccionada._id } }, ...prev])
      soltarUnidad()
      setRequisicion('')
      setRuta('')
      setFechaManual('')
      cargarInventario()
      cargarHoy()
    } finally {
      setGuardando(false)
    }
  }

  // ── Pantalla ───────────────────────────────────────────────────
  const colorSel = seleccionada ? COLOR_CAT[categoriaDe(seleccionada)] : 'var(--verde)'

  return (
    <div className="pos-raiz">
      <style>{ESTILOS}</style>

      {/* Encabezado */}
      <div className="pos-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', minWidth: 0 }}>
          <button className="pos-icono" onClick={() => navigate('/estacion-sinclair')} aria-label="Volver">
            <ArrowLeft size={22} />
          </button>
          <img src={LOGO} alt="Sinclair" style={{ height: 38, width: 38, objectFit: 'contain' }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, whiteSpace: 'nowrap' }}>Despacho de Diesel</div>
            <div style={{ fontSize: '.78rem', opacity: .85 }}>
              {new Date().toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          {inventario && (
            <div className="pos-existencia">
              <span style={{ fontSize: '.7rem', opacity: .85 }}>EXISTENCIA</span>
              <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 800, fontSize: '1.15rem' }}>
                {fmt(inventario.existenciaActualGalones, 1)} gal
              </span>
            </div>
          )}
          {document.documentElement.requestFullscreen && (
            <button className="pos-icono" onClick={alternarPantallaCompleta} aria-label="Pantalla completa">
              {pantallaCompleta ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
            </button>
          )}
        </div>
      </div>

      <div className="pos-main">
        {/* ── Columna izquierda: elegir unidad ── */}
        <div style={{ minWidth: 0 }}>
          <div className="pos-busqueda">
            <Search size={20} color="#64748b" />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar unidad por código o nombre..."
            />
            {busqueda && (
              <button onClick={() => setBusqueda('')} aria-label="Borrar búsqueda" className="pos-icono-claro"><X size={18} /></button>
            )}
          </div>

          {!busqueda && (
            <div className="pos-categorias">
              {CATEGORIAS.filter(c => c.key === 'todos' || conteos[c.key] > 0).map(c => (
                <button
                  key={c.key}
                  onClick={() => setCategoria(c.key)}
                  className="pos-cat"
                  style={categoria === c.key
                    ? { background: c.color, color: '#fff', borderColor: c.color }
                    : { color: c.color, borderColor: c.color }}
                >
                  {c.label} <span style={{ opacity: .8, fontWeight: 600 }}>{conteos[c.key] ?? 0}</span>
                </button>
              ))}
            </div>
          )}
          {busqueda && (
            <div style={{ fontSize: '.8rem', color: 'var(--muted)', margin: '.25rem 0 .6rem' }}>
              Buscando en todas las unidades — {lista.length} resultado{lista.length === 1 ? '' : 's'}
            </div>
          )}

          {cargando ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}><span className="spinner" /></div>
          ) : !lista.length ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
              No hay unidades para mostrar.
            </div>
          ) : (
            <div className="pos-grid">
              {lista.map(m => {
                const sel = seleccionada?._id === m._id
                const color = COLOR_CAT[categoriaDe(m)]
                const medidor = etiquetaMedidor(m)
                return (
                  <button
                    key={m._id}
                    onClick={() => elegirUnidad(m)}
                    className="pos-tile"
                    style={{
                      borderColor: sel ? 'var(--verde)' : '#e2e8f0',
                      borderLeftColor: color,
                      background: sel ? '#f0fdf4' : '#fff',
                      boxShadow: sel ? '0 0 0 3px rgba(22,163,74,.25)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.4rem' }}>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '.78rem', color: '#64748b', fontWeight: 600 }}>{m.codigo}</span>
                      {medidor && <span className="pos-medidor">{medidor}</span>}
                    </div>
                    <div className="pos-tile-nombre">{m.unidadDestino}</div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Columna derecha: galones + teclado ── */}
        <div className="pos-panel" ref={panelRef}>
          {!seleccionada ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--muted)' }}>
              <Fuel size={46} color="#16a34a" style={{ marginBottom: '.75rem' }} />
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)' }}>Toca una unidad para empezar</div>
              <div style={{ fontSize: '.88rem', marginTop: '.3rem' }}>Después escribe los galones y toca Despachar</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.8rem' }}>
              {/* Unidad elegida */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.5rem', borderLeft: `6px solid ${colorSel}`, paddingLeft: '.75rem' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '.8rem', color: '#64748b', fontWeight: 700 }}>
                    {seleccionada.codigo} · {seleccionada.tipo}
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, lineHeight: 1.2 }}>{seleccionada.unidadDestino}</div>
                </div>
                <button className="pos-icono-claro" onClick={soltarUnidad} aria-label="Cambiar unidad" style={{ flexShrink: 0 }}>
                  <X size={22} />
                </button>
              </div>

              {fechaManual && fechaManual !== hoyLocal() && (
                <div className="pos-aviso">
                  <TriangleAlert size={16} /> Se registrará con fecha {fechaCorta(fechaManual)} (no es hoy)
                </div>
              )}

              {/* Galones */}
              <button
                type="button"
                className="pos-campo"
                onClick={() => setCampoActivo('galones')}
                style={{ borderColor: campoActivo === 'galones' || !requiereLectura ? 'var(--verde)' : '#e2e8f0' }}
              >
                <span className="pos-campo-etiqueta">GALONES</span>
                <span className="pos-campo-valor" style={{ fontSize: '2.6rem' }}>{galones || '0'}</span>
              </button>

              {/* Lectura (solo unidades con medidor) */}
              {requiereLectura && (
                <button
                  type="button"
                  className="pos-campo"
                  onClick={() => setCampoActivo('lectura')}
                  style={{ borderColor: campoActivo === 'lectura' ? 'var(--verde)' : '#e2e8f0' }}
                >
                  <span className="pos-campo-etiqueta">
                    LECTURA {seleccionada.tipoMedidor === 'Kilometraje' ? '(Km)' : '(Horas)'}
                    {ultimaLectura != null && <span style={{ fontWeight: 500, textTransform: 'none' }}> · última: {fmt(ultimaLectura)}</span>}
                  </span>
                  <span className="pos-campo-valor" style={{ fontSize: '1.8rem', color: lectura ? 'var(--text)' : '#94a3b8' }}>{lectura || '—'}</span>
                </button>
              )}

              <TecladoNumerico onTecla={tecla} />

              <button className="pos-despachar" disabled={!puedeDespachar} onClick={despachar}>
                {guardando ? <span className="spinner" /> : <Fuel size={26} />}
                {galonesNum > 0 ? `DESPACHAR ${fmt(galonesNum)} gal` : 'DESPACHAR'}
              </button>

              {/* Más datos (opcionales) */}
              <button className="pos-extras-toggle" onClick={() => setVerExtras(v => !v)}>
                <span>
                  Más datos <span style={{ color: 'var(--muted)', fontWeight: 500 }}>
                    · {encargado || 'sin encargado'}{ruta ? ` · ${ruta}` : ''}
                  </span>
                </span>
                {verExtras ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {verExtras && (
                <div className="pos-extras">
                  <label>Encargado de bomba
                    <input className="inp" value={encargado} onChange={e => cambiarEncargado(e.target.value)} />
                  </label>
                  <label>Requisición
                    <input className="inp" inputMode="numeric" value={requisicion} onChange={e => setRequisicion(e.target.value)} />
                  </label>
                  <label>Ruta
                    <select className="inp" value={ruta} onChange={e => setRuta(e.target.value)}>
                      <option value="">Sin ruta</option>
                      {rutas.map(r => <option key={r._id} value={r.nombre}>{r.nombre}</option>)}
                    </select>
                  </label>
                  <label>Fecha
                    <input className="inp" type="date" value={fechaManual || hoyLocal()}
                      onChange={e => setFechaManual(e.target.value === hoyLocal() ? '' : e.target.value)} />
                  </label>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Barra inferior: despachos de hoy ── */}
      <div className="pos-hoy">
        {verHoy && (
          <div className="pos-hoy-lista">
            {!hoyLista.length ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted)' }}>Todavía no hay despachos hoy.</div>
            ) : hoyLista.map(d => (
              <div key={d._id} className="pos-hoy-fila">
                <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, color: '#64748b', minWidth: 52 }}>{d.maquinaria?.codigo}</span>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.maquinaria?.unidadDestino}</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 800 }}>{fmt(d.cantidadDieselGalones)} gal</span>
              </div>
            ))}
          </div>
        )}
        <button className="pos-hoy-barra" onClick={() => setVerHoy(v => !v)}>
          <span>Hoy: <b>{hoyLista.length}</b> despacho{hoyLista.length === 1 ? '' : 's'}</span>
          <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 800 }}>{fmt(totalHoy, 1)} gal</span>
          {verHoy ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </button>
      </div>

      {/* ── Confirmación grande ── */}
      {exito && (
        <div className="pos-exito" onClick={() => setExito(null)}>
          <div className="pos-exito-caja" style={{ borderColor: exito.alerta === 'Bajo rendimiento' ? '#f59e0b' : '#16a34a' }}>
            <CheckCircle2 size={72} color="#16a34a" />
            <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '.4rem' }}>Despacho registrado</div>
            <div style={{ fontSize: '1rem', color: '#475569', marginTop: '.3rem' }}>{exito.codigo} · {exito.nombre}</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '2.4rem', fontWeight: 800, color: 'var(--verde-dark)', marginTop: '.3rem' }}>
              {fmt(exito.galones)} gal
            </div>
            {exito.alerta === 'Bajo rendimiento' && (
              <div className="pos-aviso" style={{ marginTop: '.8rem', justifyContent: 'center' }}>
                <TriangleAlert size={18} /> Bajo rendimiento{exito.rendimiento != null ? ` (${fmt(exito.rendimiento)})` : ''} — revisar la unidad
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Estilos propios de esta pantalla (prefijo pos-). Todo lo táctil mide >= 56px.
const ESTILOS = `
.pos-raiz { min-height: 100vh; background: #f1f5f9; font-family: Inter, sans-serif; padding-bottom: 4.5rem; }
.pos-raiz button { touch-action: manipulation; -webkit-tap-highlight-color: transparent; font-family: inherit; }
.pos-header { background: var(--verde); color: #fff; padding: .75rem 1rem; display: flex; align-items: center; justify-content: space-between; gap: .75rem; position: sticky; top: 0; z-index: 20; }
.pos-icono { background: rgba(255,255,255,.16); border: none; color: #fff; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
.pos-icono-claro { background: #f1f5f9; border: none; color: #475569; width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.pos-existencia { background: rgba(255,255,255,.16); border-radius: 12px; padding: .3rem .8rem; display: flex; flex-direction: column; align-items: flex-end; line-height: 1.2; }

.pos-main { display: grid; grid-template-columns: 1fr; gap: 1rem; padding: 1rem; }
@media (min-width: 900px) {
  .pos-main { grid-template-columns: minmax(0, 1.5fr) minmax(360px, 1fr); align-items: start; }
  .pos-panel { position: sticky; top: 82px; max-height: calc(100vh - 160px); overflow-y: auto; }
}

.pos-busqueda { display: flex; align-items: center; gap: .6rem; background: #fff; border: 2px solid #e2e8f0; border-radius: 14px; padding: 0 .9rem; min-height: 56px; margin-bottom: .7rem; }
.pos-busqueda input { flex: 1; border: none; outline: none; font-size: 1.05rem; background: transparent; min-width: 0; padding: .8rem 0; }

.pos-categorias { display: flex; flex-wrap: wrap; gap: .5rem; margin-bottom: .7rem; }
.pos-cat { background: #fff; border: 2px solid; border-radius: 999px; padding: .7rem 1.1rem; font-size: .95rem; font-weight: 800; cursor: pointer; white-space: nowrap; min-height: 48px; }

.pos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(155px, 1fr)); gap: .6rem; }
.pos-tile { text-align: left; border: 2px solid #e2e8f0; border-left-width: 7px; border-radius: 14px; padding: .7rem .8rem; min-height: 92px; cursor: pointer; display: flex; flex-direction: column; justify-content: space-between; gap: .35rem; transition: transform .08s; user-select: none; }
.pos-tile:active { transform: scale(.97); }
.pos-tile-nombre { font-size: .95rem; font-weight: 700; color: #0f172a; line-height: 1.2; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.pos-medidor { background: #e2e8f0; color: #334155; border-radius: 6px; font-size: .68rem; font-weight: 800; padding: .1rem .4rem; }

.pos-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 1rem; }
.pos-campo { width: 100%; background: #f8fafc; border: 3px solid #e2e8f0; border-radius: 14px; padding: .55rem .9rem; display: flex; flex-direction: column; align-items: flex-end; cursor: pointer; min-height: 64px; }
.pos-campo-etiqueta { align-self: flex-start; font-size: .72rem; font-weight: 800; color: #64748b; letter-spacing: .06em; }
.pos-campo-valor { font-family: 'DM Mono', monospace; font-weight: 800; color: #0f172a; line-height: 1.1; }

.pos-tecla { height: 64px; background: #fff; border: 2px solid #cbd5e1; border-radius: 14px; font-size: 1.7rem; font-weight: 700; color: #0f172a; cursor: pointer; display: flex; align-items: center; justify-content: center; user-select: none; }
.pos-tecla:active { background: #dcfce7; border-color: #16a34a; }
.pos-tecla-limpiar { height: 50px; font-size: 1rem; color: #64748b; }

.pos-despachar { height: 76px; background: var(--verde); color: #fff; border: none; border-radius: 16px; font-size: 1.3rem; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: .7rem; cursor: pointer; }
.pos-despachar:active:not(:disabled) { background: var(--verde-dark); }
.pos-despachar:disabled { background: #cbd5e1; cursor: not-allowed; }

.pos-extras-toggle { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; min-height: 52px; padding: 0 .9rem; display: flex; align-items: center; justify-content: space-between; font-size: .9rem; font-weight: 700; cursor: pointer; color: #0f172a; text-align: left; gap: .5rem; }
.pos-extras { display: grid; gap: .6rem; }
.pos-extras label { display: flex; flex-direction: column; gap: .25rem; font-size: .78rem; font-weight: 700; color: #64748b; }
.pos-extras .inp { min-height: 52px; font-size: 1rem; }

.pos-aviso { display: flex; align-items: center; gap: .4rem; background: #fffbeb; border: 1px solid #fcd34d; color: #b45309; border-radius: 10px; padding: .5rem .7rem; font-size: .85rem; font-weight: 700; }

@media (max-height: 860px) and (min-width: 900px) {
  .pos-tecla { height: 54px; font-size: 1.5rem; }
  .pos-tecla-limpiar { height: 42px; font-size: 1rem; }
  .pos-despachar { height: 64px; font-size: 1.2rem; }
  .pos-panel .pos-campo-valor { font-size: 2.1rem !important; }
}
.pos-hoy { position: fixed; left: 0; right: 0; bottom: 0; z-index: 25; background: #fff; border-top: 1px solid #cbd5e1; box-shadow: 0 -4px 14px rgba(0,0,0,.08); }
.pos-hoy-barra { width: 100%; min-height: 56px; background: #0f172a; color: #fff; border: none; display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0 1.1rem; font-size: 1rem; cursor: pointer; }
.pos-hoy-lista { max-height: 42vh; overflow-y: auto; }
.pos-hoy-fila { display: flex; align-items: center; gap: .75rem; padding: .7rem 1.1rem; border-bottom: 1px solid #f1f5f9; font-size: .92rem; }

.pos-exito { position: fixed; inset: 0; background: rgba(15,23,42,.55); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.pos-exito-caja { background: #fff; border: 4px solid; border-radius: 22px; padding: 1.6rem 2rem; text-align: center; max-width: 440px; width: 100%; animation: fadeUp .2s ease; display: flex; flex-direction: column; align-items: center; }
`
