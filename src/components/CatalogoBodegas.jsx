// src/components/CatalogoBodegas.jsx
import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'

export default function CatalogoBodegas({ onCambio }) {
  const api       = useApi()
  const { toast } = useToast()
  const [bodegas, setBodegas]   = useState([])
  const [cargando, setCargando] = useState(true)
  const [nombre, setNombre]     = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    try {
      const res = await api.get('/pases-salida/bodegas?todas=1')
      if (res?.ok) setBodegas(res.data)
    } finally {
      setCargando(false)
    }
  }

  async function crear() {
    if (!nombre.trim()) return toast('El nombre de la bodega es obligatorio', 'error')
    setGuardando(true)
    try {
      const res = await api.post('/pases-salida/bodegas', { nombre, ubicacion })
      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')
      toast('✅ Bodega agregada', 'ok')
      setNombre(''); setUbicacion('')
      cargar()
      onCambio?.()
    } finally {
      setGuardando(false)
    }
  }

  async function toggleActivo(b) {
    const res = await api.put(`/pases-salida/bodegas/${b._id}`, { activo: !b.activo })
    if (!res?.ok) return toast(res?.mensaje || 'Error', 'error')
    cargar()
    onCambio?.()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card">
        <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '.85rem', color: 'var(--muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Agregar bodega
        </h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label className="lbl">Nombre</label>
            <input className="inp" placeholder="Ej. Bodega Jícaro" value={nombre}
              onChange={e => setNombre(e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label className="lbl">Ubicación</label>
            <input className="inp" placeholder="Opcional" value={ubicacion}
              onChange={e => setUbicacion(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={crear} disabled={guardando}>
            {guardando ? <span className="spinner" /> : <Plus size={15} />} Agregar
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontFamily: 'Inter, sans-serif', fontSize: '.85rem', fontWeight: 600 }}>
          Catálogo de bodegas
        </div>
        {cargando ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}><span className="spinner" /></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr><th>Bodega</th><th>Ubicación</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {bodegas.map(b => (
                  <tr key={b._id}>
                    <td style={{ fontWeight: 500 }}>{b.nombre}</td>
                    <td style={{ fontSize: '.82rem', color: 'var(--muted)' }}>{b.ubicacion || '—'}</td>
                    <td>
                      <button type="button" onClick={() => toggleActivo(b)}
                        className={`badge ${b.activo ? 'badge-green' : 'badge-gray'}`}
                        style={{ cursor: 'pointer', border: 'none' }}>
                        {b.activo ? '● Activa' : '○ Inactiva'}
                      </button>
                    </td>
                  </tr>
                ))}
                {!bodegas.length && (
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
