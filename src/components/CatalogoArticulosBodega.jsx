// src/components/CatalogoArticulosBodega.jsx
import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'

export default function CatalogoArticulosBodega({ onCambio }) {
  const api       = useApi()
  const { toast } = useToast()
  const [articulos, setArticulos] = useState([])
  const [cargando, setCargando]   = useState(true)
  const [codigo, setCodigo]       = useState('')
  const [nombre, setNombre]       = useState('')
  const [unidadMedida, setUnidadMedida] = useState('Unidad')
  const [categoria, setCategoria] = useState('')
  const [filtro, setFiltro]     = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    try {
      const res = await api.get('/pases-salida/articulos?todas=1')
      if (res?.ok) setArticulos(res.data)
    } finally {
      setCargando(false)
    }
  }

  const q = filtro.trim().toLowerCase()
  const coincidentes = q
    ? articulos.filter(a => `${a.codigo} ${a.nombre} ${a.categoria}`.toLowerCase().includes(q))
    : articulos

  async function crear() {
    if (!nombre.trim()) return toast('El nombre del artículo es obligatorio', 'error')
    setGuardando(true)
    try {
      const res = await api.post('/pases-salida/articulos', { nombre, unidadMedida, codigo, categoria })
      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')
      toast('✅ Artículo agregado', 'ok')
      setNombre(''); setCodigo('')
      cargar()
      onCambio?.()
    } finally {
      setGuardando(false)
    }
  }

  async function toggleActivo(a) {
    const res = await api.put(`/pases-salida/articulos/${a._id}`, { activo: !a.activo })
    if (!res?.ok) return toast(res?.mensaje || 'Error', 'error')
    cargar()
    onCambio?.()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card">
        <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '.85rem', color: 'var(--muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Agregar artículo
        </h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label className="lbl">Código</label>
            <input className="inp" placeholder="Ej. MIS-02649 (opcional)" value={codigo}
              onChange={e => setCodigo(e.target.value)} />
          </div>
          <div style={{ flex: 2, minWidth: 220 }}>
            <label className="lbl">Nombre</label>
            <input className="inp" placeholder="Ej. Manguera de riego 1/2&quot;" value={nombre}
              onChange={e => setNombre(e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label className="lbl">U/M por defecto</label>
            <input className="inp" placeholder="Unidad, Rollo, Galón..." value={unidadMedida}
              onChange={e => setUnidadMedida(e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label className="lbl">Categoría (tablet)</label>
            <input className="inp" list="categorias-articulos" placeholder="Ej. Riego, Empaque..." value={categoria}
              onChange={e => setCategoria(e.target.value)} />
            <datalist id="categorias-articulos">
              {[...new Set(articulos.map(a => a.categoria).filter(Boolean))].sort().map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <button className="btn-primary" onClick={crear} disabled={guardando}>
            {guardando ? <span className="spinner" /> : <Plus size={15} />} Agregar
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontFamily: 'Inter, sans-serif', fontSize: '.85rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span>Catálogo de artículos <span style={{ color: 'var(--muted)', fontWeight: 400 }}>· {articulos.length} en total{coincidentes.length !== articulos.length ? `, ${coincidentes.length} coinciden` : ''}</span></span>
          <input className="inp" style={{ maxWidth: 280 }} placeholder="Buscar por código, nombre o categoría..." value={filtro} onChange={e => setFiltro(e.target.value)} />
        </div>
        {cargando ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}><span className="spinner" /></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr><th>Código</th><th>Artículo</th><th>Categoría</th><th>U/M</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {coincidentes.slice(0, 150).map(a => (
                  <tr key={a._id}>
                    <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.8rem', color: 'var(--muted)' }}>{a.codigo || '—'}</td>
                    <td style={{ fontWeight: 500 }}>{a.nombre}</td>
                    <td style={{ fontSize: '.8rem', color: 'var(--muted)' }}>{a.categoria || '—'}</td>
                    <td style={{ fontSize: '.82rem', color: 'var(--muted)' }}>{a.unidadMedida}</td>
                    <td>
                      <button type="button" onClick={() => toggleActivo(a)}
                        className={`badge ${a.activo ? 'badge-green' : 'badge-gray'}`}
                        style={{ cursor: 'pointer', border: 'none' }}>
                        {a.activo ? '● Activo' : '○ Inactivo'}
                      </button>
                    </td>
                  </tr>
                ))}
                {coincidentes.length > 150 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: '.8rem', fontSize: '.8rem' }}>
                    Mostrando 150 de {coincidentes.length} — usa el buscador para encontrar el resto
                  </td></tr>
                )}
                {!articulos.length && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>Sin registros aún</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
