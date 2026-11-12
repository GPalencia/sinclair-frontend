// src/components/CatalogoDepartamentos.jsx — departamentos que hacen Solicitudes a Bodega
import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'

export default function CatalogoDepartamentos() {
  const api = useApi()
  const { toast } = useToast()
  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(true)
  const [nombre, setNombre] = useState('')
  const [guardando, setGuardando] = useState(false)

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
      const res = await api.post('/solicitudes-bodega/departamentos', { nombre: nombre.trim() })
      if (!res?.ok) return toast(res?.mensaje || 'Error', 'error')
      toast('Departamento agregado', 'ok')
      setNombre('')
      cargar()
    } finally { setGuardando(false) }
  }

  async function alternar(d) {
    const res = await api.put(`/solicitudes-bodega/departamentos/${d._id}`, { activo: !d.activo })
    if (!res?.ok) return toast(res?.mensaje || 'Error', 'error')
    cargar()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="card">
        <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label className="lbl">Nuevo departamento</label>
            <input className="inp" value={nombre} onChange={e => setNombre(e.target.value)} onKeyDown={e => e.key === 'Enter' && crear()} />
          </div>
          <button className="btn-primary" onClick={crear} disabled={guardando}>
            {guardando ? <span className="spinner" /> : <Plus size={15} />} Agregar
          </button>
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="tbl">
          <thead><tr><th>Departamento</th><th>Estado</th></tr></thead>
          <tbody>
            {lista.map(d => (
              <tr key={d._id}>
                <td style={{ fontWeight: 500 }}>{d.nombre}</td>
                <td>
                  <button type="button" onClick={() => alternar(d)} className={`badge ${d.activo ? 'badge-green' : 'badge-gray'}`} style={{ border: 'none', cursor: 'pointer' }}>
                    {d.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
              </tr>
            ))}
            {!cargando && !lista.length && <tr><td colSpan={2} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>Sin departamentos. Corre seedDepartamentos.js o agrégalos aquí.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
