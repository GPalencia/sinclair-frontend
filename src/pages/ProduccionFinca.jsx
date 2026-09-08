// src/pages/ProduccionFinca.jsx
import { useState, useEffect } from 'react'
import { ClipboardList, Layers, Save, Search, Warehouse } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import CatalogoLotesCosecha from '../components/CatalogoLotesCosecha'

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

export default function ProduccionFinca() {
  const api        = useApi()
  const { toast }  = useToast()

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
  const [registros, setReg]         = useState([])
  const [cargandoHist, setCH]       = useState(false)
  const [buscado, setBuscado]       = useState(false)

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
    if (form.cestas === '')           return toast('Las cestas son obligatorias', 'error')
    if (form.totalKilos === '')       return toast('El total de kilos es obligatorio', 'error')
    setGuardando(true)
    try {
      const res = await api.post('/produccion-finca/registros', {
        loteCosecha: form.loteCosecha,
        fecha: form.fecha,
        jornales: Number(form.jornales),
        caporales: Number(form.caporales || 0),
        cestas: Number(form.cestas),
        totalKilos: Number(form.totalKilos),
        rendAproximado: Number(form.rendAproximado || 0),
      })
      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')
      toast('✅ Cosecha registrada', 'ok')
      setForm(prev => ({ ...FORM_VACIO, loteCosecha: prev.loteCosecha, fecha: prev.fecha }))
      setBuscado(false)
    } finally {
      setGuardando(false)
    }
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
              fontFamily: 'Syne, sans-serif', fontSize: '.85rem', fontWeight: tab === key ? 700 : 400,
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
                  <label className="lbl">Cestas *</label>
                  <input className="inp" type="number" min="0" value={form.cestas} onChange={e => set('cestas', e.target.value)} />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label className="lbl">Total Kilos *</label>
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
              <div style={{ flex: 1, minWidth: 180 }}>
                <label className="lbl">Lote (opcional)</label>
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
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontFamily: 'Syne, sans-serif', fontSize: '.85rem', fontWeight: 600 }}>
                {registros.length} registros encontrados
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Fecha</th><th>Finca / Lote</th><th>Jornales</th><th>Caporales</th>
                      <th>Cestas</th><th>Kilos</th><th>Rend.</th><th>ParametroCesta</th>
                      <th>Cestas/Jornal</th><th>Personal Proy.</th><th>Días Cosecha</th><th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registros.map(r => (
                      <tr key={r._id}>
                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.8rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                          {new Date(r.fecha).toLocaleDateString('es-HN')}
                        </td>
                        <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                          {r.loteCosecha?.finca} — {r.loteCosecha?.lote}
                        </td>
                        <td style={{ textAlign: 'center' }}>{r.jornales}</td>
                        <td style={{ textAlign: 'center' }}>{r.caporales}</td>
                        <td style={{ textAlign: 'center' }}>{r.cestas}</td>
                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>{r.totalKilos}</td>
                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>{r.rendAproximado}</td>
                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem', color: 'var(--verde)', fontWeight: 600 }}>
                          {r.calculado?.parametroCesta}
                        </td>
                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>{r.calculado?.cestasXJornal}</td>
                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>{r.calculado?.personalProyectado}</td>
                        <td style={{ textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>{r.calculado?.diasCosecha ?? '—'}</td>
                        <td>
                          <span className={`badge ${COLOR_ESTADO[r.calculado?.estadoLote] || 'badge-gray'}`}>
                            {r.calculado?.estadoLote || '—'}
                          </span>
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
    </div>
  )
}
