// src/pages/Personal.jsx
import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { useNavigate } from 'react-router-dom'

// ── Modal de edición ──────────────────────────────────
function ModalEditar({ persona, onCerrar, onGuardado }) {
  const api       = useApi()
  const { toast } = useToast()
  const [form, setForm] = useState({
    nombres:         persona.nombres        || '',
    apellidos:       persona.apellidos      || '',
    codigoEmpleado:  persona.codigoEmpleado || '',
    numeroIdentidad: persona.numeroIdentidad|| '',
    telefono:        persona.telefono       || '',
    cargo:           persona.cargo          || 'operario',
    activo:          persona.activo !== false,
  })
  const [guardando, setGuardando] = useState(false)

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  function formatIdentidad(v) {
    let d = v.replace(/\D/g, '').substring(0, 13)
    if (d.length > 8) d = d.slice(0,4) + '-' + d.slice(4,8) + '-' + d.slice(8)
    else if (d.length > 4) d = d.slice(0,4) + '-' + d.slice(4)
    return d
  }

  async function guardar() {
    if (!form.nombres || !form.apellidos) return toast('Nombres y apellidos son obligatorios', 'error')
    setGuardando(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== undefined)
          fd.append(k, k === 'codigoEmpleado' ? String(v).toUpperCase() : v)
      })
      const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/personal/${persona._id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('sinclair_token')}` },
        body: fd
      }).then(r => r.json())

      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')
      toast('✅ Empleado actualizado', 'ok')
      onGuardado()
    } finally { setGuardando(false) }
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onCerrar()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14,
        padding: '1.75rem', width: '100%', maxWidth: 520, animation: 'fadeUp .25s ease',
        maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1rem', fontWeight: 700 }}>
            Editar — {persona.nombres} {persona.apellidos}
          </h3>
          <button className="btn-ghost" onClick={onCerrar} style={{ fontSize: '1.1rem' }}>✕</button>
        </div>

        {/* Formulario */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label className="lbl">Nombres *</label>
            <input className="inp" value={form.nombres} onChange={e => set('nombres', e.target.value)} />
          </div>
          <div>
            <label className="lbl">Apellidos *</label>
            <input className="inp" value={form.apellidos} onChange={e => set('apellidos', e.target.value)} />
          </div>
          <div>
            <label className="lbl">Código Sodisa</label>
            <input className="inp" value={form.codigoEmpleado}
              onChange={e => set('codigoEmpleado', e.target.value.toUpperCase())}
              placeholder="FG002705" />
          </div>
          <div>
            <label className="lbl">Número de Identidad</label>
            <input className="inp" value={form.numeroIdentidad}
              onChange={e => set('numeroIdentidad', formatIdentidad(e.target.value))}
              placeholder="0101-1990-12345" maxLength={15} />
          </div>
          <div>
            <label className="lbl">Teléfono</label>
            <input className="inp" value={form.telefono}
              onChange={e => set('telefono', e.target.value)}
              placeholder="9999-9999" />
          </div>
          <div>
            <label className="lbl">Cargo</label>
            <select className="inp" value={form.cargo} onChange={e => set('cargo', e.target.value)}>
              {['operario','tecnico','supervisor','coordinador','otro'].map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Estado activo/inactivo */}
        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label className="lbl" style={{ margin: 0 }}>Estado:</label>
          <button
            type="button"
            onClick={() => set('activo', !form.activo)}
            className={`badge ${form.activo ? 'badge-green' : 'badge-red'}`}
            style={{ cursor: 'pointer', border: 'none', padding: '.35rem .9rem', fontSize: '.8rem' }}
          >
            {form.activo ? '● Activo' : '○ Inactivo'}
          </button>
          <span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>
            {form.activo ? 'El empleado puede hacer registros' : 'El empleado no aparecerá en búsquedas'}
          </span>
        </div>

        {/* Botones */}
        <div style={{ display: 'flex', gap: '.75rem', marginTop: '1.5rem' }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onCerrar}>Cancelar</button>
          <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}
            onClick={guardar} disabled={guardando}>
            {guardando ? <span className="spinner" /> : '💾'} Guardar cambios
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────
export default function Personal() {
  const api        = useApi()
  const { toast }  = useToast()
  const navigate   = useNavigate()
  const [personal, setPersonal]     = useState([])
  const [filtrado, setFiltrado]     = useState([])
  const [buscar, setBuscar]         = useState('')
  const [cargando, setCargando]     = useState(true)
  const [editando, setEditando]     = useState(null) // persona que se está editando

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
    if (!confirm(`¿Desactivar a ${nombre}? Podrás reactivarlo editando el empleado.`)) return
    const res = await api.del(`/personal/${id}`)
    if (res?.ok) { toast('Empleado desactivado', 'ok'); cargar() }
    else toast(res?.mensaje || 'Error', 'error')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Modal editar */}
      {editando && (
        <ModalEditar
          persona={editando}
          onCerrar={() => setEditando(null)}
          onGuardado={() => { setEditando(null); cargar() }}
        />
      )}

      {/* Título */}
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
          <div style={{ padding: '3rem', textAlign: 'center' }}>
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
                  <th>Estado</th>
                  <th>Face ID</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrado.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>
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
                      <span className={`badge ${p.activo ? 'badge-green' : 'badge-red'}`}>
                        {p.activo ? '● Activo' : '○ Inactivo'}
                      </span>
                    </td>
                    <td>
                      {p.faceDescriptor
                        ? <span className="badge badge-green">✓ Face ID</span>
                        : <span className="badge badge-red">Sin Face ID</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '.4rem' }}>
                        <button
                          className="btn-ghost"
                          style={{ fontSize: '.8rem' }}
                          onClick={() => navigate(`/registro?id=${p._id}&nombre=${p.nombres} ${p.apellidos}&codigo=${p.codigoEmpleado || ''}&cargo=${p.cargo}`)}
                          title="Registrar planilla"
                        >
                          📋
                        </button>
                        <button
                          className="btn-ghost"
                          style={{ fontSize: '.8rem', color: 'var(--azul)' }}
                          onClick={() => setEditando(p)}
                          title="Editar empleado"
                        >
                          ✎
                        </button>
                        {p.activo && (
                          <button
                            className="btn-ghost"
                            style={{ fontSize: '.8rem', color: 'var(--danger)' }}
                            onClick={() => desactivar(p._id, `${p.nombres} ${p.apellidos}`)}
                            title="Desactivar empleado"
                          >
                            ✕
                          </button>
                        )}
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
