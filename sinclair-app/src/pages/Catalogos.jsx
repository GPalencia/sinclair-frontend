// src/pages/Catalogos.jsx
import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'

export default function Catalogos() {
  const api = useApi()
  const [tab, setTab]         = useState('labores')
  const [labores, setLabores] = useState([])
  const [centros, setCentros] = useState([])
  const [buscarL, setBuscarL] = useState('')
  const [buscarC, setBuscarC] = useState('')
  const [tipoFiltro, setTipo] = useState('')
  const [fincaFiltro, setFinca] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    const [resL, resC] = await Promise.all([
      api.get('/catalogos/labores'),
      api.get('/catalogos/centros-costo')
    ])
    if (resL?.ok) setLabores(resL.data)
    if (resC?.ok) setCentros(resC.data)
    setCargando(false)
  }

  const laboresFiltradas = labores.filter(l => {
    const txt = `${l.codigo} ${l.nombre}`.toLowerCase().includes(buscarL.toLowerCase())
    const tipo = tipoFiltro === 'dias' ? l.pideDias : tipoFiltro === 'valor' ? l.pideValor : true
    return txt && tipo
  })

  const centrosFiltrados = centros.filter(c => {
    const txt = `${c.nombre} ${c.finca}`.toLowerCase().includes(buscarC.toLowerCase())
    const finca = fincaFiltro ? c.finca === fincaFiltro : true
    return txt && finca
  })

  const fincasUnicas = [...new Set(centros.map(c => c.finca).filter(Boolean))].sort()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="fade-up">
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '.25rem' }}>Catálogos</h1>
        <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>Labores y centros de costo del sistema Sodisa</p>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: '.5rem' }} className="fade-up">
        {[['labores', `⚙ Labores (${labores.length})`], ['centros', `📍 Centros de Costo (${centros.length})`]].map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '.6rem 1.2rem',
              borderRadius: 8,
              border: tab === t ? '1px solid rgba(34,197,94,.3)' : '1px solid var(--border)',
              background: tab === t ? 'rgba(34,197,94,.08)' : 'transparent',
              color: tab === t ? 'var(--verde)' : 'var(--muted)',
              fontFamily: 'Syne, sans-serif',
              fontSize: '.85rem',
              fontWeight: tab === t ? 600 : 400,
              cursor: 'pointer',
              transition: 'all .18s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {cargando ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
          <span className="spinner" />
        </div>
      ) : (
        <>
          {/* ── LABORES ── */}
          {tab === 'labores' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
                <input className="inp" style={{ flex: 1, minWidth: 200 }} placeholder="Buscar por código o nombre..."
                  value={buscarL} onChange={e => setBuscarL(e.target.value)} />
                <select className="inp" style={{ width: 'auto' }} value={tipoFiltro} onChange={e => setTipo(e.target.value)}>
                  <option value="">Todos los tipos</option>
                  <option value="dias">📅 Por día (valor fijo)</option>
                  <option value="valor">✏ Destajo (valor libre)</option>
                </select>
              </div>
              <div style={{ fontSize: '.78rem', color: 'var(--muted)' }}>
                {laboresFiltradas.length} de {labores.length} labores
              </div>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Nombre</th>
                        <th>Tipo</th>
                        <th>Valor Diario</th>
                      </tr>
                    </thead>
                    <tbody>
                      {laboresFiltradas.map(l => (
                        <tr key={l._id}>
                          <td>
                            <span style={{
                              fontFamily: 'DM Mono, monospace',
                              fontSize: '.85rem',
                              color: l.codigo.startsWith('F') ? 'var(--azul)' : 'var(--warn)',
                              fontWeight: 600,
                            }}>
                              {l.codigo}
                            </span>
                          </td>
                          <td style={{ fontWeight: 500 }}>{l.nombre}</td>
                          <td>
                            {l.pideDias
                              ? <span className="badge badge-blue">📅 Por día</span>
                              : <span className="badge badge-yellow">✏ Destajo</span>}
                          </td>
                          <td>
                            {l.valorDiario != null
                              ? <span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--verde)', fontWeight: 600 }}>
                                  L {l.valorDiario.toFixed(2)}
                                </span>
                              : <span style={{ color: 'var(--muted)' }}>—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── CENTROS DE COSTO ── */}
          {tab === 'centros' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
                <input className="inp" style={{ flex: 1, minWidth: 200 }} placeholder="Buscar por nombre o finca..."
                  value={buscarC} onChange={e => setBuscarC(e.target.value)} />
                <select className="inp" style={{ width: 'auto' }} value={fincaFiltro} onChange={e => setFinca(e.target.value)}>
                  <option value="">Todas las fincas</option>
                  {fincasUnicas.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div style={{ fontSize: '.78rem', color: 'var(--muted)' }}>
                {centrosFiltrados.length} de {centros.length} centros de costo
              </div>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Centro de Costo</th>
                        <th>Finca / Área</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {centrosFiltrados.map(c => (
                        <tr key={c._id}>
                          <td style={{ fontWeight: 500 }}>{c.nombre}</td>
                          <td style={{ color: 'var(--muted)', fontSize: '.85rem' }}>{c.finca || '—'}</td>
                          <td>
                            <span className={`badge ${c.activo ? 'badge-green' : 'badge-red'}`}>
                              {c.activo ? '● Activo' : '○ Inactivo'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
