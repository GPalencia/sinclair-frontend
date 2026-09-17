// src/components/CatalogoRutas.jsx
import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'

export default function CatalogoRutas({ onCambio }) {
  const api       = useApi()
  const { toast } = useToast()
  const [rutas, setRutas]       = useState([])
  const [cargando, setCargando] = useState(true)
  const [nombre, setNombre]     = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    try {
      const res = await api.get('/estacion-sinclair/rutas?todas=1')
      if (res?.ok) setRutas(res.data)
    } finally {
      setCargando(false)
    }
  }

  async function crear() {
    if (!nombre.trim()) return toast('El nombre de la ruta es obligatorio', 'error')
    setGuardando(true)
    try {
      const res = await api.post('/estacion-sinclair/rutas', { nombre })
      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')
      toast('✅ Ruta agregada', 'ok')
      setNombre('')
      cargar()
      onCambio?.()
    } finally {
      setGuardando(false)
    }
  }

  async function toggleActiva(r) {
    const res = await api.put(`/estacion-sinclair/rutas/${r._id}`, { activa: !r.activa })
    if (!res?.ok) return toast(res?.mensaje || 'Error', 'error')
    cargar()
    onCambio?.()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card">
        <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '.85rem', color: 'var(--muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Agregar ruta
        </h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <label className="lbl">Nombre</label>
            <input className="inp" placeholder="Ej. Finca San Juan" value={nombre}
              onChange={e => setNombre(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={crear} disabled={guardando}>
            {guardando ? <span className="spinner" /> : <Plus size={15} />} Agregar
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontFamily: 'Inter, sans-serif', fontSize: '.85rem', fontWeight: 600 }}>
          Catálogo de rutas
        </div>
        {cargando ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}><span className="spinner" /></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr><th>Ruta</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {rutas.map(r => (
                  <tr key={r._id}>
                    <td style={{ fontWeight: 500 }}>{r.nombre}</td>
                    <td>
                      <button type="button" onClick={() => toggleActiva(r)}
                        className={`badge ${r.activa ? 'badge-green' : 'badge-gray'}`}
                        style={{ cursor: 'pointer', border: 'none' }}>
                        {r.activa ? '● Activa' : '○ Inactiva'}
                      </button>
                    </td>
                  </tr>
                ))}
                {!rutas.length && (
                  <tr><td colSpan={2} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>Sin registros aún</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
