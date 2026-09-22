// src/pages/LaboresCulturales.jsx
import { useState, useEffect } from 'react'
import { ClipboardList, FileDown, Layers, Pencil, Save, Search, Sprout, Trash2 } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../context/AuthContext'
import CatalogosLabores from '../components/CatalogosLabores'
import ComboboxBuscable from '../components/ComboboxBuscable'
import { exportarExcel } from '../utils/exportExcel'

function hoy() { return new Date().toISOString().split('T')[0] }

const FORM_VACIO = {
  lote: '', tipoLabor: '', fecha: hoy(), personal: '', avanceMz: '',
  variedad: '', librasSemilla: '', observaciones: '',
}

const COLOR_ESTADO = { 'Completado': 'badge-green', 'En proceso': 'badge-yellow' }

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

export default function LaboresCulturales() {
  const api        = useApi()
  const { toast }  = useToast()
  const { usuario } = useAuth()

  const [tab, setTab] = useState('registrar') // 'registrar' | 'historial' | 'progreso' | 'catalogos'

  // Catálogos
  const [lotes, setLotes]     = useState([])
  const [tipos, setTipos]     = useState([])
  const [cargandoCat, setCC]  = useState(true)

  // Formulario de registro
  const [form, setForm]           = useState(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)

  // Historial
  const [desde, setDesde]           = useState(hoy())
  const [hasta, setHasta]           = useState(hoy())
  const [loteFiltro, setLoteFiltro] = useState('')
  const [registros, setReg]         = useState([])
  const [cargandoHist, setCH]       = useState(false)
  const [buscado, setBuscado]       = useState(false)

  // Edición
  const [modalEditar, setModalEditar] = useState(null)
  const [formEditar, setFormEditar]   = useState(null)
  const [guardandoEditar, setGE]      = useState(false)

  // Progreso
  const [progreso, setProgreso]         = useState([])
  const [cargandoProgreso, setCP]       = useState(false)
  const [progresoBuscado, setPB]        = useState(false)

  useEffect(() => { cargarCatalogos() }, [])
  useEffect(() => { if (tab === 'historial' && !buscado) buscarHistorial() }, [tab])
  useEffect(() => { if (tab === 'progreso' && !progresoBuscado) buscarProgreso() }, [tab])

  async function cargarCatalogos() {
    setCC(true)
    try {
      const [resLotes, resTipos] = await Promise.all([
        api.get('/labores-culturales/lotes'),
        api.get('/labores-culturales/tipos-labor'),
      ])
      if (resLotes?.ok) setLotes(resLotes.data)
      if (resTipos?.ok) setTipos(resTipos.data)
    } finally {
      setCC(false)
    }
  }

  function set(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  const tipoSel = tipos.find(t => t._id === form.tipoLabor)
  const opcionesLotes = lotes.map(l => ({ value: l._id, label: `${l.finca} — ${l.lote}`, sublabel: `${l.areaMz} Mz` }))

  async function guardar() {
    if (!form.lote)                  return toast('Selecciona el lote', 'error')
    if (!form.tipoLabor)             return toast('Selecciona el tipo de labor', 'error')
    if (form.personal === '')        return toast('El personal es obligatorio', 'error')
    if (form.avanceMz === '')        return toast('El avance en Mz es obligatorio', 'error')
    setGuardando(true)
    try {
      const res = await api.post('/labores-culturales/registros', {
        lote: form.lote,
        tipoLabor: form.tipoLabor,
        fecha: form.fecha,
        personal: Number(form.personal),
        avanceMz: Number(form.avanceMz),
        variedad: form.variedad,
        librasSemilla: form.librasSemilla === '' ? null : Number(form.librasSemilla),
        observaciones: form.observaciones,
      })
      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')
      toast('✅ Labor registrada', 'ok')
      setForm(prev => ({ ...FORM_VACIO, lote: prev.lote, tipoLabor: prev.tipoLabor, fecha: prev.fecha }))
      setBuscado(false)
      setPB(false)
    } finally {
      setGuardando(false)
    }
  }

  async function buscarHistorial() {
    setCH(true)
    setBuscado(false)
    try {
      const params = new URLSearchParams({ desde, hasta, limite: 300 })
      if (loteFiltro) params.set('lote', loteFiltro)
      const res = await api.get(`/labores-culturales/registros?${params.toString()}`)
      if (!res?.ok) return toast(res?.mensaje || 'Error', 'error')
      setReg(res.data)
      setBuscado(true)
      if (!res.data.length) toast('Sin registros en ese período', 'info')
    } finally {
      setCH(false)
    }
  }

  async function buscarProgreso() {
    setCP(true)
    try {
      const res = await api.get('/labores-culturales/progreso')
      if (!res?.ok) return toast(res?.mensaje || 'Error', 'error')
      setProgreso(res.data)
      setPB(true)
    } finally {
      setCP(false)
    }
  }

  function abrirEditar(r) {
    setFormEditar({
      fecha: new Date(r.fecha).toISOString().split('T')[0],
      personal: r.personal ?? '', avanceMz: r.avanceMz ?? '',
      variedad: r.variedad ?? '', librasSemilla: r.librasSemilla ?? '', observaciones: r.observaciones ?? '',
    })
    setModalEditar(r)
  }

  async function guardarEdicion() {
    setGE(true)
    try {
      const res = await api.put(`/labores-culturales/registros/${modalEditar._id}`, {
        fecha: formEditar.fecha,
        personal: Number(formEditar.personal),
        avanceMz: Number(formEditar.avanceMz),
        variedad: formEditar.variedad,
        librasSemilla: formEditar.librasSemilla === '' ? null : Number(formEditar.librasSemilla),
        observaciones: formEditar.observaciones,
      })
      if (!res?.ok) return toast(res?.mensaje || 'Error al actualizar', 'error')
      toast('✅ Registro actualizado', 'ok')
      setModalEditar(null)
      buscarHistorial()
      setPB(false)
    } finally {
      setGE(false)
    }
  }

  async function eliminarRegistro(r) {
    const nombreLote = `${r.lote?.finca} ${r.lote?.lote}`
    const fechaTxt = new Date(r.fecha).toLocaleDateString('es-HN')
    if (!window.confirm(`¿Eliminar el registro de ${nombreLote} del ${fechaTxt}? Esta acción no se puede deshacer.`)) return
    const res = await api.del(`/labores-culturales/registros/${r._id}`)
    if (!res?.ok) return toast(res?.mensaje || 'Error al eliminar', 'error')
    toast('✅ Registro eliminado', 'ok')
    buscarHistorial()
    setPB(false)
  }

  function exportarHistorial() {
    const filas = registros.map(r => ({
      Fecha: new Date(r.fecha).toLocaleDateString('es-HN'),
      Finca: r.lote?.finca ?? '',
      Lote: r.lote?.lote ?? '',
      'Tipo de Labor': r.tipoLabor?.nombre ?? '',
      Personal: r.personal ?? '',
      'Avance (Mz)': r.avanceMz ?? '',
      Variedad: r.variedad || '',
      'Libras Semilla': r.librasSemilla ?? '',
      'Avance Acumulado (Mz)': r.calculado?.avanceAcumulado ?? '',
      '% Completado': r.calculado?.porcentaje ?? '',
      Estado: r.calculado?.estado ?? '',
    }))
    exportarExcel(filas, `Historial_Labores_${desde}_a_${hasta}`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Título */}
      <div className="fade-up">
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '.25rem' }}>Labores Culturales</h1>
        <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>Siembras y labores de campo por lote</p>
      </div>

      {/* Tabs */}
      <div className="fade-up" style={{ display: 'flex', gap: '.5rem', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {[['registrar', 'Registrar Labor', ClipboardList], ['historial', 'Historial', Search], ['progreso', 'Progreso', Sprout], ['catalogos', 'Catálogos', Layers]].map(([key, label, Icon]) => (
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
          {cargandoCat ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}><span className="spinner" /></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 560 }}>
              <div>
                <label className="lbl">Lote *</label>
                <ComboboxBuscable
                  options={opcionesLotes}
                  value={form.lote}
                  onChange={v => set('lote', v)}
                  placeholder="Busca por finca o lote..."
                />
              </div>

              <div>
                <label className="lbl">Tipo de labor *</label>
                <select className="inp" value={form.tipoLabor} onChange={e => set('tipoLabor', e.target.value)}>
                  <option value="">Selecciona...</option>
                  {tipos.map(t => (
                    <option key={t._id} value={t._id}>{t.nombre}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label className="lbl">Fecha</label>
                  <input className="inp" type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label className="lbl">Personal *</label>
                  <input className="inp" type="number" min="0" value={form.personal} onChange={e => set('personal', e.target.value)} />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label className="lbl">Avance (Mz) *</label>
                  <input className="inp" type="number" step="0.01" min="0" value={form.avanceMz} onChange={e => set('avanceMz', e.target.value)} />
                </div>
              </div>

              {tipoSel?.requiereVariedad && (
                <div>
                  <label className="lbl">Variedad</label>
                  <input className="inp" placeholder="Ej. Americana" value={form.variedad} onChange={e => set('variedad', e.target.value)} />
                </div>
              )}

              {tipoSel?.requiereLibrasSemilla && (
                <div>
                  <label className="lbl">Libras de semilla</label>
                  <input className="inp" type="number" step="0.01" min="0" value={form.librasSemilla} onChange={e => set('librasSemilla', e.target.value)} />
                </div>
              )}

              <div>
                <label className="lbl">Observaciones</label>
                <input className="inp" value={form.observaciones} onChange={e => set('observaciones', e.target.value)} />
              </div>

              <button className="btn-primary" style={{ justifyContent: 'center', marginTop: '.5rem' }}
                onClick={guardar} disabled={guardando}>
                {guardando ? <span className="spinner" /> : <Save size={15} />} Guardar
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
              <div style={{ flex: 1, minWidth: 220 }}>
                <label className="lbl">Lote</label>
                <ComboboxBuscable
                  options={[{ value: '', label: 'Todos' }, ...opcionesLotes]}
                  value={loteFiltro}
                  onChange={setLoteFiltro}
                  placeholder="Busca por finca o lote..."
                />
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
                  {registros.length} registros encontrados
                </span>
                <button className="btn-secondary" onClick={exportarHistorial} disabled={!registros.length}>
                  <FileDown size={15} /> Exportar Excel
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Fecha</th><th>Finca / Lote</th><th>Labor</th><th>Personal</th>
                      <th>Avance (Mz)</th><th>Variedad</th><th>Acumulado</th><th>%</th><th>Estado</th>
                      <th style={{ position: 'sticky', right: 0, background: 'var(--card2)', boxShadow: '-4px 0 6px -4px rgba(0,0,0,.15)' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {registros.map(r => (
                      <tr key={r._id}>
                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.8rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                          {new Date(r.fecha).toLocaleDateString('es-HN')}
                        </td>
                        <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{r.lote?.finca} — {r.lote?.lote}</td>
                        <td>{r.tipoLabor?.nombre}</td>
                        <td style={{ textAlign: 'center' }}>{r.personal}</td>
                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>{r.avanceMz}</td>
                        <td style={{ fontSize: '.82rem', color: 'var(--muted)' }}>{r.variedad || '—'}</td>
                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem', color: 'var(--verde)', fontWeight: 600 }}>
                          {r.calculado?.avanceAcumulado} / {r.lote?.areaMz}
                        </td>
                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>{r.calculado?.porcentaje}%</td>
                        <td>
                          <span className={`badge ${COLOR_ESTADO[r.calculado?.estado] || 'badge-gray'}`}>
                            {r.calculado?.estado}
                          </span>
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

      {/* ── Progreso ── */}
      {tab === 'progreso' && (
        <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontFamily: 'Inter, sans-serif', fontSize: '.85rem', fontWeight: 600 }}>
            Progreso por lote
          </div>
          {cargandoProgreso ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}><span className="spinner" /></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr><th>Lote</th><th>Labor</th><th>Avanzado (Mz)</th><th>Área (Mz)</th><th>%</th><th>Estado</th><th>Última fecha</th></tr>
                </thead>
                <tbody>
                  {progreso.map((p, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500 }}>{p.lote}</td>
                      <td>{p.tipoLabor}</td>
                      <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>{p.avanceAcumulado}</td>
                      <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>{p.areaMz}</td>
                      <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>{p.porcentaje}%</td>
                      <td>
                        <span className={`badge ${COLOR_ESTADO[p.estado] || 'badge-gray'}`}>{p.estado}</span>
                      </td>
                      <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.8rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                        {p.ultimaFecha ? new Date(p.ultimaFecha).toLocaleDateString('es-HN') : '—'}
                      </td>
                    </tr>
                  ))}
                  {!progreso.length && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>Sin registros aún</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Catálogos ── */}
      {tab === 'catalogos' && (
        <CatalogosLabores onCambioLotes={cargarCatalogos} onCambioTipos={cargarCatalogos} />
      )}

      {/* ── Modal: editar registro ── */}
      {modalEditar && formEditar && (
        <Modal
          titulo={`Editar — ${modalEditar.lote?.finca} ${modalEditar.lote?.lote}`}
          onClose={() => setModalEditar(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="lbl">Fecha</label>
              <input className="inp" type="date" value={formEditar.fecha}
                onChange={e => setFormEditar(p => ({ ...p, fecha: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <label className="lbl">Personal</label>
                <input className="inp" type="number" min="0" value={formEditar.personal}
                  onChange={e => setFormEditar(p => ({ ...p, personal: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="lbl">Avance (Mz)</label>
                <input className="inp" type="number" step="0.01" min="0" value={formEditar.avanceMz}
                  onChange={e => setFormEditar(p => ({ ...p, avanceMz: e.target.value }))} />
              </div>
            </div>
            {modalEditar.tipoLabor?.requiereVariedad && (
              <div>
                <label className="lbl">Variedad</label>
                <input className="inp" value={formEditar.variedad}
                  onChange={e => setFormEditar(p => ({ ...p, variedad: e.target.value }))} />
              </div>
            )}
            {modalEditar.tipoLabor?.requiereLibrasSemilla && (
              <div>
                <label className="lbl">Libras de semilla</label>
                <input className="inp" type="number" step="0.01" min="0" value={formEditar.librasSemilla}
                  onChange={e => setFormEditar(p => ({ ...p, librasSemilla: e.target.value }))} />
              </div>
            )}
            <div>
              <label className="lbl">Observaciones</label>
              <input className="inp" value={formEditar.observaciones}
                onChange={e => setFormEditar(p => ({ ...p, observaciones: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: '.75rem', marginTop: '.5rem', flexWrap: 'wrap' }}>
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
