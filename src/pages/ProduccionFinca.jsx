// src/pages/ProduccionFinca.jsx
import { useState, useEffect } from 'react'
import { ClipboardList, FileDown, Layers, Pencil, Save, Search, Trash2, Warehouse } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../context/AuthContext'
import CatalogoLotesCosecha from '../components/CatalogoLotesCosecha'
import { exportarExcel } from '../utils/exportExcel'

function hoy() { return new Date().toISOString().split('T')[0] }

const FORM_VACIO = {
  loteCosecha: '', fecha: hoy(), jornales: '', caporales: '', cestas: '', totalKilos: '', rendAproximado: '',
}

const COLOR_ESTADO = {
  'Sin iniciar':        'badge-gray',
  'Calentamiento':      'badge-yellow',
  'Ascenso':            'badge-blue',
  'Pico de Producción': 'badge-green',
  'Declive':            'badge-red',
}

const FINCAS = ['7 de Mayo', 'San Juan', 'La Canoa', 'Ojo de Agua', 'El Vado', 'Palmerola']

// ── Modal genérico ─────────────────────────────────────
function Modal({ titulo, onClose, children }) {
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.75rem', width: '100%', maxWidth: 460, animation: 'fadeUp .25s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.75rem', marginBottom: '1.25rem' }}>
          <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '1rem', fontWeight: 700 }}>{titulo}</h3>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize: '1.1rem', padding: '.3rem .6rem' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function ProduccionFinca() {
  const api        = useApi()
  const { toast }  = useToast()
  const { usuario } = useAuth()

  const [tab, setTab] = useState('registrar') // 'registrar' | 'historial' | 'catalogos'

  // Catálogo de lotes
  const [lotes, setLotes]           = useState([])
  const [cargandoLotes, setCL]      = useState(true)

  // Formulario de registro
  const [form, setForm]             = useState(FORM_VACIO)
  const [guardando, setGuardando]   = useState(false)

  // Historial
  const [desde, setDesde]           = useState(hoy())
  const [hasta, setHasta]           = useState(hoy())
  const [loteFiltro, setLoteFiltro] = useState('')
  const [fincaFiltro, setFincaFiltro] = useState('')
  const [registros, setReg]         = useState([])
  const [cargandoHist, setCH]       = useState(false)
  const [buscado, setBuscado]       = useState(false)

  // Modal de edición (para completar Cestas/Kilos/Rendimiento después)
  const [modalEditar, setModalEditar] = useState(null)
  const [formEditar, setFormEditar]   = useState(null)
  const [guardandoEditar, setGE]      = useState(false)

  useEffect(() => { cargarLotes() }, [])
  useEffect(() => { if (tab === 'historial' && !buscado) buscarHistorial() }, [tab])

  async function cargarLotes() {
    setCL(true)
    try {
      const res = await api.get('/produccion-finca/lotes')
      if (res?.ok) setLotes(res.data)
    } finally {
      setCL(false)
    }
  }

  function set(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  async function guardar() {
    if (!form.loteCosecha)            return toast('Selecciona el lote', 'error')
    if (form.jornales === '')         return toast('Los jornales son obligatorios', 'error')
    setGuardando(true)
    try {
      const res = await api.post('/produccion-finca/registros', {
        loteCosecha: form.loteCosecha,
        fecha: form.fecha,
        jornales: Number(form.jornales),
        caporales: Number(form.caporales || 0),
        cestas: form.cestas === '' ? null : Number(form.cestas),
        totalKilos: form.totalKilos === '' ? null : Number(form.totalKilos),
        rendAproximado: form.rendAproximado === '' ? null : Number(form.rendAproximado),
      })
      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')
      toast('✅ Cosecha registrada', 'ok')
      setForm(prev => ({ ...FORM_VACIO, loteCosecha: prev.loteCosecha, fecha: prev.fecha }))
      setBuscado(false)
    } finally {
      setGuardando(false)
    }
  }

  function abrirEditar(r) {
    setFormEditar({
      cestas: r.cestas ?? '', totalKilos: r.totalKilos ?? '', rendAproximado: r.rendAproximado ?? '',
      jornales: r.jornales ?? '', caporales: r.caporales ?? '',
    })
    setModalEditar(r)
  }

  async function guardarEdicion() {
    setGE(true)
    try {
      const res = await api.put(`/produccion-finca/registros/${modalEditar._id}`, {
        jornales: Number(formEditar.jornales),
        caporales: Number(formEditar.caporales || 0),
        cestas: formEditar.cestas === '' ? null : Number(formEditar.cestas),
        totalKilos: formEditar.totalKilos === '' ? null : Number(formEditar.totalKilos),
        rendAproximado: formEditar.rendAproximado === '' ? null : Number(formEditar.rendAproximado),
      })
      if (!res?.ok) return toast(res?.mensaje || 'Error al actualizar', 'error')
      toast('✅ Registro actualizado', 'ok')
      setModalEditar(null)
      buscarHistorial()
    } finally {
      setGE(false)
    }
  }

  async function eliminarRegistro(r) {
    const nombreLote = `${r.loteCosecha?.finca} Lote ${r.loteCosecha?.lote}`
    const fechaTxt = new Date(r.fecha).toLocaleDateString('es-HN')
    if (!window.confirm(`¿Eliminar el registro de ${nombreLote} del ${fechaTxt}? Esta acción no se puede deshacer.`)) return
    const res = await api.del(`/produccion-finca/registros/${r._id}`)
    if (!res?.ok) return toast(res?.mensaje || 'Error al eliminar', 'error')
    toast('✅ Registro eliminado', 'ok')
    buscarHistorial()
  }

  async function buscarHistorial() {
    setCH(true)
    setBuscado(false)
    try {
      const params = new URLSearchParams({ desde, hasta, limite: 300 })
      if (loteFiltro) params.set('loteCosecha', loteFiltro)
      const res = await api.get(`/produccion-finca/registros?${params.toString()}`)
      if (!res?.ok) return toast(res?.mensaje || 'Error', 'error')
      setReg(res.data)
      setBuscado(true)
      if (!res.data.length) toast('Sin registros en ese período', 'info')
    } finally {
      setCH(false)
    }
  }

  function exportarHistorial() {
    const filas = registrosFiltrados.map(r => ({
      Fecha: new Date(r.fecha).toLocaleDateString('es-HN'),
      Finca: r.loteCosecha?.finca ?? '',
      Lote: r.loteCosecha?.lote ?? '',
      'Personal Laborado': r.calculado?.totalPersonal ?? '',
      Cestas: r.cestas ?? '',
      Kilos: r.totalKilos ?? '',
      'Rend. Aproximado': r.rendAproximado ?? '',
      'Cestas/Jornal': r.calculado?.cestasXJornal ?? '',
      'Personal Proyectado': r.calculado?.personalProyectado ?? '',
      'Días Cosecha': r.calculado?.diasCosecha ?? '',
      Estado: r.calculado?.pendiente ? 'Pendiente' : (r.calculado?.estadoLote ?? ''),
    }))
    exportarExcel(filas, `Historial_Cosecha_${desde}_a_${hasta}`)
  }

  const registrosFiltrados = fincaFiltro
    ? registros.filter(r => r.loteCosecha?.finca?.trim().toLowerCase() === fincaFiltro.trim().toLowerCase())
    : registros

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Título */}
      <div className="fade-up">
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '.25rem' }}>Producción Finca</h1>
        <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>Registro y análisis de cosecha por lote</p>
      </div>

      {/* Tabs */}
      <div className="fade-up" style={{ display: 'flex', gap: '.5rem', borderBottom: '1px solid var(--border)' }}>
        {[['registrar', 'Registrar Cosecha', ClipboardList], ['historial', 'Historial', Search], ['catalogos', 'Catálogos', Layers]].map(([key, label, Icon]) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '.4rem',
              padding: '.65rem 1rem', border: 'none', background: 'none', cursor: 'pointer',
              fontFamily: 'Inter, sans-serif', fontSize: '.85rem', fontWeight: tab === key ? 700 : 400,
              color: tab === key ? 'var(--verde)' : 'var(--muted)',
              borderBottom: tab === key ? '2px solid var(--verde)' : '2px solid transparent',
              marginBottom: '-1px', transition: 'all .15s',
            }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ── Registrar ── */}
      {tab === 'registrar' && (
        <div className="card fade-up">
          {cargandoLotes ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}><span className="spinner" /></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 560 }}>
              <div>
                <label className="lbl">Lote *</label>
                <select className="inp" value={form.loteCosecha} onChange={e => set('loteCosecha', e.target.value)}>
                  <option value="">Selecciona...</option>
                  {lotes.map(l => (
                    <option key={l._id} value={l._id}>{l.finca} — Lote {l.lote} ({l.variedad || 's/variedad'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="lbl">Fecha</label>
                <input className="inp" type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label className="lbl">Jornales *</label>
                  <input className="inp" type="number" min="0" value={form.jornales} onChange={e => set('jornales', e.target.value)} />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label className="lbl">Caporales</label>
                  <input className="inp" type="number" min="0" value={form.caporales} onChange={e => set('caporales', e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label className="lbl">Cestas</label>
                  <input className="inp" type="number" min="0" value={form.cestas} onChange={e => set('cestas', e.target.value)} />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label className="lbl">Total Kilos</label>
                  <input className="inp" type="number" step="0.01" min="0" value={form.totalKilos} onChange={e => set('totalKilos', e.target.value)} />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label className="lbl">Rend. Aproximado</label>
                  <input className="inp" type="number" step="0.01" min="0" value={form.rendAproximado} onChange={e => set('rendAproximado', e.target.value)} />
                </div>
              </div>

              <button className="btn-primary" style={{ justifyContent: 'center', marginTop: '.5rem' }}
                onClick={guardar} disabled={guardando}>
                {guardando ? <span className="spinner" /> : <Save size={15} />} Guardar Cosecha
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Historial ── */}
      {tab === 'historial' && (
        <>
          <div className="card fade-up">
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label className="lbl">Desde</label>
                <input className="inp" type="date" value={desde} onChange={e => setDesde(e.target.value)} />
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label className="lbl">Hasta</label>
                <input className="inp" type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <label className="lbl">Finca</label>
                <select className="inp" value={fincaFiltro} onChange={e => setFincaFiltro(e.target.value)}>
                  <option value="">Todas</option>
                  {FINCAS.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label className="lbl">Lote</label>
                <select className="inp" value={loteFiltro} onChange={e => setLoteFiltro(e.target.value)}>
                  <option value="">Todos</option>
                  {lotes.map(l => (
                    <option key={l._id} value={l._id}>{l.finca} — Lote {l.lote}</option>
                  ))}
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
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '.85rem', fontWeight: 600 }}>
                  {registrosFiltrados.length} registros encontrados
                </span>
                <button className="btn-secondary" onClick={exportarHistorial} disabled={!registrosFiltrados.length}>
                  <FileDown size={15} /> Exportar Excel
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Fecha</th><th>Finca / Lote</th><th>Personal Laborado</th>
                      <th>Cestas</th><th>Kilos</th><th>Rend.</th>
                      <th>Cestas/Jornal</th><th>Personal Proy.</th><th>Días Cosecha</th><th>Estado</th>
                      <th style={{ position: 'sticky', right: 0, background: 'var(--card2)', boxShadow: '-4px 0 6px -4px rgba(0,0,0,.15)' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrosFiltrados.map(r => (
                      <tr key={r._id}>
                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.8rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                          {new Date(r.fecha).toLocaleDateString('es-HN')}
                        </td>
                        <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                          {r.loteCosecha?.finca} — {r.loteCosecha?.lote}
                        </td>
                        <td style={{ textAlign: 'center' }}>{r.calculado?.totalPersonal ?? '—'}</td>
                        <td style={{ textAlign: 'center' }}>{r.cestas ?? '—'}</td>
                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>{r.totalKilos ?? '—'}</td>
                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>{r.rendAproximado ?? '—'}</td>
                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>{r.calculado?.cestasXJornal ?? '—'}</td>
                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>{r.calculado?.personalProyectado ?? '—'}</td>
                        <td style={{ textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>{r.calculado?.diasCosecha ?? '—'}</td>
                        <td>
                          {r.calculado?.pendiente ? (
                            <span className="badge badge-gray">Pendiente</span>
                          ) : (
                            <span className={`badge ${COLOR_ESTADO[r.calculado?.estadoLote] || 'badge-gray'}`}>
                              {r.calculado?.estadoLote || '—'}
                            </span>
                          )}
                        </td>
                        <td style={{ position: 'sticky', right: 0, background: 'var(--card)', boxShadow: '-4px 0 6px -4px rgba(0,0,0,.15)' }}>
                          <div style={{ display: 'flex', gap: '.25rem' }}>
                            <button className="btn-ghost" style={{ padding: '.35rem .6rem' }} onClick={() => abrirEditar(r)} title="Editar registro">
                              <Pencil size={14} />
                            </button>
                            {usuario?.rol === 'admin' && (
                              <button className="btn-ghost" style={{ padding: '.35rem .6rem', color: 'var(--danger)' }} onClick={() => eliminarRegistro(r)} title="Eliminar registro">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Catálogos ── */}
      {tab === 'catalogos' && (
        <CatalogoLotesCosecha onCambio={cargarLotes} />
      )}

      {/* ── Modal: editar registro ── */}
      {modalEditar && formEditar && (
        <Modal
          titulo={`Editar cosecha — ${modalEditar.loteCosecha?.finca} Lote ${modalEditar.loteCosecha?.lote}`}
          onClose={() => setModalEditar(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ fontSize: '.8rem', color: 'var(--muted)' }}>
              {new Date(modalEditar.fecha).toLocaleDateString('es-HN')}
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <label className="lbl">Jornales</label>
                <input className="inp" type="number" min="0" value={formEditar.jornales}
                  onChange={e => setFormEditar(p => ({ ...p, jornales: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="lbl">Caporales</label>
                <input className="inp" type="number" min="0" value={formEditar.caporales}
                  onChange={e => setFormEditar(p => ({ ...p, caporales: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="lbl">Cestas</label>
              <input className="inp" type="number" min="0" value={formEditar.cestas}
                onChange={e => setFormEditar(p => ({ ...p, cestas: e.target.value }))} />
            </div>
            <div>
              <label className="lbl">Total Kilos</label>
              <input className="inp" type="number" step="0.01" min="0" value={formEditar.totalKilos}
                onChange={e => setFormEditar(p => ({ ...p, totalKilos: e.target.value }))} />
            </div>
            <div>
              <label className="lbl">Rend. Aproximado</label>
              <input className="inp" type="number" step="0.01" min="0" value={formEditar.rendAproximado}
                onChange={e => setFormEditar(p => ({ ...p, rendAproximado: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: '.75rem', marginTop: '.5rem' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setModalEditar(null)}>Cancelar</button>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={guardarEdicion} disabled={guardandoEditar}>
                {guardandoEditar ? <span className="spinner" /> : <Save size={15} />} Guardar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
