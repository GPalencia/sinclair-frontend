// src/components/CatalogoCultivos.jsx
import { useState, useEffect } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'

export default function CatalogoCultivos({ onCambio }) {
  const api       = useApi()
  const { toast } = useToast()
  const [cultivos, setCultivos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [nombre, setNombre]     = useState('')
  const [guardando, setGuardando] = useState(false)
  const [editando, setEditando] = useState(null) // _id del que se está renombrando
  const [nombreEdit, setNombreEdit] = useState('')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    try {
      const res = await api.get('/produccion-finca/cultivos?todas=1')
      if (res?.ok) setCultivos(res.data)
    } finally {
      setCargando(false)
    }
  }

  async function crear() {
    if (!nombre.trim()) return toast('El nombre del cultivo es obligatorio', 'error')
    setGuardando(true)
    try {
      const res = await api.post('/produccion-finca/cultivos', { nombre })
      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')
      toast('✅ Cultivo agregado', 'ok')
      setNombre('')
      cargar()
      onCambio?.()
    } finally {
      setGuardando(false)
    }
  }

  async function toggleActivo(c) {
    const res = await api.put(`/produccion-finca/cultivos/${c._id}`, { activo: !c.activo })
    if (!res?.ok) return toast(res?.mensaje || 'Error', 'error')
    cargar()
    onCambio?.()
  }

  async function guardarNombre(c) {
    if (!nombreEdit.trim()) return toast('El nombre no puede quedar vacío', 'error')
    const res = await api.put(`/produccion-finca/cultivos/${c._id}`, { nombre: nombreEdit })
    if (!res?.ok) return toast(res?.mensaje || 'Error', 'error')
    setEditando(null)
    cargar()
    onCambio?.()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card">
        <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '.85rem', color: 'var(--muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Agregar cultivo
        </h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label className="lbl">Nombre</label>
            <input className="inp" placeholder="Ej. Pepino" value={nombre}
              onChange={e => setNombre(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={crear} disabled={guardando}>
            {guardando ? <span className="spinner" /> : <Plus size={15} />} Agregar
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontFamily: 'Inter, sans-serif', fontSize: '.85rem', fontWeight: 600 }}>
          Catálogo de cultivos
        </div>
        {cargando ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}><span className="spinner" /></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr><th>Cultivo</th><th>Estado</th><th></th></tr>
              </thead>
              <tbody>
                {cultivos.map(c => (
                  <tr key={c._id}>
                    <td style={{ fontWeight: 500 }}>
                      {editando === c._id ? (
                        <input className="inp" style={{ maxWidth: 220 }} value={nombreEdit}
                          onChange={e => setNombreEdit(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && guardarNombre(c)} autoFocus />
                      ) : c.nombre}
                    </td>
                    <td>
                      <button type="button" onClick={() => toggleActivo(c)}
                        className={`badge ${c.activo ? 'badge-green' : 'badge-gray'}`}
                        style={{ cursor: 'pointer', border: 'none' }}>
                        {c.activo ? '● Activo' : '○ Inactivo'}
                      </button>
                    </td>
                    <td>
                      {editando === c._id ? (
                        <button className="btn-ghost" style={{ padding: '.35rem .6rem' }} onClick={() => guardarNombre(c)} title="Guardar nombre">
                          ✓
                        </button>
                      ) : (
                        <button className="btn-ghost" style={{ padding: '.35rem .6rem' }}
                          onClick={() => { setEditando(c._id); setNombreEdit(c.nombre) }} title="Renombrar">
                          <Pencil size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!cultivos.length && (
                  <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>Sin registros aún</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
