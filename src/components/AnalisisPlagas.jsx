// src/components/AnalisisPlagas.jsx
import { useState, useEffect } from 'react'
import { BarChart2, Search, TrendingUp } from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Dot
} from 'recharts'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'

// Verde (controlado) → rojo (crítico), relativo al máximo del set actual
function colorPorNivel(valor, max) {
  if (!max) return '#22c55e'
  const t = Math.min(valor / max, 1)
  const r = Math.round(34  + t * (239 - 34))
  const g = Math.round(197 + t * (68  - 197))
  const b = Math.round(94  + t * (68  - 94))
  return `rgb(${r},${g},${b})`
}

const fechaCorta = f => new Date(f).toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit' })

const TooltipComparacion = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{ background: 'var(--card2)', border: '1px solid var(--border2)', borderRadius: 8, padding: '.75rem 1rem', fontSize: '.8rem' }}>
      <div style={{ color: 'var(--text)', fontWeight: 600, marginBottom: '.35rem' }}>{label}</div>
      <div style={{ color: 'var(--muted)' }}>Tipo: <strong style={{ color: 'var(--text)' }}>{d.tipo}</strong></div>
      <div style={{ color: 'var(--muted)' }}>Promedio: <strong style={{ color: 'var(--text)' }}>{d.promedio}</strong></div>
      <div style={{ color: 'var(--muted)' }}>Último nivel: <strong style={{ color: 'var(--text)' }}>{d.ultimoNivel}</strong></div>
      <div style={{ color: 'var(--muted)' }}>Monitoreos: {d.monitoreos}</div>
    </div>
  )
}

const TooltipTendencia = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{ background: 'var(--card2)', border: '1px solid var(--border2)', borderRadius: 8, padding: '.75rem 1rem', fontSize: '.8rem' }}>
      <div style={{ color: 'var(--text)', fontWeight: 600, marginBottom: '.35rem' }}>{label}</div>
      <div style={{ color: 'var(--muted)' }}>Nivel: <strong style={{ color: 'var(--text)' }}>{d.nivel}</strong></div>
      {d.tratamiento && <div style={{ color: 'var(--muted)' }}>Tratamiento: {d.tratamiento}</div>}
      {d.metodoAplicacion && <div style={{ color: 'var(--muted)' }}>Método: {d.metodoAplicacion}</div>}
    </div>
  )
}

export default function AnalisisPlagas() {
  const api       = useApi()
  const { toast } = useToast()

  const [plagas, setPlagas]         = useState([])
  const [lotesSembrados, setLotes]  = useState([])
  const [cargandoCatalogos, setCC]  = useState(true)

  const [loteSel, setLoteSel]       = useState('')  // obligatorio
  const [plagaSel, setPlagaSel]     = useState('')  // opcional
  const [desde, setDesde]           = useState('')
  const [hasta, setHasta]           = useState('')

  const [modo, setModo]             = useState(null) // 'comparacion' | 'tendencia'
  const [data, setData]             = useState([])
  const [cargando, setCargando]     = useState(false)
  const [buscado, setBuscado]       = useState(false)

  useEffect(() => { cargarCatalogos() }, [])

  async function cargarCatalogos() {
    setCC(true)
    try {
      const [resPlagas, resLotes] = await Promise.all([
        api.get('/fitoproteccion/plagas?todas=1'),
        api.get('/fitoproteccion/lotes-sembrados?todas=1'),
      ])
      if (resPlagas?.ok) setPlagas(resPlagas.data)
      if (resLotes?.ok)  setLotes(resLotes.data)
    } finally {
      setCC(false)
    }
  }

  async function analizar() {
    if (!loteSel) return toast('Selecciona el lote a analizar', 'error')
    setCargando(true)
    setBuscado(false)
    try {
      const params = new URLSearchParams({ lote: loteSel })
      if (plagaSel) params.set('plaga', plagaSel)
      if (desde) params.set('desde', desde)
      if (hasta) params.set('hasta', hasta)
      const res = await api.get(`/fitoproteccion/analisis?${params.toString()}`)
      if (!res?.ok) return toast(res?.mensaje || 'Error', 'error')
      setData(res.data)
      setModo(res.modo)
      setBuscado(true)
      if (!res.data.length) toast('Sin monitoreos para ese lote en ese período', 'info')
    } finally {
      setCargando(false)
    }
  }

  const maxPromedio = modo === 'comparacion' ? data.reduce((m, d) => Math.max(m, d.promedio), 0) : 0
  const maxNivel     = modo === 'tendencia'   ? data.reduce((m, d) => Math.max(m, d.nivel), 0)     : 0
  const nombreLote  = lotesSembrados.find(l => l._id === loteSel)?.loteSembrado
  const nombrePlaga = plagas.find(p => p._id === plagaSel)?.nombre

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Filtros */}
      <div className="card fade-up">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <label className="lbl">Lote a analizar *</label>
              <select className="inp" value={loteSel} onChange={e => setLoteSel(e.target.value)} disabled={cargandoCatalogos}>
                <option value="">Selecciona...</option>
                {lotesSembrados.map(l => (
                  <option key={l._id} value={l._id}>{l.loteSembrado}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <label className="lbl">Plaga / Enfermedad (opcional)</label>
              <select className="inp" value={plagaSel} onChange={e => setPlagaSel(e.target.value)} disabled={cargandoCatalogos}>
                <option value="">Todas las detectadas en el lote</option>
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
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="lbl">Desde</label>
              <input className="inp" type="date" value={desde} onChange={e => setDesde(e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="lbl">Hasta</label>
              <input className="inp" type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
            </div>
          </div>

          <button className="btn-primary" style={{ alignSelf: 'flex-start' }} onClick={analizar} disabled={cargando}>
            {cargando ? <span className="spinner" /> : <Search size={15} />} Analizar
          </button>
        </div>
      </div>

      {/* Gráfico — modo comparación: todas las plagas del lote */}
      {buscado && modo === 'comparacion' && (
        <div className="card fade-up">
          <h3 style={{ fontSize: '.9rem', fontWeight: 600, marginBottom: '.35rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <BarChart2 size={16} /> PLAGAS / ENFERMEDADES DETECTADAS EN {nombreLote?.toUpperCase()}
          </h3>
          <p style={{ fontSize: '.78rem', color: 'var(--muted)', marginBottom: '1.25rem' }}>
            Comparación entre todas las plagas y enfermedades registradas en este lote. Entre más bajo el valor, más controlada.
            Selecciona una plaga específica arriba para ver su tendencia en el tiempo.
          </p>
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(220, data.length * 40)}>
              <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="plaga" width={150}
                  tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<TooltipComparacion />} cursor={{ fill: 'rgba(255,255,255,.04)' }} />
                <Bar dataKey="promedio" name="Frecuencia promedio" radius={[0, 5, 5, 0]} barSize={20}>
                  {data.map((d, i) => <Cell key={i} fill={colorPorNivel(d.promedio, maxPromedio)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '.85rem' }}>
              Sin monitoreos registrados en este lote
            </div>
          )}
        </div>
      )}

      {/* Gráfico — modo tendencia: una plaga específica en el tiempo */}
      {buscado && modo === 'tendencia' && (
        <div className="card fade-up">
          <h3 style={{ fontSize: '.9rem', fontWeight: 600, marginBottom: '.35rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <TrendingUp size={16} /> TENDENCIA DE {nombrePlaga?.toUpperCase()} EN {nombreLote?.toUpperCase()}
          </h3>
          <p style={{ fontSize: '.78rem', color: 'var(--muted)', marginBottom: '1.25rem' }}>
            Evolución del nivel/frecuencia en el tiempo. Si la línea baja, se está controlando; si sube, se está propagando.
          </p>
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.map(d => ({ ...d, fechaLabel: fechaCorta(d.fecha) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="fechaLabel" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<TooltipTendencia />} />
                <Line type="monotone" dataKey="nivel" name="Nivel/Frecuencia" stroke="#ef4444" strokeWidth={2}
                  dot={(props) => {
                    const { cx, cy, payload, index } = props
                    return <Dot key={`dot-${index}`} cx={cx} cy={cy} r={4} fill={colorPorNivel(payload.nivel, maxNivel)} stroke="none" />
                  }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '.85rem' }}>
              Sin monitoreos de esta plaga en este lote
            </div>
          )}
        </div>
      )}
    </div>
  )
}
