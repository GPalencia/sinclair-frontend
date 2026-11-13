// src/components/CatalogoDepartamentos.jsx — departamentos que hacen Solicitudes a Bodega
// Solo el administrador agrega, renombra o desactiva; los demás solo ven la lista.
import { useState, useEffect } from 'react'
import { Check, Pencil, Plus, X } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../context/AuthContext'

export default function CatalogoDepartamentos() {
  const api = useApi()
  const { toast } = useToast()
  const { usuario } = useAuth()
  const esAdmin = usuario?.rol === 'admin'
  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(true)
  const [nombre, setNombre] = useState('')
  const [codigo, setCodigo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [editando, setEditando] = useState(null) // { id, nombre }

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    try {
      const res = await api.get('/solicitudes-bodega/departamentos?todos=1')
      if (res?.ok) setLista(res.data)
    } finally { setCargando(false) }
  }

  async function crear() {
    if (!nombre.trim()) return toast('Escribe el nombre del departamento', 'error')
    setGuardando(true)
    try {
      const res = await api.post('/solicitudes-bodega/departamentos', { nombre: nombre.trim(), codigo: codigo.trim() })
      if (!res?.ok) return toast(res?.mensaje || 'Error', 'error')
      toast('Departamento agregado', 'ok')
      setNombre(''); setCodigo('')
      cargar()
    } finally { setGuardando(false) }
  }

  async function actualizar(d, datos) {
    const res = await api.put(`/solicitudes-bodega/departamentos/${d._id}`, datos)
    if (!res?.ok) return toast(res?.mensaje || 'Error', 'error')
    setEditando(null)
    cargar()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {esAdmin ? (
        <div className="card">
          <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ width: 120 }}>
              <label className="lbl">Código SODISA</label>
              <input className="inp" style={{ fontFamily: 'DM Mono, monospace' }} placeholder="009" value={codigo} onChange={e => setCodigo(e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <label className="lbl">Nuevo departamento</label>
              <input className="inp" value={nombre} onChange={e => setNombre(e.target.value)} onKeyDown={e => e.key === 'Enter' && crear()} />
            </div>
            <button className="btn-primary" onClick={crear} disabled={guardando}>
              {guardando ? <span className="spinner" /> : <Plus size={15} />} Agregar
            </button>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: '.82rem', color: 'var(--muted)' }}>Solo el administrador puede agregar o editar departamentos.</p>
      )}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="tbl">
          <thead><tr><th>Código SODISA</th><th>Departamento</th><th>Estado</th>{esAdmin && <th></th>}</tr></thead>
          <tbody>
            {lista.map(d => (
              <tr key={d._id}>
                <td style={{ width: 130 }}>
                  {esAdmin ? (
                    <input key={d.codigo || ''} className="inp" style={{ fontFamily: 'DM Mono, monospace', padding: '.3rem .5rem', width: 90 }} placeholder="—"
                      defaultValue={d.codigo || ''} onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                      onBlur={e => { if ((d.codigo || '') !== e.target.value.trim()) actualizar(d, { codigo: e.target.value.trim() }) }} />
                  ) : <span style={{ fontFamily: 'DM Mono, monospace' }}>{d.codigo || '—'}</span>}
                </td>
                <td style={{ fontWeight: 500 }}>
                  {editando?.id === d._id ? (
                    <input className="inp" autoFocus value={editando.nombre}
                      onChange={e => setEditando({ ...editando, nombre: e.target.value })}
                      onKeyDown={e => { if (e.key === 'Enter') actualizar(d, { nombre: editando.nombre }); if (e.key === 'Escape') setEditando(null) }} />
                  ) : d.nombre}
                </td>
                <td>
                  {esAdmin ? (
                    <button type="button" onClick={() => actualizar(d, { activo: !d.activo })} className={`badge ${d.activo ? 'badge-green' : 'badge-gray'}`} style={{ border: 'none', cursor: 'pointer' }}>
                      {d.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  ) : <span className={`badge ${d.activo ? 'badge-green' : 'badge-gray'}`}>{d.activo ? 'Activo' : 'Inactivo'}</span>}
                </td>
                {esAdmin && (
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {editando?.id === d._id ? (
                      <>
                        <button className="btn-ghost" style={{ padding: '.35rem .5rem' }} title="Guardar" onClick={() => actualizar(d, { nombre: editando.nombre })}><Check size={15} /></button>
                        <button className="btn-ghost" style={{ padding: '.35rem .5rem' }} title="Cancelar" onClick={() => setEditando(null)}><X size={15} /></button>
                      </>
                    ) : (
                      <button className="btn-ghost" style={{ padding: '.35rem .5rem' }} title="Renombrar" onClick={() => setEditando({ id: d._id, nombre: d.nombre })}><Pencil size={14} /></button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {!cargando && !lista.length && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>Sin departamentos. Corre seedDepartamentos.js o agrégalos aquí.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
