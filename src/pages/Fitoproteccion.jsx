// src/pages/Fitoproteccion.jsx
import { useState, useEffect } from 'react'
import { BarChart2, Bug, ClipboardList, Layers, Save, Search } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import CatalogosFito from '../components/CatalogosFito'
import AnalisisPlagas from '../components/AnalisisPlagas'

function hoy() { return new Date().toISOString().split('T')[0] }

const FORM_VACIO = {
  loteSembrado: '', plaga: '', fechaMonitoreo: hoy(), nivelFrecuencia: 0,
  manzanasAplicadas: '', observaciones: '', tratamientoAplicado: '', dosis: '',
  metodoAplicacion: '', foto: null,
}

export default function Fitoproteccion() {
  const api        = useApi()
  const { toast }  = useToast()

  const [tab, setTab] = useState('registrar') // 'registrar' | 'historial'

  // Catálogos
  const [lotesSembrados, setLotesSembrados] = useState([])
  const [plagas, setPlagas]                 = useState([])
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true)

  // Formulario de registro
  const [form, setForm]         = useState(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)

  // Historial
  const [desde, setDesde]       = useState(hoy())
  const [hasta, setHasta]       = useState(hoy())
  const [monitoreos, setMon]    = useState([])
  const [cargandoHist, setCargandoHist] = useState(false)
  const [buscado, setBuscado]   = useState(false)

  useEffect(() => { cargarCatalogos() }, [])
  useEffect(() => { if (tab === 'historial' && !buscado) buscarHistorial() }, [tab])

  async function cargarCatalogos() {
    setCargandoCatalogos(true)
    try {
      const [resLotes, resPlagas] = await Promise.all([
        api.get('/fitoproteccion/lotes-sembrados'),
        api.get('/fitoproteccion/plagas'),
      ])
      if (resLotes?.ok)  setLotesSembrados(resLotes.data)
      if (resPlagas?.ok) setPlagas(resPlagas.data)
    } finally {
      setCargandoCatalogos(false)
    }
  }

  function set(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  async function guardar() {
    if (!form.loteSembrado) return toast('Selecciona el lote sembrado', 'error')
    if (!form.plaga)        return toast('Selecciona la plaga o enfermedad', 'error')
    setGuardando(true)
    try {
      const fd = new FormData()
      fd.append('loteSembrado', form.loteSembrado)
      fd.append('plaga', form.plaga)
      fd.append('fechaMonitoreo', form.fechaMonitoreo)
      fd.append('nivelFrecuencia', form.nivelFrecuencia || 0)
      if (form.manzanasAplicadas)  fd.append('manzanasAplicadas', form.manzanasAplicadas)
      if (form.observaciones)      fd.append('observaciones', form.observaciones)
      if (form.tratamientoAplicado) fd.append('tratamientoAplicado', form.tratamientoAplicado)
      if (form.dosis)              fd.append('dosis', form.dosis)
      if (form.metodoAplicacion)   fd.append('metodoAplicacion', form.metodoAplicacion)
      if (form.foto)               fd.append('fotografia', form.foto)

      const res = await api.postForm('/fitoproteccion/monitoreos', fd)
      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')

      toast('✅ Monitoreo registrado', 'ok')
      setForm(FORM_VACIO)
      setBuscado(false)
    } finally {
      setGuardando(false)
    }
  }

  async function buscarHistorial() {
    setCargandoHist(true)
    setBuscado(false)
    try {
      const res = await api.get(`/fitoproteccion/monitoreos?desde=${desde}&hasta=${hasta}&limite=200`)
      if (!res?.ok) return toast(res?.mensaje || 'Error', 'error')
      setMon(res.data)
      setBuscado(true)
      if (!res.data.length) toast('Sin monitoreos en ese período', 'info')
    } finally {
      setCargandoHist(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Título */}
      <div className="fade-up">
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '.25rem' }}>Fitoprotección</h1>
        <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>Monitoreo de plagas y enfermedades por lote</p>
      </div>

      {/* Tabs */}
      <div className="fade-up" style={{ display: 'flex', gap: '.5rem', borderBottom: '1px solid var(--border)' }}>
        {[['registrar', 'Registrar Monitoreo', ClipboardList], ['historial', 'Historial', Search], ['analisis', 'Análisis de Plagas', BarChart2], ['catalogos', 'Catálogos', Layers]].map(([key, label, Icon]) => (
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
          {cargandoCatalogos ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}><span className="spinner" /></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 560 }}>
              <div>
                <label className="lbl">Lote sembrado *</label>
                <select className="inp" value={form.loteSembrado} onChange={e => set('loteSembrado', e.target.value)}>
                  <option value="">Selecciona...</option>
                  {lotesSembrados.map(l => (
                    <option key={l._id} value={l._id}>
                      {l.loteSembrado}{l.cultivo ? ` — ${l.cultivo}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="lbl">Plaga / Enfermedad *</label>
                <select className="inp" value={form.plaga} onChange={e => set('plaga', e.target.value)}>
                  <option value="">Selecciona...</option>
                  <optgroup label="Plagas">
                    {plagas.filter(p => p.tipoPlaga === 'plaga').map(p => (
                      <option key={p._id} value={p._id}>{p.nombre}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Enfermedades">
                    {plagas.filter(p => p.tipoPlaga === 'enfermedad').map(p => (
                      <option key={p._id} value={p._id}>{p.nombre}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label className="lbl">Fecha de monitoreo</label>
                  <input className="inp" type="date" value={form.fechaMonitoreo} onChange={e => set('fechaMonitoreo', e.target.value)} />
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label className="lbl">Nivel / frecuencia</label>
                  <input className="inp" type="number" step="0.01" min="0" value={form.nivelFrecuencia}
                    onChange={e => set('nivelFrecuencia', e.target.value)} />
                </div>
              </div>

              <div>
                <label className="lbl">Manzanas aplicadas</label>
                <input className="inp" type="number" step="0.01" min="0" placeholder="0.00"
                  value={form.manzanasAplicadas} onChange={e => set('manzanasAplicadas', e.target.value)} />
              </div>

              <div>
                <label className="lbl">Observaciones</label>
                <input className="inp" placeholder="Notas del monitoreo..." value={form.observaciones}
                  onChange={e => set('observaciones', e.target.value)} />
              </div>

              <div>
                <label className="lbl">Tratamiento aplicado</label>
                <input className="inp" placeholder="Ej. oxamil" value={form.tratamientoAplicado}
                  onChange={e => set('tratamientoAplicado', e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label className="lbl">Dosis</label>
                  <input className="inp" type="number" step="0.01" min="0" placeholder="0.00"
                    value={form.dosis} onChange={e => set('dosis', e.target.value)} />
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label className="lbl">Método de aplicación</label>
                  <input className="inp" placeholder="Ej. goteo, bomba de motor" value={form.metodoAplicacion}
                    onChange={e => set('metodoAplicacion', e.target.value)} />
                </div>
              </div>

              <div>
                <label className="lbl">Fotografía</label>
                <input className="inp" type="file" accept="image/*" capture="environment"
                  onChange={e => set('foto', e.target.files?.[0] || null)} />
              </div>

              <button className="btn-primary" style={{ justifyContent: 'center', marginTop: '.5rem' }}
                onClick={guardar} disabled={guardando}>
                {guardando ? <span className="spinner" /> : <Save size={15} />} Guardar Monitoreo
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
              <button className="btn-primary" onClick={buscarHistorial} disabled={cargandoHist}>
                {cargandoHist ? <span className="spinner" /> : <Search size={15} />} Buscar
              </button>
            </div>
          </div>

          {buscado && (
            <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontFamily: 'Inter, sans-serif', fontSize: '.85rem', fontWeight: 600 }}>
                {monitoreos.length} monitoreos encontrados
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Lote Sembrado</th>
                      <th>Plaga / Enfermedad</th>
                      <th>Nivel</th>
                      <th>Tratamiento</th>
                      <th>Método</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monitoreos.map(m => (
                      <tr key={m._id}>
                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.8rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                          {new Date(m.fechaMonitoreo).toLocaleDateString('es-HN')}
                        </td>
                        <td style={{ fontWeight: 500 }}>{m.loteSembrado?.loteSembrado || '—'}</td>
                        <td>
                          <span className={`badge ${m.plaga?.tipoPlaga === 'plaga' ? 'badge-red' : 'badge-yellow'}`}>
                            <Bug size={11} /> {m.plaga?.nombre || '—'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>{m.nivelFrecuencia ?? 0}</td>
                        <td style={{ fontSize: '.82rem', color: 'var(--muted)' }}>{m.tratamientoAplicado || '—'}</td>
                        <td style={{ fontSize: '.82rem', color: 'var(--muted)' }}>{m.metodoAplicacion || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Análisis de Plagas ── */}
      {tab === 'analisis' && (
        <AnalisisPlagas />
      )}

      {/* ── Catálogos ── */}
      {tab === 'catalogos' && (
        <CatalogosFito onCambio={cargarCatalogos} />
      )}
    </div>
  )
}
