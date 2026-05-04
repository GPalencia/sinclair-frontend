// src/pages/Personal.jsx
import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { useNavigate } from 'react-router-dom'

export default function Personal() {
  const api        = useApi()
  const { toast }  = useToast()
  const navigate   = useNavigate()
  const [personal, setPersonal] = useState([])
  const [filtrado, setFiltrado] = useState([])
  const [buscar, setBuscar]     = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => { cargar() }, [])
  useEffect(() => {
    const txt = buscar.toLowerCase()
    setFiltrado(personal.filter(p =>
      `${p.nombres} ${p.apellidos} ${p.codigoEmpleado || ''} ${p.numeroIdentidad || ''}`.toLowerCase().includes(txt)
    ))
  }, [buscar, personal])

  async function cargar() {
    setCargando(true)
    const res = await api.get('/personal')
    if (res?.ok) { setPersonal(res.data); setFiltrado(res.data) }
    setCargando(false)
  }

  async function desactivar(id, nombre) {
    if (!confirm(`¿Desactivar a ${nombre}?`)) return
    const res = await api.del(`/personal/${id}`)
    if (res?.ok) { toast('Empleado desactivado', 'ok'); cargar() }
    else toast(res?.mensaje || 'Error', 'error')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '.25rem' }}>Personal</h1>
          <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>{personal.length} empleados registrados</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/personal/nuevo')}>
          + Nuevo Empleado
        </button>
      </div>

      {/* Buscador */}
      <input
        className="inp fade-up"
        placeholder="Buscar por nombre, código Sodisa o identidad..."
        value={buscar}
        onChange={e => setBuscar(e.target.value)}
      />

      {/* Tabla */}
      <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
        {cargando ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
            <span className="spinner" />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Código Sodisa</th>
                  <th>Nombre</th>
                  <th>Identidad</th>
                  <th>Cargo</th>
                  <th>Face ID</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrado.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>
                      {buscar ? 'Sin resultados para esa búsqueda' : 'Sin personal registrado'}
                    </td>
                  </tr>
                ) : filtrado.map(p => (
                  <tr key={p._id}>
                    <td>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem', color: 'var(--verde)' }}>
                        {p.codigoEmpleado || '—'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{p.nombres} {p.apellidos}</td>
                    <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.8rem', color: 'var(--muted)' }}>
                      {p.numeroIdentidad || '—'}
                    </td>
                    <td>
                      <span className="badge badge-gray">{p.cargo}</span>
                    </td>
                    <td>
                      {p.faceDescriptor
                        ? <span className="badge badge-green">✓ Activo</span>
                        : <span className="badge badge-red">Sin Face ID</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '.5rem' }}>
                        <button
                          className="btn-ghost"
                          style={{ fontSize: '.8rem' }}
                          onClick={() => navigate(`/registro?id=${p._id}&nombre=${p.nombres} ${p.apellidos}&codigo=${p.codigoEmpleado || ''}&cargo=${p.cargo}`)}
                        >
                          📋 Registrar
                        </button>
                        <button
                          className="btn-ghost"
                          style={{ fontSize: '.8rem', color: 'var(--danger)' }}
                          onClick={() => desactivar(p._id, `${p.nombres} ${p.apellidos}`)}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
