// src/pages/Riego.jsx — Estaciones de Riego
// Control de turnos de riego y fertirriego por estación y lote, con horas,
// horómetro y gasto de diesel (reemplaza la hoja "Control interno gasto de
// combustible estaciones de riego").
//
// Esta página es la de oficina/supervisor: el turno se registra con un
// formulario (hora de inicio y fin escritas). El tablero de "Iniciar /
// Finalizar turno" en vivo está en el Modo Tablet (pages/RiegoTablet.jsx).
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Droplets, FileDown, Layers, Search, BarChart3, Tablet } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../context/AuthContext'
import TurnoRiegoModal from '../components/TurnoRiegoModal'
import CatalogoEstacionesRiego from '../components/CatalogoEstacionesRiego'
import { exportarExcel } from '../utils/exportExcel'
import { fechaCorta, hoyLocal, haceDiasLocal } from '../utils/fecha'
import { fmtHoras, fmtNum } from '../utils/riego'
import {
  TablaTurnos, textoProductos, leerEstacionero, guardarEstacionero, validarTurno, bodyTurno, prefillSiguiente,
} from '../components/RiegoComunes'

export default function Riego() {
  const api = useApi()
  const { toast } = useToast()
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const esAdmin = usuario?.rol === 'admin'
  const puedeCatalogo = usuario?.rol === 'admin' || usuario?.rol === 'supervisor'

  const [tab, setTab] = useState('registrar') // 'registrar' | 'historial' | 'resumen' | 'catalogos'
  const [estaciones, setEstaciones] = useState([])
  const [cargando, setCargando] = useState(true)

  // Registrar (formulario en la página)
  const [turnosHoy, setTurnosHoy] = useState([])
  const [formKey, setFormKey] = useState(0)          // cambia → el formulario se limpia
  const [prefillReg, setPrefillReg] = useState(null) // datos para "el turno que sigue"
  const [guardandoReg, setGuardandoReg] = useState(false)

  // Modal de edición
  const [modal, setModal] = useState(null) // { modo: 'editar', turno }
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

  async function cargarEstaciones() {
    try {
      const res = await api.get('/riego/estaciones')
      if (res?.ok) setEstaciones(res.data)
    } finally { setCargando(false) }
  }

  async function cargarHoy() {
    const hoy = hoyLocal()
    const res = await api.get(`/riego/turnos?desde=${hoy}&hasta=${hoy}&limite=200`)
    if (res?.ok) setTurnosHoy(res.data)
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

  // ── Registrar (formulario de la página) ──
  async function alRegistrar(f) {
    const error = validarTurno('manual', f)
    if (error) return toast(error, 'error')
    setGuardandoReg(true)
    try {
      const res = await api.post('/riego/turnos', bodyTurno('manual', f))
      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')
      guardarEstacionero(f.estacionero)
      toast(`✅ Turno guardado — lote ${f.lote}${f.sector ? ` turno ${f.sector}` : ''}, ${f.horaInicio} a ${f.horaFin}`, 'ok')
      refrescar()
      // El formulario queda listo para el siguiente turno de la misma estación y fecha
      setPrefillReg({ ...prefillSiguiente(f, estaciones), fecha: f.fecha })
      setFormKey(k => k + 1)
    } finally { setGuardandoReg(false) }
  }

  function limpiarRegistro() { setPrefillReg(null); setFormKey(k => k + 1) }

  // ── Guardar desde el modal de edición ──
  async function alGuardar(f) {
    const error = validarTurno('editar', f)
    if (error) return toast(error, 'error')
    setGuardando(true)
    try {
      const res = await api.put(`/riego/turnos/${modal.turno._id}`, bodyTurno('editar', f))
      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')
      guardarEstacionero(f.estacionero)
      toast('✅ Turno actualizado', 'ok')
      setModal(null)
      refrescar()
      if (tab === 'historial') buscarHistorial()
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

  const lotesFiltroOpc = useMemo(() => {
    const est = estaciones.find(e => e._id === estFiltro)
    const lista = est ? est.lotes : estaciones.flatMap(e => e.lotes)
    return [...new Set(lista.map(l => l.codigo))]
  }, [estaciones, estFiltro])

  const TABS = [['registrar', 'Registrar Turno', ClipboardList], ['historial', 'Historial', Search], ['resumen', 'Resumen', BarChart3], ['catalogos', 'Catálogos', Layers]]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '.25rem' }}>Estaciones de Riego</h1>
          <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>Turnos de riego y fertirriego por estación y lote, con horas y diesel</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/riego/tablet')}>
          <Tablet size={16} /> Modo Tablet
        </button>
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

      {/* ── Registrar ── */}
      {tab === 'registrar' && (
        cargando ? <div className="card" style={{ padding: '2rem', textAlign: 'center' }}><span className="spinner" /></div> : (
          <>
            {!estaciones.length ? (
              <div className="card fade-up" style={{ textAlign: 'center', color: 'var(--muted)' }}>
                <Droplets size={28} style={{ marginBottom: '.5rem' }} />
                <p>Todavía no hay estaciones. {puedeCatalogo ? 'Créalas en la pestaña Catálogos.' : 'Pídele a un supervisor que las cree.'}</p>
              </div>
            ) : (
              <div className="card">
                {prefillReg && (
                  <p style={{ fontSize: '.8rem', color: 'var(--verde)', background: 'var(--verde-light)', borderRadius: 8, padding: '.5rem .75rem', marginBottom: '1rem' }}>
                    Listo para el siguiente turno: misma estación y fecha, empieza a las {prefillReg.horaInicio || '—'}. Toca <b>Limpiar</b> para empezar en blanco.
                  </p>
                )}
                <TurnoRiegoModal
                  key={`reg-${formKey}`} inline modo="manual"
                  estaciones={estaciones} prefill={prefillReg} estacioneroGuardado={leerEstacionero()}
                  productosSugeridos={sugerencias.productos} estacionerosSugeridos={sugerencias.estacioneros}
                  guardando={guardandoReg} onGuardar={alRegistrar} onClose={limpiarRegistro} />
              </div>
            )}

            <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontFamily: 'Inter, sans-serif', fontSize: '.85rem', fontWeight: 600 }}>
                Turnos de hoy
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
          key={`${modal.modo}-${modal.turno?._id || ''}`}
          modo={modal.modo} turno={modal.turno}
          estaciones={estaciones} estacioneroGuardado={leerEstacionero()}
          productosSugeridos={sugerencias.productos} estacionerosSugeridos={sugerencias.estacioneros}
          guardando={guardando} onGuardar={alGuardar} onClose={() => setModal(null)} />
      )}
    </div>
  )
}
