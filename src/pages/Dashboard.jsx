// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'

const COLORES_PIE = ['#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899']

function StatCard({ label, valor, sub, color = 'var(--verde)', icono }) {
  return (
    <div className="card fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '.78rem', color: 'var(--muted)', fontFamily: 'Syne, sans-serif', letterSpacing: '.06em', textTransform: 'uppercase' }}>
          {label}
        </span>
        <span style={{ fontSize: '1.3rem' }}>{icono}</span>
      </div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.6rem', color }}>
        {valor}
      </div>
      {sub && <div style={{ fontSize: '.78rem', color: 'var(--muted)' }}>{sub}</div>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--card2)', border: '1px solid var(--border2)', borderRadius: 8, padding: '.75rem 1rem', fontSize: '.82rem' }}>
      <div style={{ color: 'var(--muted)', marginBottom: '.25rem' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontFamily: 'DM Mono, monospace' }}>
          {p.name}: L {Number(p.value).toLocaleString('es-HN', { minimumFractionDigits: 2 })}
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const api = useApi()
  const [stats, setStats]       = useState(null)
  const [historial, setHist]    = useState([])
  const [porCentro, setPorCC]   = useState([])
  const [alertas, setAlertas]   = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    setCargando(true)
    try {
      // Resumen de hoy
      const resHoy = await api.get('/registros/resumen-hoy')

      // Últimos 7 días para gráfica de área
      const hace7 = new Date()
      hace7.setDate(hace7.getDate() - 6)
      const desde = hace7.toISOString().split('T')[0]
      const hasta  = new Date().toISOString().split('T')[0]

      const resHist = await api.get(`/registros?desde=${desde}&hasta=${hasta}&limite=500`)
      const resPersonal = await api.get('/personal')
      const resAlertas  = await api.get('/contratos/proximos-vencer?dias=7')

      if (resHoy?.ok)    setStats(resHoy.data)
      if (resPersonal?.ok) {
        setStats(prev => ({ ...prev, totalEmpleados: resPersonal.total }))
      }
      if (resAlertas?.ok) setAlertas(resAlertas.data)

      // Agrupar por fecha para gráfica
      if (resHist?.data) {
        const porFecha = {}
        resHist.data.forEach(r => {
          const f = new Date(r.fecha).toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit' })
          if (!porFecha[f]) porFecha[f] = { fecha: f, salarios: 0, registros: 0 }
          porFecha[f].salarios  += r.salario || 0
          porFecha[f].registros += 1
        })
        setHist(Object.values(porFecha).slice(-7))

        // Agrupar por centro de costo para pie
        const porCC = {}
        resHist.data.forEach(r => {
          const k = r.centroCosto?.nombre || 'Sin Centro'
          if (!porCC[k]) porCC[k] = { name: k, value: 0 }
          porCC[k].value += r.salario || 0
        })
        setPorCC(Object.values(porCC).sort((a, b) => b.value - a.value).slice(0, 8))
      }
    } finally {
      setCargando(false)
    }
  }

  if (cargando) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem', color: 'var(--muted)' }}>
      <span className="spinner" /> Cargando dashboard...
    </div>
  )

  const totalHoy = stats?.totalSalarios || 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Título */}
      <div className="fade-up">
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '.25rem' }}>Dashboard</h1>
        <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>
          {new Date().toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <StatCard
          label="Registros hoy"
          valor={stats?.totalRegistros || 0}
          sub="entradas registradas"
          icono="✦"
          color="var(--verde)"
        />
        <StatCard
          label="Planilla hoy"
          valor={`L ${totalHoy.toLocaleString('es-HN', { minimumFractionDigits: 0 })}`}
          sub="salarios del día"
          icono="◎"
          color="#60a5fa"
        />
        <StatCard
          label="Empleados activos"
          valor={stats?.totalEmpleados || '—'}
          sub="en el sistema"
          icono="◈"
          color="#f59e0b"
        />
        <StatCard
          label="Centros activos"
          valor={porCentro.length}
          sub="últimos 7 días"
          icono="⊞"
          color="#c084fc"
        />
      </div>

      {/* Gráficas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>

        {/* Área — salarios últimos 7 días */}
        <div className="card fade-up" style={{ gridColumn: historial.length ? 'auto' : '1/-1' }}>
          <h3 style={{ fontSize: '.9rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--muted)' }}>
            PLANILLA — ÚLTIMOS 7 DÍAS
          </h3>
          {historial.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={historial}>
                <defs>
                  <linearGradient id="gradVerde" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="fecha" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `L${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="salarios" name="Salarios" stroke="#22c55e" strokeWidth={2} fill="url(#gradVerde)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '.85rem' }}>
              Sin datos en los últimos 7 días
            </div>
          )}
        </div>

        {/* Pie — por centro de costo */}
        {porCentro.length > 0 && (
          <div className="card fade-up">
            <h3 style={{ fontSize: '.9rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--muted)' }}>
              DISTRIBUCIÓN POR LOTE
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={porCentro}
                  cx="50%" cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {porCentro.map((_, i) => (
                    <Cell key={i} fill={COLORES_PIE[i % COLORES_PIE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={v => [`L ${Number(v).toLocaleString('es-HN', {minimumFractionDigits:2})}`, 'Total']} />
                <Legend
                  formatter={(value) => <span style={{ fontSize: '.72rem', color: 'var(--muted)' }}>{value.length > 18 ? value.slice(0,18)+'…' : value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Barras — registros por día */}
        {historial.length > 0 && (
          <div className="card fade-up" style={{ gridColumn: '1 / -1' }}>
            <h3 style={{ fontSize: '.9rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--muted)' }}>
              REGISTROS POR DÍA
            </h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={historial} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="fecha" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,.04)' }}
                  contentStyle={{ background: 'var(--card2)', border: '1px solid var(--border2)', borderRadius: 8, fontSize: '.82rem' }} />
                <Bar dataKey="registros" name="Registros" fill="#3b82f6" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>


      {/* Panel alertas contratos */}
      {alertas.length > 0 && (
        <div className="card fade-up" style={{ border: '1px solid rgba(239,68,68,.25)', background: 'rgba(239,68,68,.03)' }}>
          <h3 style={{ fontSize: '.9rem', fontWeight: 600, marginBottom: '1rem', color: '#ef4444' }}>
            ⚠ CONTRATOS POR VENCER — PRÓXIMOS 7 DÍAS ({alertas.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {alertas.map(c => (
              <div key={c._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '.6rem .85rem', background: 'var(--surface)', borderRadius: 8,
                borderLeft: `3px solid ${c.diasRestantes <= 2 ? '#ef4444' : c.diasRestantes <= 5 ? '#f59e0b' : '#3b82f6'}` }}>
                <div>
                  <span style={{ fontWeight: 500, fontSize: '.88rem' }}>
                    {c.personal?.nombres} {c.personal?.apellidos}
                  </span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '.75rem',
                    color: 'var(--verde)', marginLeft: '.6rem' }}>
                    {c.personal?.codigoEmpleado || ''}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '.78rem', color: 'var(--muted)' }}>
                    Vence: {new Date(c.fechaFin).toLocaleDateString('es-HN')}
                  </span>
                  <span className={`badge ${c.diasRestantes <= 5 ? 'badge-red' : 'badge-gray'}`}>
                    {c.diasRestantes === 0 ? 'HOY' : `${c.diasRestantes}d`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Últimos registros del día */}
      {stats?.registros?.length > 0 && (
        <div className="card fade-up">
          <h3 style={{ fontSize: '.9rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--muted)' }}>
            REGISTROS DE HOY
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Código</th>
                  <th>Labor</th>
                  <th>Centro de Costo</th>
                  <th>Salario</th>
                  <th>Hora</th>
                </tr>
              </thead>
              <tbody>
                {stats.registros.slice(0, 8).map(r => (
                  <tr key={r._id}>
                    <td style={{ fontWeight: 500 }}>
                      {r.personal?.nombres} {r.personal?.apellidos}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '.8rem', color: 'var(--muted)' }}>
                        {r.codigoEmpleado || '—'}
                      </span>
                    </td>
                    <td style={{ fontSize: '.82rem' }}>{r.labor?.nombre || '—'}</td>
                    <td style={{ fontSize: '.82rem', color: 'var(--muted)' }}>{r.centroCosto?.nombre || '—'}</td>
                    <td>
                      <span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--verde)', fontSize: '.85rem' }}>
                        L {(r.salario || 0).toFixed(2)}
                      </span>
                    </td>
                    <td style={{ fontSize: '.78rem', color: 'var(--muted)', fontFamily: 'DM Mono, monospace' }}>
                      {new Date(r.createdAt).toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
