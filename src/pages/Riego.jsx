// src/pages/Riego.jsx — Estaciones de Riego
// Control de turnos de riego y fertirriego por estación y lote, con horas,
// horómetro y gasto de diesel (reemplaza la hoja "Control interno gasto de
// combustible estaciones de riego").
import { useState, useEffect, useMemo } from 'react'
import { CalendarClock, ClipboardPlus, Droplets, FileDown, Layers, Pencil, Play, Search, Square, Trash2, BarChart3 } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../context/AuthContext'
import TurnoRiegoModal from '../components/TurnoRiegoModal'
import CatalogoEstacionesRiego from '../components/CatalogoEstacionesRiego'
import { exportarExcel } from '../utils/exportExcel'
import { fechaCorta, hoyLocal, haceDiasLocal } from '../utils/fecha'
import { fmtHoras, fmtNum, fmtDuracion, minutosDesdeInicio, siguienteLote } from '../utils/riego'

const textoProductos = (t) => (t.productos || []).map(p => `${p.nombre}${p.cantidad != null ? ` ${p.cantidad} ${p.unidad}` : ''}`).join(', ')
const KEY_ESTACIONERO = 'riego.ultimoEstacionero'

function leerEstacionero() { try { return localStorage.getItem(KEY_ESTACIONERO) || '' } catch { return '' } }
function guardarEstacionero(n) { try { if (n) localStorage.setItem(KEY_ESTACIONERO, n) } catch { /* sin almacenamiento */ } }

function BadgeTipo({ t }) {
  return <span className={`badge ${t.tipo === 'Fertirriego' ? 'badge-yellow' : 'badge-blue'}`}>{t.tipo === 'Fertirriego' ? '🧪 Fertirriego' : '💧 Riego'}</span>
}

// ── Tarjeta de una estación en el tablero de "Hoy" ─────────────
function TarjetaEstacion({ estacion, turno, ahora, onIniciar, onFinalizar }) {
  const regando = !!turno
  const min = regando ? minutosDesdeInicio(turno, ahora) : null
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', borderColor: regando ? 'var(--verde)' : undefined, borderWidth: regando ? 2 : undefined }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.5rem' }}>
        <div>
          <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>{estacion.finca}</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>Estación {estacion.nombre}</div>
        </div>
        <span className={`badge ${regando ? 'badge-green' : 'badge-gray'}`}>{regando ? '● Regando' : 'Libre'}</span>
      </div>

      {regando ? (
        <>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'DM Mono, monospace', color: 'var(--verde)' }}>
              Lote {turno.lote}{turno.sector && <span style={{ fontSize: '1rem', color: 'var(--text2)', fontWeight: 600 }}> · turno {turno.sector}</span>}
            </div>
            <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '.25rem' }}>
              <BadgeTipo t={turno} />
              <span style={{ fontSize: '.82rem', color: 'var(--text2)' }}>desde las <b>{turno.horaInicio}</b> · {fmtDuracion(min)}</span>
            </div>
            {turno.tipo === 'Fertirriego' && textoProductos(turno) && (
              <div style={{ fontSize: '.8rem', color: 'var(--muted)', marginTop: '.3rem' }}>{textoProductos(turno)}</div>
            )}
            {turno.estacionero && <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: '.2rem' }}>Estacionero: {turno.estacionero}</div>}
          </div>
          <button className="btn-primary" style={{ justifyContent: 'center', minHeight: 46, background: '#dc2626' }} onClick={() => onFinalizar(turno)}>
            <Square size={16} /> Finalizar turno
          </button>
        </>
      ) : (
        <button className="btn-primary" style={{ justifyContent: 'center', minHeight: 46 }} onClick={() => onIniciar(estacion)}>
          <Play size={16} /> Iniciar turno
        </button>
      )}
    </div>
  )
}

// ── Tabla de turnos (Hoy e Historial) ──────────────────────────
function TablaTurnos({ turnos, onEditar, onEliminar, esAdmin, conTotales }) {
  const terminados = turnos.filter(t => t.calculado?.horasTurno != null)
  const horas = terminados.reduce((a, t) => a + t.calculado.horasTurno, 0)
  const conGalones = turnos.filter(t => t.calculado?.galonesGastados != null)
  const galones = conGalones.reduce((a, t) => a + t.calculado.galonesGastados, 0)
  const horasConGalones = conGalones.reduce((a, t) => a + (t.calculado.horasTurno || 0), 0)

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="tbl">
        <thead>
          <tr>
            <th>Fecha</th><th>Estación</th><th>Lote</th><th>Tipo</th><th>Inicio</th><th>Fin</th><th>Horas</th>
            <th>Horómetro</th><th>Diesel (gal)</th><th>Gasto</th><th>Estacionero</th>
            <th style={{ position: 'sticky', right: 0, background: 'var(--card2)', boxShadow: '-4px 0 6px -4px rgba(0,0,0,.15)' }}></th>
          </tr>
        </thead>
        <tbody>
          {turnos.map(t => (
            <tr key={t._id}>
              <td style={{ whiteSpace: 'nowrap', fontSize: '.8rem' }}>
                <span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--muted)' }}>{fechaCorta(t.fecha)}</span>
                <div style={{ fontSize: '.7rem', color: 'var(--muted2)', textTransform: 'capitalize' }}>{fechaCorta(t.fecha, { weekday: 'long' })}</div>
              </td>
              <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{t.estacion?.nombre ?? '—'}</td>
              <td style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {t.lote}
                {t.sector && <div style={{ fontSize: '.7rem', color: 'var(--muted)', fontWeight: 500 }}>turno {t.sector}</div>}
              </td>
              <td>
                <BadgeTipo t={t} />
                {t.productos?.length > 0 && <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginTop: '.2rem' }}>{textoProductos(t)}</div>}
              </td>
              <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>{t.horaInicio}</td>
              <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>
                {t.horaFin || <span className="badge badge-green">En curso</span>}
              </td>
              <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem', fontWeight: 600 }}>{fmtHoras(t.calculado?.horasTurno)}</td>
              <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.78rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                {t.horometroInicial != null || t.horometroFinal != null ? `${t.horometroInicial ?? '—'} → ${t.horometroFinal ?? '—'}` : '—'}
              </td>
              <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.78rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                {t.combustibleInicial != null || t.combustibleFinal != null ? `${t.combustibleInicial ?? '—'} → ${t.combustibleFinal ?? '—'}` : '—'}
              </td>
              <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem', fontWeight: 600, color: 'var(--verde)' }}>
                {t.calculado?.galonesGastados != null ? fmtNum(t.calculado.galonesGastados) : '—'}
              </td>
              <td style={{ fontSize: '.82rem' }}>
                {t.estacionero || '—'}
                {(t.registradoPor || t.modificadoPor) && (
                  <div style={{ fontSize: '.68rem', color: 'var(--muted2)', whiteSpace: 'nowrap' }}>
                    {t.registradoPor && <>reg. {t.registradoPor.nombre}</>}
                    {t.modificadoPor && <> · mod. {t.modificadoPor.nombre}</>}
                  </div>
                )}
              </td>
              <td style={{ position: 'sticky', right: 0, background: 'var(--card)', boxShadow: '-4px 0 6px -4px rgba(0,0,0,.15)' }}>
                <div style={{ display: 'flex', gap: '.25rem' }}>
                  <button className="btn-ghost" style={{ padding: '.35rem .6rem' }} onClick={() => onEditar(t)} title="Editar turno"><Pencil size={14} /></button>
                  {esAdmin && <button className="btn-ghost" style={{ padding: '.35rem .6rem', color: 'var(--danger)' }} onClick={() => onEliminar(t)} title="Eliminar turno"><Trash2 size={14} /></button>}
                </div>
              </td>
            </tr>
          ))}
          {!turnos.length && <tr><td colSpan={12} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>Sin turnos</td></tr>}
        </tbody>
        {conTotales && turnos.length > 0 && (
          <tfoot>
            <tr style={{ background: 'var(--card2)', borderTop: '2px solid var(--border2)', fontWeight: 700 }}>
              <td colSpan={6} style={{ fontSize: '.75rem', textTransform: 'uppercase', color: 'var(--muted)' }}>Totales ({turnos.length} turnos)</td>
              <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.85rem' }}>{fmtHoras(horas)}</td>
              <td></td><td></td>
              <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.85rem', color: 'var(--verde)' }}>
                {conGalones.length ? fmtNum(galones) : '—'}
                {horasConGalones > 0 && <div style={{ fontSize: '.65rem', color: 'var(--muted)', fontWeight: 500 }}>{fmtNum(galones / horasConGalones)} gal/h</div>}
              </td>
              <td></td>
              <td style={{ position: 'sticky', right: 0, background: 'var(--card2)' }}></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

export default function Riego() {
  const api = useApi()
  const { toast } = useToast()
  const { usuario } = useAuth()
  const esAdmin = usuario?.rol === 'admin'
  const puedeCatalogo = usuario?.rol === 'admin' || usuario?.rol === 'supervisor'

  const [tab, setTab] = useState('hoy') // 'hoy' | 'historial' | 'resumen' | 'catalogos'
  const [estaciones, setEstaciones] = useState([])
  const [cargando, setCargando] = useState(true)

  // Hoy
  const [enCurso, setEnCurso] = useState([])
  const [turnosHoy, setTurnosHoy] = useState([])
  const [ahora, setAhora] = useState(new Date())

  // Modal de turno
  const [modal, setModal] = useState(null) // { modo, turno?, estacionId? }
  const [guardando, setGuardando] = useState(false)

  // Historial
  const [desde, setDesde] = useState(haceDiasLocal(6))
  const [hasta, setHasta] = useState(hoyLocal())
  const [estFiltro, setEstFiltro] = useState('')
  const [loteFiltro, setLoteFiltro] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('')
  const [historial, setHistorial] = useState([])
  const [cargandoHist, setCH] = useState(false)
  const [buscado, setBuscado] = useState(false)

  // Resumen
  const [rDesde, setRDesde] = useState(haceDiasLocal(6))
  const [rHasta, setRHasta] = useState(hoyLocal())
  const [resumen, setResumen] = useState(null)
  const [cargandoRes, setCR] = useState(false)

  useEffect(() => { cargarEstaciones(); cargarHoy() }, [])
  useEffect(() => { if (tab === 'historial' && !buscado) buscarHistorial() }, [tab])
  useEffect(() => { if (tab === 'resumen' && !resumen) buscarResumen() }, [tab])
  useEffect(() => { const id = setInterval(() => setAhora(new Date()), 30000); return () => clearInterval(id) }, [])

  async function cargarEstaciones() {
    try {
      const res = await api.get('/riego/estaciones')
      if (res?.ok) setEstaciones(res.data)
    } finally { setCargando(false) }
  }

  async function cargarHoy() {
    const hoy = hoyLocal()
    const [a, b] = await Promise.all([
      api.get('/riego/turnos/en-curso'),
      api.get(`/riego/turnos?desde=${hoy}&hasta=${hoy}&limite=200`),
    ])
    if (a?.ok) setEnCurso(a.data)
    if (b?.ok) setTurnosHoy(b.data)
  }

  function refrescar() { cargarHoy(); setBuscado(false); setResumen(null) }

  async function buscarHistorial() {
    setCH(true); setBuscado(false)
    try {
      const p = new URLSearchParams({ desde, hasta, limite: 1000 })
      if (estFiltro) p.set('estacion', estFiltro)
      if (loteFiltro) p.set('lote', loteFiltro)
      if (tipoFiltro) p.set('tipo', tipoFiltro)
      const res = await api.get(`/riego/turnos?${p.toString()}`)
      if (!res?.ok) return toast(res?.mensaje || 'Error', 'error')
      setHistorial(res.data); setBuscado(true)
      if (!res.data.length) toast('Sin turnos en ese período', 'info')
    } finally { setCH(false) }
  }

  async function buscarResumen() {
    setCR(true)
    try {
      const res = await api.get(`/riego/resumen?desde=${rDesde}&hasta=${rHasta}`)
      if (!res?.ok) return toast(res?.mensaje || 'Error', 'error')
      setResumen(res)
    } finally { setCR(false) }
  }

  // Sugerencias para autocompletar, a partir de lo que ya se ha registrado
  const sugerencias = useMemo(() => {
    const todos = [...turnosHoy, ...historial]
    const productos = new Set(), estacioneros = new Set()
    todos.forEach(t => { (t.productos || []).forEach(p => productos.add(p.nombre)); if (t.estacionero) estacioneros.add(t.estacionero) })
    return { productos: [...productos].sort(), estacioneros: [...estacioneros].sort() }
  }, [turnosHoy, historial])

  // ── Guardar desde el modal ──
  async function alGuardar(f, { siguiente } = {}) {
    const modo = modal.modo
    if (!f.estacion) return toast('Selecciona la estación', 'error')
    if (!f.lote?.trim()) return toast('Selecciona el lote', 'error')
    if (modo !== 'finalizar' && !f.horaInicio) return toast('La hora de inicio es obligatoria', 'error')
    if ((modo === 'finalizar' || modo === 'manual') && !f.horaFin) return toast('La hora de fin es obligatoria', 'error')
    if (f.tipo === 'Fertirriego' && f.productos.some(p => !p.nombre.trim())) return toast('Escribe el nombre de cada producto o quítalo', 'error')

    setGuardando(true)
    try {
      const body = {
        fecha: f.fecha, estacion: f.estacion, lote: f.lote.trim(), sector: f.sector || '', tipo: f.tipo, productos: f.productos,
        horaInicio: f.horaInicio || undefined, horaFin: modo === 'iniciar' ? undefined : (f.horaFin || null),
        rpm: f.rpm, horometroInicial: f.horometroInicial, horometroFinal: f.horometroFinal,
        combustibleInicial: f.combustibleInicial, combustibleFinal: f.combustibleFinal, combustibleAgregado: f.combustibleAgregado,
        estacionero: f.estacionero, observaciones: f.observaciones,
      }
      const res = (modo === 'finalizar' || modo === 'editar')
        ? await api.put(`/riego/turnos/${modal.turno._id}`, body)
        : await api.post('/riego/turnos', body)
      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')
      guardarEstacionero(f.estacionero)

      toast(modo === 'iniciar' ? '💧 Turno iniciado' : modo === 'finalizar' ? '✅ Turno finalizado' : '✅ Turno guardado', 'ok')
      refrescar()

      if (siguiente) {
        // Abre "Iniciar turno" ya lleno: arranca donde terminó este.
        // Si traía sector numerado (10.12) propone el siguiente (10.13) en el mismo lote;
        // si no, propone el siguiente lote de la estación.
        const est = estaciones.find(e => e._id === f.estacion)
        const m = (f.sector || '').match(/^(.*?)(\d+)$/)
        const sigSector = m ? `${m[1]}${String(Number(m[2]) + 1).padStart(m[2].length, '0')}` : ''
        setModal({
          modo: 'iniciar', estacionId: f.estacion,
          prefill: {
            lote: m ? f.lote : siguienteLote(est, f.lote), sector: sigSector,
            tipo: f.tipo, productos: f.productos.map(p => ({ nombre: p.nombre, cantidad: '', unidad: p.unidad })),
            horaInicio: f.horaFin, rpm: f.rpm ?? '',
            horometroInicial: f.horometroFinal ?? '', combustibleInicial: f.combustibleFinal ?? '',
            estacionero: f.estacionero,
          },
        })
      } else {
        setModal(null)
      }
    } finally { setGuardando(false) }
  }

  async function eliminar(t) {
    if (!window.confirm(`¿Eliminar el turno del lote ${t.lote} (estación ${t.estacion?.nombre}) del ${fechaCorta(t.fecha)}? No se puede deshacer.`)) return
    const res = await api.del(`/riego/turnos/${t._id}`)
    if (!res?.ok) return toast(res?.mensaje || 'Error al eliminar', 'error')
    toast('✅ Turno eliminado', 'ok')
    refrescar()
    if (tab === 'historial') buscarHistorial()
  }

  function exportarHistorial() {
    const filas = historial.map(t => ({
      Día: fechaCorta(t.fecha, { weekday: 'long' }), Fecha: fechaCorta(t.fecha),
      Finca: t.estacion?.finca ?? '', Estación: t.estacion?.nombre ?? '', RPM: t.rpm ?? '',
      Lote: t.lote, 'Turno/Sector': t.sector || '', Tipo: t.tipo, Productos: textoProductos(t),
      'Hora Inicio': t.horaInicio || '', 'Hora Fin': t.horaFin || '',
      'Horas Turno': t.calculado?.horasTurno ?? '',
      'Horómetro Inicial': t.horometroInicial ?? '', 'Horómetro Final': t.horometroFinal ?? '', 'Horas Horómetro': t.calculado?.horasHorometro ?? '',
      'Diesel Inicial (gal)': t.combustibleInicial ?? '', 'Diesel Agregado (gal)': t.combustibleAgregado ?? '', 'Diesel Final (gal)': t.combustibleFinal ?? '',
      'Gasto Diesel (gal)': t.calculado?.galonesGastados ?? '', 'Gal/Hora': t.calculado?.galonesPorHora ?? '',
      Estacionero: t.estacionero || '', Observaciones: t.observaciones || '',
      'Registrado por': t.registradoPor?.nombre || '', 'Fecha registro': t.createdAt ? new Date(t.createdAt).toLocaleString('es-HN') : '',
      'Modificado por': t.modificadoPor?.nombre || '', 'Última modificación': t.modificadoPor && t.updatedAt ? new Date(t.updatedAt).toLocaleString('es-HN') : '',
    }))
    const horas = historial.reduce((a, t) => a + (t.calculado?.horasTurno || 0), 0)
    const conG = historial.filter(t => t.calculado?.galonesGastados != null)
    const galones = conG.reduce((a, t) => a + t.calculado.galonesGastados, 0)
    filas.push({
      Día: 'TOTALES', Fecha: `${historial.length} turnos`,
      'Horas Turno': Math.round(horas * 100) / 100,
      'Gasto Diesel (gal)': conG.length ? Math.round(galones * 100) / 100 : '',
    })
    exportarExcel(filas, `Riego_${desde}_a_${hasta}`)
  }

  const enCursoPorEstacion = useMemo(() => Object.fromEntries(enCurso.map(t => [t.estacion?._id, t])), [enCurso])
  const lotesFiltroOpc = useMemo(() => {
    const est = estaciones.find(e => e._id === estFiltro)
    const lista = est ? est.lotes : estaciones.flatMap(e => e.lotes)
    return [...new Set(lista.map(l => l.codigo))]
  }, [estaciones, estFiltro])

  const TABS = [['hoy', 'Hoy', CalendarClock], ['historial', 'Historial', Search], ['resumen', 'Resumen', BarChart3], ['catalogos', 'Catálogos', Layers]]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="fade-up">
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '.25rem' }}>Estaciones de Riego</h1>
        <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>Turnos de riego y fertirriego por estación y lote, con horas y diesel</p>
      </div>

      <div className="fade-up" style={{ display: 'flex', gap: '.5rem', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {TABS.map(([key, label, Icon]) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '.4rem', padding: '.65rem 1rem', border: 'none', background: 'none', cursor: 'pointer',
              fontFamily: 'Inter, sans-serif', fontSize: '.85rem', fontWeight: tab === key ? 700 : 400,
              color: tab === key ? 'var(--verde)' : 'var(--muted)',
              borderBottom: tab === key ? '2px solid var(--verde)' : '2px solid transparent', marginBottom: '-1px',
            }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ── Hoy ── */}
      {tab === 'hoy' && (
        cargando ? <div className="card" style={{ padding: '2rem', textAlign: 'center' }}><span className="spinner" /></div> : (
          <>
            {!estaciones.length ? (
              <div className="card fade-up" style={{ textAlign: 'center', color: 'var(--muted)' }}>
                <Droplets size={28} style={{ marginBottom: '.5rem' }} />
                <p>Todavía no hay estaciones. {puedeCatalogo ? 'Créalas en la pestaña Catálogos.' : 'Pídele a un supervisor que las cree.'}</p>
              </div>
            ) : (
              <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                {estaciones.map(e => (
                  <TarjetaEstacion key={e._id} estacion={e} turno={enCursoPorEstacion[e._id]} ahora={ahora}
                    onIniciar={est => setModal({ modo: 'iniciar', estacionId: est._id })}
                    onFinalizar={t => setModal({ modo: 'finalizar', turno: t })} />
                ))}
              </div>
            )}

            {enCurso.filter(t => !estaciones.some(e => e._id === t.estacion?._id)).map(t => (
              <div key={t._id} className="card" style={{ borderColor: 'var(--warn)' }}>
                Turno abierto en una estación inactiva (Estación {t.estacion?.nombre}, lote {t.lote}).{' '}
                <button className="btn-secondary" onClick={() => setModal({ modo: 'finalizar', turno: t })}>Finalizar</button>
              </div>
            ))}

            <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.75rem' }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '.85rem', fontWeight: 600 }}>Turnos de hoy</span>
                <button className="btn-secondary" onClick={() => setModal({ modo: 'manual' })} disabled={!estaciones.length}>
                  <ClipboardPlus size={15} /> Registrar turno anterior
                </button>
              </div>
              <TablaTurnos turnos={turnosHoy} esAdmin={esAdmin} conTotales
                onEditar={t => setModal({ modo: 'editar', turno: t })} onEliminar={eliminar} />
            </div>
          </>
        )
      )}

      {/* ── Historial ── */}
      {tab === 'historial' && (
        <>
          <div className="card fade-up">
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 140 }}><label className="lbl">Desde</label><input className="inp" type="date" value={desde} onChange={e => setDesde(e.target.value)} /></div>
              <div style={{ flex: 1, minWidth: 140 }}><label className="lbl">Hasta</label><input className="inp" type="date" value={hasta} onChange={e => setHasta(e.target.value)} /></div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label className="lbl">Estación</label>
                <select className="inp" value={estFiltro} onChange={e => { setEstFiltro(e.target.value); setLoteFiltro('') }}>
                  <option value="">Todas</option>
                  {estaciones.map(e => <option key={e._id} value={e._id}>{e.nombre} ({e.finca})</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <label className="lbl">Lote</label>
                <select className="inp" value={loteFiltro} onChange={e => setLoteFiltro(e.target.value)}>
                  <option value="">Todos</option>
                  {lotesFiltroOpc.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 130 }}>
                <label className="lbl">Tipo</label>
                <select className="inp" value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value)}>
                  <option value="">Todos</option><option>Riego</option><option>Fertirriego</option>
                </select>
              </div>
              <button className="btn-primary" onClick={buscarHistorial} disabled={cargandoHist}>
                {cargandoHist ? <span className="spinner" /> : <Search size={15} />} Buscar
              </button>
            </div>
          </div>
          {buscado && (
            <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.75rem' }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '.85rem', fontWeight: 600 }}>{historial.length} turnos encontrados</span>
                <button className="btn-secondary" onClick={exportarHistorial} disabled={!historial.length}><FileDown size={15} /> Exportar Excel</button>
              </div>
              <TablaTurnos turnos={historial} esAdmin={esAdmin} conTotales
                onEditar={t => setModal({ modo: 'editar', turno: t })} onEliminar={eliminar} />
            </div>
          )}
        </>
      )}

      {/* ── Resumen ── */}
      {tab === 'resumen' && (
        <>
          <div className="card fade-up">
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 140 }}><label className="lbl">Desde</label><input className="inp" type="date" value={rDesde} onChange={e => setRDesde(e.target.value)} /></div>
              <div style={{ flex: 1, minWidth: 140 }}><label className="lbl">Hasta</label><input className="inp" type="date" value={rHasta} onChange={e => setRHasta(e.target.value)} /></div>
              <button className="btn-primary" onClick={buscarResumen} disabled={cargandoRes}>
                {cargandoRes ? <span className="spinner" /> : <Search size={15} />} Ver resumen
              </button>
            </div>
          </div>
          {resumen && (
            <>
              <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontFamily: 'Inter, sans-serif', fontSize: '.85rem', fontWeight: 600 }}>Por día y estación</div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="tbl">
                    <thead><tr><th>Fecha</th><th>Estación</th><th>Turnos</th><th>Lotes regados</th><th>Total horas</th><th>Diesel gastado (gal)</th></tr></thead>
                    <tbody>
                      {resumen.porDia.map((d, i) => (
                        <tr key={i}>
                          <td style={{ whiteSpace: 'nowrap', fontFamily: 'DM Mono, monospace', fontSize: '.8rem' }}>{fechaCorta(d.fecha)} <span style={{ color: 'var(--muted2)', textTransform: 'capitalize' }}>{fechaCorta(d.fecha, { weekday: 'short' })}</span></td>
                          <td style={{ fontWeight: 600 }}>{d.estacion}</td>
                          <td style={{ textAlign: 'center' }}>{d.turnos}</td>
                          <td style={{ fontSize: '.85rem' }}>{d.lotes.join(' · ')}{d.fertirriegos > 0 && <span className="badge badge-yellow" style={{ marginLeft: '.4rem' }}>🧪 {d.fertirriegos}</span>}</td>
                          <td style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>{fmtHoras(d.horas)}</td>
                          <td style={{ fontFamily: 'DM Mono, monospace', color: 'var(--verde)', fontWeight: 600 }}>{d.galones != null ? fmtNum(d.galones) : '—'}</td>
                        </tr>
                      ))}
                      {!resumen.porDia.length && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>Sin turnos en ese período</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontFamily: 'Inter, sans-serif', fontSize: '.85rem', fontWeight: 600 }}>Por lote en el período</div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="tbl">
                    <thead><tr><th>Estación</th><th>Lote</th><th>Turnos</th><th>Horas regadas</th><th>Fertirriegos</th><th>Productos</th><th>Último riego</th></tr></thead>
                    <tbody>
                      {resumen.porLote.map((l, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{l.estacion}</td>
                          <td style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>{l.lote}</td>
                          <td style={{ textAlign: 'center' }}>{l.turnos}</td>
                          <td style={{ fontFamily: 'DM Mono, monospace' }}>{fmtHoras(l.horas)}</td>
                          <td style={{ textAlign: 'center' }}>{l.fertirriegos || '—'}</td>
                          <td style={{ fontSize: '.8rem', color: 'var(--muted)' }}>{l.productos.join(', ') || '—'}</td>
                          <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.8rem' }}>{fechaCorta(l.ultimaFecha)}</td>
                        </tr>
                      ))}
                      {!resumen.porLote.length && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>Sin turnos en ese período</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Catálogos ── */}
      {tab === 'catalogos' && (
        <CatalogoEstacionesRiego estaciones={estaciones} puedeEditar={puedeCatalogo} onCambio={cargarEstaciones} />
      )}

      {modal && (
        <TurnoRiegoModal
          key={`${modal.modo}-${modal.turno?._id || ''}-${modal.prefill ? 'p' : ''}`}
          modo={modal.modo} turno={modal.turno} estacionId={modal.estacionId} prefill={modal.prefill}
          estaciones={estaciones} estacioneroGuardado={leerEstacionero()}
          productosSugeridos={sugerencias.productos} estacionerosSugeridos={sugerencias.estacioneros}
          guardando={guardando} onGuardar={alGuardar} onClose={() => setModal(null)} />
      )}
    </div>
  )
}
