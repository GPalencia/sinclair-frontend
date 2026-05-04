// src/pages/Historial.jsx
import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'

function hoy() { return new Date().toISOString().split('T')[0] }

export default function Historial() {
  const api          = useApi()
  const { toast }    = useToast()
  const [desde, setDesde]       = useState(hoy())
  const [hasta, setHasta]       = useState(hoy())
  const [registros, setReg]     = useState([])
  const [stats, setStats]       = useState(null)
  const [cargando, setCargando] = useState(false)
  const [exportando, setExp]    = useState(false)
  const [buscado, setBuscado]   = useState(false)

  async function buscar() {
    if (!desde || !hasta) return toast('Selecciona las fechas', 'warn')
    setCargando(true)
    setBuscado(false)
    try {
      const res = await api.get(`/registros?desde=${desde}&hasta=${hasta}&limite=500`)
      if (!res?.ok) return toast(res?.mensaje || 'Error', 'error')
      setReg(res.data)
      const empleadosU = new Set(res.data.map(r => r.codigoEmpleado || r.personal?._id)).size
      const totalSal   = res.data.reduce((s, r) => s + (r.salario || 0), 0)
      setStats({ total: res.total, empleados: empleadosU, salarios: totalSal })
      setBuscado(true)
      if (!res.data.length) toast('Sin registros en ese período', 'info')
    } finally {
      setCargando(false)
    }
  }

  async function exportar() {
    if (!desde || !hasta) return toast('Selecciona las fechas', 'warn')
    setExp(true)
    toast('⏳ Generando planilla Excel...', 'info')
    try {
      const BASE = import.meta.env.VITE_API_URL || '/api'
      const { token } = { token: localStorage.getItem('sinclair_token') }
      const res = await fetch(`${BASE}/exportar/planilla?desde=${desde}&hasta=${hasta}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      // Si no es un archivo Excel, leer el JSON de error
      const contentType = res.headers.get('content-type') || ''
      if (!res.ok || contentType.includes('application/json')) {
        const err = await res.json().catch(() => ({}))
        toast(err.mensaje || 'No hay registros en ese período para exportar', 'info')
        return
      }

      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `planilla_${desde}_${hasta}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast('✅ Planilla Excel descargada', 'ok')
    } catch (e) {
      toast('Error al exportar: ' + e.message, 'error')
    } finally {
      setExp(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="fade-up">
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '.25rem' }}>Historial de Planilla</h1>
        <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>Consulta y exporta registros por rango de fechas</p>
      </div>

      {/* Filtros */}
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
          <button className="btn-primary" onClick={buscar} disabled={cargando}>
            {cargando ? <span className="spinner" /> : '🔍'} Buscar
          </button>
          <button
            className="btn-secondary"
            onClick={exportar}
            disabled={exportando}
            style={{ borderColor: 'var(--verde)', color: 'var(--verde)' }}
          >
            {exportando ? <span className="spinner" /> : '⬇'} Exportar Excel
          </button>
        </div>
      </div>

      {/* Stats */}
      {buscado && stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }} className="fade-up">
          {[
            { label: 'Registros',  valor: stats.total,    color: 'var(--verde)' },
            { label: 'Empleados',  valor: stats.empleados, color: '#60a5fa' },
            { label: 'Total Planilla', valor: `L ${stats.salarios.toLocaleString('es-HN', { minimumFractionDigits: 2 })}`, color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.4rem', fontWeight: 700, color: s.color }}>{s.valor}</div>
              <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: '.25rem' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabla */}
      {buscado && (
        <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontFamily: 'Syne, sans-serif', fontSize: '.85rem', fontWeight: 600 }}>
            {registros.length} registros encontrados
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Código</th>
                  <th>Empleado</th>
                  <th>Centro de Costo</th>
                  <th>Labor</th>
                  <th>Días</th>
                  <th>Salario</th>
                </tr>
              </thead>
              <tbody>
                {registros.map(r => (
                  <tr key={r._id}>
                    <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.8rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {new Date(r.fecha).toLocaleDateString('es-HN')}
                    </td>
                    <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.8rem' }}>
                      {r.codigoEmpleado || '—'}
                    </td>
                    <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {r.personal?.nombres} {r.personal?.apellidos}
                    </td>
                    <td style={{ fontSize: '.82rem', color: 'var(--muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.centroCosto?.nombre || '—'}
                    </td>
                    <td style={{ fontSize: '.82rem' }}>
                      <span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--muted)', fontSize: '.75rem' }}>{r.labor?.codigo}</span>
                      {' '}{r.labor?.nombre || '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>{r.dias || 1}</td>
                    <td>
                      <span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--verde)', fontWeight: 600, fontSize: '.88rem' }}>
                        L {(r.salario || 0).toFixed(2)}
                      </span>
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
