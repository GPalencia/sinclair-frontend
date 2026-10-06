// src/pages/PasesTablet.jsx
// Modo tablet de Pases de Salida: pantalla completa, todo con un toque.
//   1) Toca los artículos (botones grandes por categoría, o busca por nombre)
//   2) Escribe la cantidad de cada uno en el teclado numérico
//   3) "Continuar": elige bodega, tipo de movimiento y a quién se autoriza
//   4) "Guardar pase": sale el folio y el PDF; el guardia lo ve al instante en Caseta
// Usa los MISMOS endpoints y campos que la pantalla normal de Pases de Salida
// (no hay nada nuevo en el backend para el pase) — solo cambia la forma de capturar.
import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, ClipboardList, FileText, Maximize2,
  Minimize2, PackageCheck, Search, ShoppingBasket, Trash2, X,
} from 'lucide-react'
import LOGO from '../assets/logo'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../context/AuthContext'
import TecladoNumerico, { aplicarTecla } from '../components/TecladoNumerico'
import { hoyLocal, haceDiasLocal } from '../utils/fecha'

const LLAVE_BODEGA = 'sinclair_pases_bodega'
const PASO_LISTA = 120   // cuántos botones de artículo se dibujan por tanda

const PALETA = ['#2563eb', '#ca8a04', '#0891b2', '#7c3aed', '#dc2626', '#475569', '#db2777', '#ea580c', '#0d9488', '#4f46e5', '#65a30d', '#9333ea']
const COLOR_FRECUENTES = '#16a34a'
const COLOR_TODAS = '#0f172a'
const SIN_CATEGORIA = 'Sin categoría'

const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const fmt = (n, dec = 2) => Number(n || 0).toLocaleString('es-HN', { maximumFractionDigits: dec })

// Las personas y destinos más repetidos de los últimos pases, para tocar en vez de escribir
function topTextos(pases, campo, max = 6) {
  const c = new Map()
  for (const p of pases) {
    const v = (p[campo] || '').trim()
    if (v) c.set(v, (c.get(v) || 0) + 1)
  }
  return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map(([v]) => v)
}

export default function PasesTablet() {
  const api        = useApi()
  const { toast }  = useToast()
  const { usuario } = useAuth()
  const navigate   = useNavigate()
  const panelRef   = useRef(null)
  const eligioCategoria = useRef(false)

  const [articulos, setArticulos] = useState([])
  const [bodegas, setBodegas]     = useState([])
  const [tiposMov, setTiposMov]   = useState([])
  const [cargando, setCargando]   = useState(true)
  const [recientes, setRecientes] = useState([])   // pases de los últimos 90 días (frecuentes y sugerencias)
  const [topIds, setTopIds]       = useState([])   // artículos más sacados (se fija al cargar, no se reordena)
  const [hoyLista, setHoyLista]   = useState([])
  const [verHoy, setVerHoy]       = useState(false)

  const [categoria, setCategoria] = useState('todos')
  const [busqueda, setBusqueda]   = useState('')
  const [limite, setLimite]       = useState(PASO_LISTA)

  // Carrito: [{ articulo, codigo, nombre, unidadMedida, cantidad:'1' }]
  const [carrito, setCarrito]     = useState([])
  const [selId, setSelId]         = useState(null)   // artículo cuya cantidad se está editando
  const [reemplazar, setReemplazar] = useState(false) // la primera tecla borra la cantidad por defecto

  // Datos del pase (paso 2)
  const [verDatos, setVerDatos]   = useState(false)
  const [bodega, setBodega]       = useState(() => localStorage.getItem(LLAVE_BODEGA) || '')
  const [tipoMov, setTipoMov]     = useState('')
  const [autorizadoPara, setAutorizadoPara] = useState('')
  const [destino, setDestino]     = useState('')
  const [transporte, setTransporte] = useState('')
  const [placa, setPlaca]         = useState('')
  const [verMas, setVerMas]       = useState(false)

  const [guardando, setGuardando] = useState(false)
  const [exito, setExito]         = useState(null)   // { folio, id, bodega, items }
  const [pantallaCompleta, setPantallaCompleta] = useState(false)

  // ── Carga inicial ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [a, b, t] = await Promise.all([
        api.get('/pases-salida/articulos'),
        api.get('/pases-salida/bodegas'),
        api.get('/pases-salida/tipos-movimiento'),
      ])
      if (a?.ok) setArticulos(a.data)
      if (b?.ok) {
        setBodegas(b.data)
        // Si la bodega recordada ya no existe, o solo hay una, se resuelve sola
        setBodega(prev => (b.data.some(x => x._id === prev) ? prev : (b.data.length === 1 ? b.data[0]._id : '')))
      }
      if (t?.ok) setTiposMov(t.data)
      setCargando(false)
      cargarRecientes()
      cargarHoy()
    })()
    const alCambiarPantalla = () => setPantallaCompleta(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', alCambiarPantalla)
    return () => document.removeEventListener('fullscreenchange', alCambiarPantalla)
  }, [])

  async function cargarRecientes() {
    const res = await api.get(`/pases-salida/pases?desde=${haceDiasLocal(90)}&hasta=${hoyLocal()}&limite=300`)
    if (!res?.ok) return
    setRecientes(res.data)
    const frec = {}
    for (const p of res.data) for (const it of p.items || []) {
      const id = it.articulo?._id || it.articulo
      if (id) frec[id] = (frec[id] || 0) + 1
    }
    const ids = Object.entries(frec).sort((a, b) => b[1] - a[1]).slice(0, 24).map(([id]) => id)
    setTopIds(ids)
    if (ids.length && !eligioCategoria.current) setCategoria('frecuentes')
  }
  async function cargarHoy() {
    const res = await api.get('/pases-salida/pases/hoy')
    if (res?.ok) setHoyLista(res.data)
  }

  // ── Datos derivados ────────────────────────────────────────────
  const catKey = (a) => a.categoria?.trim() || SIN_CATEGORIA

  const categorias = useMemo(() => {
    const conteo = new Map()
    for (const a of articulos) conteo.set(catKey(a), (conteo.get(catKey(a)) || 0) + 1)
    const nombres = [...conteo.keys()].sort((x, y) => (x === SIN_CATEGORIA) - (y === SIN_CATEGORIA) || x.localeCompare(y, 'es'))
    return nombres.map((n, i) => ({ key: n, label: n, n: conteo.get(n), color: PALETA[i % PALETA.length] }))
  }, [articulos])
  const colorDe = useMemo(() => Object.fromEntries(categorias.map(c => [c.key, c.color])), [categorias])

  const porId = useMemo(() => Object.fromEntries(articulos.map(a => [a._id, a])), [articulos])

  // Índice de búsqueda precalculado: 1,400 artículos × cada tecla no debe sentirse lento
  const indice = useMemo(() => articulos.map(a => ({ a, texto: norm(`${a.codigo} ${a.nombre} ${a.categoria}`) })), [articulos])

  const coincidencias = useMemo(() => {
    const palabras = norm(busqueda).split(/\s+/).filter(Boolean)
    if (palabras.length) return indice.filter(x => palabras.every(p => x.texto.includes(p))).map(x => x.a)
    if (categoria === 'frecuentes') return topIds.map(id => porId[id]).filter(Boolean)
    if (categoria === 'todos') return articulos
    return articulos.filter(a => catKey(a) === categoria)
  }, [busqueda, categoria, indice, articulos, topIds, porId])

  const lista = coincidencias.slice(0, limite)

  const enCarrito = useMemo(() => Object.fromEntries(carrito.map(l => [l.articulo, l])), [carrito])
  const lineaSel = carrito.find(l => l.articulo === selId) || null
  const totalLineas = carrito.length
  const incompletas = carrito.some(l => !(Number(l.cantidad) > 0))

  const faltan = []
  if (!bodega) faltan.push('la bodega')
  if (!tipoMov) faltan.push('el tipo de movimiento')
  if (!autorizadoPara.trim()) faltan.push('a quién se autoriza')

  const sugPersonas  = useMemo(() => topTextos(recientes, 'autorizadoPara'), [recientes])
  const sugDestinos  = useMemo(() => topTextos(recientes, 'destino'), [recientes])
  const porSalir = hoyLista.filter(p => p.estado === 'Autorizado').length

  // ── Acciones ───────────────────────────────────────────────────
  function tocarArticulo(a) {
    setCarrito(prev => {
      const ya = prev.find(l => l.articulo === a._id)
      if (ya) return prev.map(l => l.articulo === a._id ? { ...l, cantidad: String(Math.round((Number(l.cantidad || 0) + 1) * 100) / 100) } : l)
      return [...prev, { articulo: a._id, codigo: a.codigo, nombre: a.nombre, unidadMedida: a.unidadMedida || 'Unidad', cantidad: '1' }]
    })
    setSelId(a._id)
    setReemplazar(true)
  }

  function elegirLinea(id) {
    setSelId(id)
    setReemplazar(true)
  }

  function quitarLinea(id) {
    setCarrito(prev => prev.filter(l => l.articulo !== id))
    if (selId === id) setSelId(null)
  }

  function vaciar() {
    if (carrito.length > 1 && !window.confirm('¿Quitar todos los artículos del pase?')) return
    setCarrito([]); setSelId(null)
  }

  function tecla(t) {
    if (!lineaSel) return
    setCarrito(prev => prev.map(l => {
      if (l.articulo !== selId) return l
      const base = reemplazar ? '' : l.cantidad
      return { ...l, cantidad: aplicarTecla(base, t, { maxDecimales: 2, maxLargo: 7 }) }
    }))
    setReemplazar(false)
  }

  function cambiarUM(valor) {
    setCarrito(prev => prev.map(l => l.articulo === selId ? { ...l, unidadMedida: valor } : l))
  }

  function elegirBodega(id) {
    setBodega(id)
    localStorage.setItem(LLAVE_BODEGA, id)
  }

  function alternarPantallaCompleta() {
    try {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
      else document.exitFullscreen?.()
    } catch { /* algunos navegadores de tablet no lo permiten */ }
  }

  function continuar() {
    if (!carrito.length) return toast('Toca primero los artículos', 'error')
    if (incompletas) return toast('Hay artículos sin cantidad', 'error')
    setVerDatos(true)
  }

  async function abrirPDF(id) {
    // La pestaña se abre ANTES de pedir el PDF: así el bloqueador de ventanas
    // de la tablet no la descarta.
    const ventana = window.open('', '_blank')
    try {
      const blob = await api.requestBlob(`/pases-salida/pases/${id}/pdf`)
      const url = URL.createObjectURL(blob)
      if (ventana) ventana.location.href = url
      else window.location.href = url
    } catch {
      ventana?.close()
      toast('No se pudo abrir el PDF', 'error')
    }
  }

  async function guardar() {
    if (faltan.length) return toast(`Falta ${faltan.join(', ')}`, 'error')
    if (incompletas) return toast('Hay artículos sin cantidad', 'error')
    const grande = carrito.find(l => Number(l.cantidad) > 1000)
    if (grande && !window.confirm(`Escribiste ${fmt(grande.cantidad)} de "${grande.nombre}". ¿Es correcto?`)) return

    setGuardando(true)
    try {
      // Mismo payload que el formulario normal de Pases de Salida
      const res = await api.post('/pases-salida/pases', {
        bodega,
        fecha: hoyLocal(),
        destino,
        autorizadoPara: autorizadoPara.trim(),
        transporte,
        placa,
        tipoMovimiento: tipoMov,
        entregadoPor: usuario?.nombre || '',
        items: carrito.map(l => ({ articulo: l.articulo, cantidad: Number(l.cantidad), unidadMedida: l.unidadMedida })),
      })
      if (!res?.ok) return toast(res?.mensaje || 'No se pudo guardar el pase', 'error')

      setExito({
        folio: res.data.folio,
        id: res.data._id,
        bodega: res.data.bodega?.nombre || bodegas.find(b => b._id === bodega)?.nombre || '',
        autorizadoPara: autorizadoPara.trim(),
        lineas: carrito.length,
      })
      setVerDatos(false)
      setCarrito([]); setSelId(null)
      setTipoMov(''); setAutorizadoPara(''); setDestino(''); setTransporte(''); setPlaca(''); setVerMas(false)
      cargarHoy()
      cargarRecientes()
    } finally {
      setGuardando(false)
    }
  }

  const colorSel = lineaSel ? (colorDe[catKey(porId[lineaSel.articulo] || {})] || 'var(--verde)') : 'var(--verde)'

  // ── Pantalla ───────────────────────────────────────────────────
  return (
    <div className="pos-raiz">
      <style>{ESTILOS}</style>

      {/* Encabezado */}
      <div className="pos-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', minWidth: 0 }}>
          <button className="pos-icono" onClick={() => navigate('/pases-salida')} aria-label="Volver">
            <ArrowLeft size={22} />
          </button>
          <img src={LOGO} alt="Sinclair" style={{ height: 38, width: 38, objectFit: 'contain' }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, whiteSpace: 'nowrap' }}>Pase de Salida</div>
            <div style={{ fontSize: '.78rem', opacity: .85 }}>
              {new Date().toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          {bodega && bodegas.length > 1 && (
            <div className="pos-existencia">
              <span style={{ fontSize: '.7rem', opacity: .85 }}>BODEGA</span>
              <span style={{ fontWeight: 800, fontSize: '.95rem' }}>{bodegas.find(b => b._id === bodega)?.nombre}</span>
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
        {/* ── Columna izquierda: elegir artículos ── */}
        <div style={{ minWidth: 0 }}>
          <div className="pos-busqueda">
            <Search size={20} color="#64748b" />
            <input
              value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setLimite(PASO_LISTA) }}
              placeholder="Buscar artículo por nombre o código..."
            />
            {busqueda && (
              <button onClick={() => setBusqueda('')} aria-label="Borrar búsqueda" className="pos-icono-claro"><X size={18} /></button>
            )}
          </div>

          {!busqueda && (
            <div className="pos-categorias">
              {topIds.length > 0 && (
                <ChipCategoria activa={categoria === 'frecuentes'} color={COLOR_FRECUENTES} onClick={() => elegirCat('frecuentes')} label="Frecuentes" n={topIds.length} />
              )}
              {categorias.map(c => (
                <ChipCategoria key={c.key} activa={categoria === c.key} color={c.color} onClick={() => elegirCat(c.key)} label={c.label} n={c.n} />
              ))}
              <ChipCategoria activa={categoria === 'todos'} color={COLOR_TODAS} onClick={() => elegirCat('todos')} label="Todos" n={articulos.length} />
            </div>
          )}
          {busqueda && (
            <div style={{ fontSize: '.8rem', color: 'var(--muted)', margin: '.25rem 0 .6rem' }}>
              Buscando en todos los artículos — {coincidencias.length} resultado{coincidencias.length === 1 ? '' : 's'}
            </div>
          )}

          {cargando ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}><span className="spinner" /></div>
          ) : !articulos.length ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
              El catálogo de artículos está vacío. Cárgalo con <b>seedArticulosBodega.js</b> o desde Catálogos.
            </div>
          ) : !lista.length ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
              No hay artículos para mostrar.
            </div>
          ) : (
            <>
              <div className="pos-grid">
                {lista.map(a => {
                  const linea = enCarrito[a._id]
                  const sel = selId === a._id
                  const color = colorDe[catKey(a)] || '#64748b'
                  return (
                    <button
                      key={a._id}
                      onClick={() => tocarArticulo(a)}
                      className="pos-tile"
                      style={{
                        borderColor: sel ? 'var(--verde)' : linea ? '#86efac' : '#e2e8f0',
                        borderLeftColor: color,
                        background: linea ? '#f0fdf4' : '#fff',
                        boxShadow: sel ? '0 0 0 3px rgba(22,163,74,.25)' : 'none',
                        position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.4rem' }}>
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '.74rem', color: '#64748b', fontWeight: 600 }}>{a.codigo || '—'}</span>
                        <span className="pos-medidor">{a.unidadMedida}</span>
                      </div>
                      <div className="pos-tile-nombre">{a.nombre}</div>
                      {linea && <span className="pt-insignia">{fmt(linea.cantidad)}</span>}
                    </button>
                  )
                })}
              </div>
              {coincidencias.length > lista.length && (
                <button className="pt-mas" onClick={() => setLimite(l => l + PASO_LISTA)}>
                  Mostrar más ({coincidencias.length - lista.length} restantes) — o usa el buscador
                </button>
              )}
            </>
          )}
        </div>

        {/* ── Columna derecha: pase actual + cantidad + teclado ── */}
        <div className="pos-panel" ref={panelRef}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.5rem', marginBottom: '.7rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontWeight: 800, fontSize: '1.05rem' }}>
              <ShoppingBasket size={22} color="#16a34a" />
              Pase actual
              {totalLineas > 0 && <span className="pt-contador">{totalLineas}</span>}
            </div>
            {totalLineas > 0 && (
              <button className="pt-link" onClick={vaciar}><Trash2 size={15} /> Vaciar</button>
            )}
          </div>

          {!totalLineas ? (
            <div style={{ textAlign: 'center', padding: '2.2rem 1rem', color: 'var(--muted)' }}>
              <PackageCheck size={46} color="#16a34a" style={{ marginBottom: '.75rem' }} />
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)' }}>Toca un artículo para empezar</div>
              <div style={{ fontSize: '.88rem', marginTop: '.3rem' }}>Después escribe la cantidad y toca Continuar</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.8rem' }}>
              {/* Líneas del pase */}
              <div className="pt-lineas">
                {carrito.map(l => {
                  const activa = l.articulo === selId
                  return (
                    <div key={l.articulo} className="pt-linea" onClick={() => elegirLinea(l.articulo)}
                      style={{ borderColor: activa ? 'var(--verde)' : '#e2e8f0', background: activa ? '#f0fdf4' : '#fff' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="pt-linea-nombre">{l.nombre}</div>
                        <div style={{ fontSize: '.72rem', color: '#64748b', fontFamily: 'DM Mono, monospace' }}>{l.codigo}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: 'DM Mono, monospace', fontWeight: 800, fontSize: '1.15rem', color: Number(l.cantidad) > 0 ? '#0f172a' : '#dc2626' }}>{l.cantidad || '0'}</div>
                        <div style={{ fontSize: '.7rem', color: '#64748b' }}>{l.unidadMedida}</div>
                      </div>
                      <button className="pos-icono-claro" style={{ width: 40, height: 40, flexShrink: 0 }} aria-label={`Quitar ${l.nombre}`}
                        onClick={e => { e.stopPropagation(); quitarLinea(l.articulo) }}>
                        <X size={18} />
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Cantidad del artículo elegido */}
              {lineaSel ? (
                <>
                  <div style={{ display: 'flex', gap: '.5rem', alignItems: 'stretch' }}>
                    <div className="pos-campo" style={{ flex: 1, minWidth: 0, borderColor: 'var(--verde)', borderLeft: `8px solid ${colorSel}` }}>
                      <span className="pos-campo-etiqueta" style={{ maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        CANTIDAD · {lineaSel.nombre}
                      </span>
                      <span className="pos-campo-valor" style={{ fontSize: '2.6rem' }}>{lineaSel.cantidad || '0'}</span>
                    </div>
                    <label className="pt-um">U/M
                      <input className="inp" value={lineaSel.unidadMedida} onChange={e => cambiarUM(e.target.value)} />
                    </label>
                  </div>
                  <TecladoNumerico onTecla={tecla} />
                </>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '.88rem', padding: '.4rem' }}>
                  Toca un artículo de la lista para cambiar su cantidad
                </div>
              )}

              <div className="pt-pegado">
                <button className="pos-despachar" disabled={incompletas} onClick={continuar}>
                  <ClipboardList size={26} />
                  CONTINUAR · {totalLineas} artículo{totalLineas === 1 ? '' : 's'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Botón flotante: en pantalla angosta el panel queda debajo de los artículos */}
      {totalLineas > 0 && (
        <button className="pt-flotante" onClick={() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
          <ShoppingBasket size={22} /> Ver pase ({totalLineas})
        </button>
      )}

      {/* ── Barra inferior: pases de hoy ── */}
      <div className="pos-hoy">
        {verHoy && (
          <div className="pos-hoy-lista">
            {!hoyLista.length ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted)' }}>Todavía no hay pases hoy.</div>
            ) : hoyLista.map(p => (
              <div key={p._id} className="pos-hoy-fila" onClick={() => abrirPDF(p._id)} style={{ cursor: 'pointer' }}>
                <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 800, color: 'var(--verde-dark)', minWidth: 52 }}>#{p.folio}</span>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.autorizadoPara} <span style={{ color: '#64748b' }}>· {p.items?.length || 0} art.</span>
                </span>
                <span className={`badge ${p.estado === 'Despachado' ? 'badge-green' : 'badge-yellow'}`}>{p.estado === 'Despachado' ? 'Salió' : 'Por salir'}</span>
                <FileText size={18} color="#64748b" />
              </div>
            ))}
          </div>
        )}
        <button className="pos-hoy-barra" onClick={() => setVerHoy(v => !v)}>
          <span>Hoy: <b>{hoyLista.length}</b> pase{hoyLista.length === 1 ? '' : 's'}</span>
          <span style={{ fontWeight: 800 }}>{porSalir > 0 ? `${porSalir} por salir` : 'Todos despachados'}</span>
          {verHoy ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
        </button>
      </div>

      {/* ── Paso 2: datos del pase ── */}
      {verDatos && (
        <div className="pt-modal">
          <div className="pt-hoja">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.5rem' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>Datos del pase</div>
              <button className="pos-icono-claro" onClick={() => setVerDatos(false)} aria-label="Cerrar"><X size={22} /></button>
            </div>

            <div className="pt-resumen">
              {carrito.map(l => (
                <div key={l.articulo} style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem' }}>
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.nombre}</span>
                  <b style={{ fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap' }}>{fmt(l.cantidad)} {l.unidadMedida}</b>
                </div>
              ))}
            </div>

            <div>
              <div className="pt-etq">BODEGA *</div>
              <div className="pt-botones">
                {bodegas.map(b => (
                  <button key={b._id} className="pt-opcion" data-activa={bodega === b._id} onClick={() => elegirBodega(b._id)}>{b.nombre}</button>
                ))}
              </div>
            </div>

            <div>
              <div className="pt-etq">TIPO DE MOVIMIENTO *</div>
              <div className="pt-botones">
                {tiposMov.map(t => (
                  <button key={t} className="pt-opcion" data-activa={tipoMov === t} onClick={() => setTipoMov(t)}>{t}</button>
                ))}
              </div>
            </div>

            <div>
              <div className="pt-etq">SE AUTORIZA EL TRASLADO AL SEÑOR(A) *</div>
              {sugPersonas.length > 0 && (
                <div className="pt-botones" style={{ marginBottom: '.5rem' }}>
                  {sugPersonas.map(p => (
                    <button key={p} className="pt-chip" data-activa={autorizadoPara === p} onClick={() => setAutorizadoPara(p)}>{p}</button>
                  ))}
                </div>
              )}
              <input className="inp pt-input" placeholder="Nombre de quien se lleva el material" value={autorizadoPara}
                onChange={e => setAutorizadoPara(e.target.value)} />
            </div>

            <div>
              <div className="pt-etq">DESTINO</div>
              {sugDestinos.length > 0 && (
                <div className="pt-botones" style={{ marginBottom: '.5rem' }}>
                  {sugDestinos.map(d => (
                    <button key={d} className="pt-chip" data-activa={destino === d} onClick={() => setDestino(d)}>{d}</button>
                  ))}
                </div>
              )}
              <input className="inp pt-input" placeholder="A dónde va" value={destino} onChange={e => setDestino(e.target.value)} />
            </div>

            <button className="pos-extras-toggle" onClick={() => setVerMas(v => !v)}>
              <span>Más datos <span style={{ color: 'var(--muted)', fontWeight: 500 }}>· transporte y placa</span></span>
              {verMas ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {verMas && (
              <div className="pos-extras">
                <label>Transporte
                  <input className="inp" value={transporte} onChange={e => setTransporte(e.target.value)} />
                </label>
                <label>Placa
                  <input className="inp" value={placa} onChange={e => setPlaca(e.target.value)} />
                </label>
              </div>
            )}

            <div className="pt-acciones">
              {faltan.length > 0 && (
                <div className="pos-aviso">Falta elegir {faltan.join(', ')}</div>
              )}
              <div style={{ display: 'flex', gap: '.6rem' }}>
                <button className="pt-volver" onClick={() => setVerDatos(false)}>Volver</button>
                <button className="pos-despachar" style={{ flex: 1 }} disabled={guardando || faltan.length > 0} onClick={guardar}>
                  {guardando ? <span className="spinner" /> : <PackageCheck size={26} />}
                  GUARDAR PASE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmación grande ── */}
      {exito && (
        <div className="pos-exito" onClick={() => setExito(null)}>
          <div className="pos-exito-caja" style={{ borderColor: '#16a34a' }} onClick={e => e.stopPropagation()}>
            <CheckCircle2 size={72} color="#16a34a" />
            <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '.4rem' }}>Pase registrado</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '2.6rem', fontWeight: 800, color: 'var(--verde-dark)', marginTop: '.2rem' }}>
              #{exito.folio}
            </div>
            <div style={{ fontSize: '.95rem', color: '#475569', marginTop: '.2rem' }}>
              {exito.autorizadoPara} · {exito.lineas} artículo{exito.lineas === 1 ? '' : 's'}
            </div>
            <div style={{ fontSize: '.85rem', color: '#64748b', marginTop: '.5rem' }}>
              Ya aparece en la pantalla de Caseta
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', width: '100%', marginTop: '1.1rem' }}>
              <button className="pt-volver" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem' }} onClick={() => abrirPDF(exito.id)}>
                <FileText size={20} /> Ver / imprimir PDF
              </button>
              <button className="pos-despachar" style={{ width: '100%', height: 64 }} onClick={() => setExito(null)}>
                NUEVO PASE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  function elegirCat(key) {
    eligioCategoria.current = true
    setCategoria(key)
    setLimite(PASO_LISTA)
  }
}

function ChipCategoria({ activa, color, onClick, label, n }) {
  return (
    <button
      onClick={onClick}
      className="pos-cat"
      style={activa ? { background: color, color: '#fff', borderColor: color } : { color, borderColor: color }}
    >
      {label} <span style={{ opacity: .8, fontWeight: 600 }}>{n}</span>
    </button>
  )
}

// Estilos propios de esta pantalla (prefijos pos- y pt-). Todo lo táctil mide >= 48px.
const ESTILOS = `
.pos-raiz { min-height: 100vh; background: #f1f5f9; font-family: Inter, sans-serif; padding-bottom: 4.5rem; }
.pos-raiz button { touch-action: manipulation; -webkit-tap-highlight-color: transparent; font-family: inherit; }
.pos-header { background: var(--verde); color: #fff; padding: .75rem 1rem; display: flex; align-items: center; justify-content: space-between; gap: .75rem; position: sticky; top: 0; z-index: 20; }
.pos-icono { background: rgba(255,255,255,.16); border: none; color: #fff; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
.pos-icono-claro { background: #f1f5f9; border: none; color: #475569; width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.pos-existencia { background: rgba(255,255,255,.16); border-radius: 12px; padding: .3rem .8rem; display: flex; flex-direction: column; align-items: flex-end; line-height: 1.2; }

.pos-main { display: grid; grid-template-columns: 1fr; gap: 1rem; padding: 1rem; }
@media (min-width: 900px) {
  .pos-main { grid-template-columns: minmax(0, 1.5fr) minmax(380px, 1fr); align-items: start; }
  .pos-panel { position: sticky; top: 82px; max-height: calc(100vh - 160px); overflow-y: auto; }
  .pt-flotante { display: none !important; }
}

.pos-busqueda { display: flex; align-items: center; gap: .6rem; background: #fff; border: 2px solid #e2e8f0; border-radius: 14px; padding: 0 .9rem; min-height: 56px; margin-bottom: .7rem; }
.pos-busqueda input { flex: 1; border: none; outline: none; font-size: 1.05rem; background: transparent; min-width: 0; padding: .8rem 0; }

.pos-categorias { display: flex; flex-wrap: wrap; gap: .5rem; margin-bottom: .7rem; }
.pos-cat { background: #fff; border: 2px solid; border-radius: 999px; padding: .4rem .85rem; font-size: .84rem; font-weight: 800; cursor: pointer; white-space: nowrap; min-height: 44px; flex-shrink: 0; }
@media (max-width: 899px) {
  /* Muchas categorías: una sola fila que se desliza con el dedo */
  .pos-categorias { flex-wrap: nowrap; overflow-x: auto; margin-left: -1rem; margin-right: -1rem; padding: 0 1rem .3rem; scrollbar-width: none; }
  .pos-categorias::-webkit-scrollbar { display: none; }
}

.pos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(165px, 1fr)); gap: .6rem; }
.pos-tile { text-align: left; border: 2px solid #e2e8f0; border-left-width: 7px; border-radius: 14px; padding: .7rem .8rem; min-height: 100px; cursor: pointer; display: flex; flex-direction: column; justify-content: space-between; gap: .35rem; transition: transform .08s; user-select: none; }
.pos-tile:active { transform: scale(.97); }
.pos-tile-nombre { font-size: .92rem; font-weight: 700; color: #0f172a; line-height: 1.2; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.pos-medidor { background: #e2e8f0; color: #334155; border-radius: 6px; font-size: .68rem; font-weight: 800; padding: .1rem .4rem; white-space: nowrap; }
.pt-insignia { position: absolute; top: -9px; right: -9px; background: #16a34a; color: #fff; border-radius: 999px; min-width: 30px; height: 30px; padding: 0 .45rem; display: flex; align-items: center; justify-content: center; font-family: 'DM Mono', monospace; font-weight: 800; font-size: .85rem; border: 2px solid #fff; }
.pt-mas { width: 100%; margin-top: .8rem; min-height: 56px; background: #fff; border: 2px dashed #94a3b8; border-radius: 14px; font-size: .95rem; font-weight: 700; color: #334155; cursor: pointer; }

.pos-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 1rem; }
.pt-contador { background: #16a34a; color: #fff; border-radius: 999px; font-size: .8rem; padding: .05rem .55rem; font-weight: 800; }
.pt-link { background: none; border: none; color: #dc2626; font-weight: 700; font-size: .85rem; display: flex; align-items: center; gap: .3rem; cursor: pointer; min-height: 44px; padding: 0 .4rem; }
.pt-lineas { display: flex; flex-direction: column; gap: .45rem; max-height: 220px; overflow-y: auto; }
.pt-linea { display: flex; align-items: center; gap: .6rem; border: 2px solid #e2e8f0; border-radius: 12px; padding: .45rem .6rem; min-height: 58px; cursor: pointer; }
.pt-linea-nombre { font-size: .88rem; font-weight: 700; color: #0f172a; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.pt-um { display: flex; flex-direction: column; gap: .2rem; width: 112px; flex-shrink: 0; font-size: .7rem; font-weight: 800; color: #64748b; letter-spacing: .06em; }
.pt-um .inp { flex: 1; min-height: 48px; font-size: 1rem; text-align: center; padding: 0 .4rem; }
.pt-pegado { position: sticky; bottom: -1rem; background: linear-gradient(to top, #fff 75%, rgba(255,255,255,0)); padding: .6rem 0 .2rem; }

.pos-campo { width: 100%; background: #f8fafc; border: 3px solid #e2e8f0; border-radius: 14px; padding: .55rem .9rem; display: flex; flex-direction: column; align-items: flex-end; cursor: default; min-height: 64px; }
.pos-campo-etiqueta { align-self: flex-start; font-size: .72rem; font-weight: 800; color: #64748b; letter-spacing: .06em; }
.pos-campo-valor { font-family: 'DM Mono', monospace; font-weight: 800; color: #0f172a; line-height: 1.1; }

.pos-tecla { height: 60px; background: #fff; border: 2px solid #cbd5e1; border-radius: 14px; font-size: 1.7rem; font-weight: 700; color: #0f172a; cursor: pointer; display: flex; align-items: center; justify-content: center; user-select: none; }
.pos-tecla:active { background: #dcfce7; border-color: #16a34a; }
.pos-tecla-limpiar { height: 48px; font-size: 1rem; color: #64748b; }

.pos-despachar { height: 72px; background: var(--verde); color: #fff; border: none; border-radius: 16px; font-size: 1.2rem; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: .7rem; cursor: pointer; width: 100%; }
.pos-despachar:active:not(:disabled) { background: var(--verde-dark); }
.pos-despachar:disabled { background: #cbd5e1; cursor: not-allowed; }

.pos-extras-toggle { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; min-height: 52px; padding: 0 .9rem; display: flex; align-items: center; justify-content: space-between; font-size: .9rem; font-weight: 700; cursor: pointer; color: #0f172a; text-align: left; gap: .5rem; width: 100%; }
.pos-extras { display: grid; gap: .6rem; grid-template-columns: 1fr 1fr; }
.pos-extras label { display: flex; flex-direction: column; gap: .25rem; font-size: .78rem; font-weight: 700; color: #64748b; }
.pos-extras .inp { min-height: 52px; font-size: 1rem; }

.pos-aviso { display: flex; align-items: center; gap: .4rem; background: #fffbeb; border: 1px solid #fcd34d; color: #b45309; border-radius: 10px; padding: .5rem .7rem; font-size: .85rem; font-weight: 700; }

@media (max-height: 860px) and (min-width: 900px) {
  .pos-tecla { height: 46px; font-size: 1.4rem; }
  .pos-tecla-limpiar { height: 38px; font-size: .95rem; }
  .pos-despachar { height: 60px; font-size: 1.1rem; }
  .pos-panel { padding: .8rem; max-height: calc(100vh - 150px); top: 78px; }
  .pos-panel .pos-campo-valor { font-size: 1.9rem !important; }
  .pos-panel .pos-campo { min-height: 58px; }
  .pt-lineas { max-height: 130px; }
}
.pt-flotante { position: fixed; right: 1rem; bottom: 4.5rem; z-index: 30; background: #0f172a; color: #fff; border: none; border-radius: 999px; min-height: 56px; padding: 0 1.3rem; display: flex; align-items: center; gap: .6rem; font-size: 1rem; font-weight: 800; box-shadow: 0 6px 18px rgba(0,0,0,.3); cursor: pointer; }

.pos-hoy { position: fixed; left: 0; right: 0; bottom: 0; z-index: 25; background: #fff; border-top: 1px solid #cbd5e1; box-shadow: 0 -4px 14px rgba(0,0,0,.08); }
.pos-hoy-barra { width: 100%; min-height: 56px; background: #0f172a; color: #fff; border: none; display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0 1.1rem; font-size: 1rem; cursor: pointer; }
.pos-hoy-lista { max-height: 42vh; overflow-y: auto; }
.pos-hoy-fila { display: flex; align-items: center; gap: .75rem; padding: .7rem 1.1rem; border-bottom: 1px solid #f1f5f9; font-size: .92rem; min-height: 52px; }

.pt-modal { position: fixed; inset: 0; background: rgba(15,23,42,.55); z-index: 60; display: flex; align-items: flex-end; justify-content: center; }
.pt-hoja { background: #fff; width: 100%; max-width: 720px; max-height: 96vh; overflow-y: auto; border-radius: 22px 22px 0 0; padding: 1.1rem 1.2rem 1.2rem; display: flex; flex-direction: column; gap: 1rem; animation: fadeUp .2s ease; }
.pt-hoja > * { flex-shrink: 0; }
@media (min-width: 900px) { .pt-modal { align-items: center; } .pt-hoja { border-radius: 22px; max-height: 92vh; } }
.pt-resumen { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: .6rem .8rem; font-size: .85rem; display: flex; flex-direction: column; gap: .25rem; max-height: 120px; overflow-y: auto; }
.pt-etq { font-size: .72rem; font-weight: 800; color: #64748b; letter-spacing: .06em; margin-bottom: .4rem; }
.pt-botones { display: flex; flex-wrap: wrap; gap: .5rem; }
.pt-opcion { min-height: 60px; padding: 0 1.1rem; background: #fff; border: 2px solid #cbd5e1; border-radius: 14px; font-size: 1rem; font-weight: 800; color: #0f172a; cursor: pointer; flex: 1 1 150px; }
.pt-opcion[data-activa="true"] { background: var(--verde); border-color: var(--verde); color: #fff; }
.pt-chip { min-height: 48px; padding: 0 1rem; background: #f1f5f9; border: 2px solid #e2e8f0; border-radius: 999px; font-size: .92rem; font-weight: 700; color: #0f172a; cursor: pointer; }
.pt-chip[data-activa="true"] { background: #dcfce7; border-color: var(--verde); color: var(--verde-dark); }
.pt-input { min-height: 56px; font-size: 1.05rem; }
.pt-acciones { position: sticky; bottom: -1.2rem; background: linear-gradient(to top, #fff 80%, rgba(255,255,255,0)); padding-top: .6rem; display: flex; flex-direction: column; gap: .5rem; }
.pt-volver { min-height: 72px; padding: 0 1.4rem; background: #fff; border: 2px solid #cbd5e1; border-radius: 16px; font-size: 1.05rem; font-weight: 800; color: #334155; cursor: pointer; }

.pos-exito { position: fixed; inset: 0; background: rgba(15,23,42,.55); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 1rem; }
.pos-exito-caja { background: #fff; border: 4px solid; border-radius: 22px; padding: 1.6rem 2rem; text-align: center; max-width: 440px; width: 100%; animation: fadeUp .2s ease; display: flex; flex-direction: column; align-items: center; }
`
