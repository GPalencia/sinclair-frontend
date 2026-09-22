// src/components/CatalogoLotesLabores.jsx
import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'

const FORM_VACIO = { finca: '', lote: '', areaMz: '' }

export default function CatalogoLotesLabores({ onCambio }) {
  const api       = useApi()
  const { toast } = useToast()
  const [lotes, setLotes]       = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    try {
      const res = await api.get('/labores-culturales/lotes?todas=1')
      if (res?.ok) setLotes(res.data)
    } finally {
      setCargando(false)
    }
  }

  async function crear() {
    if (!form.finca.trim() || !form.lote.trim()) return toast('Finca y lote son obligatorios', 'error')
    if (!form.areaMz) return toast('El área en Mz es obligatoria', 'error')
    setGuardando(true)
    try {
      const res = await api.post('/labores-culturales/lotes', { ...form, areaMz: Number(form.areaMz) })
      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')
      toast('✅ Lote agregado', 'ok')
      setForm(FORM_VACIO)
      cargar()
      onCambio?.()
    } finally {
      setGuardando(false)
    }
  }

  async function toggleActivo(l) {
    const res = await api.put(`/labores-culturales/lotes/${l._id}`, { activo: !l.activo })
    if (!res?.ok) return toast(res?.mensaje || 'Error', 'error')
    cargar()
    onCambio?.()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card">
        <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '.85rem', color: 'var(--muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Agregar lote
        </h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label className="lbl">Finca</label>
            <input className="inp" placeholder="Ej. San Juan" value={form.finca}
              onChange={e => setForm(p => ({ ...p, finca: e.target.value }))} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label className="lbl">Lote</label>
            <input className="inp" placeholder="Ej. Lote 10A" value={form.lote}
              onChange={e => setForm(p => ({ ...p, lote: e.target.value }))} />
          </div>
          <div style={{ flex: 1, minWidth: 120 }}>
            <label className="lbl">Área (Mz)</label>
            <input className="inp" type="number" step="0.001" min="0" value={form.areaMz}
              onChange={e => setForm(p => ({ ...p, areaMz: e.target.value }))} />
          </div>
          <button className="btn-primary" onClick={crear} disabled={guardando}>
            {guardando ? <span className="spinner" /> : <Plus size={15} />} Agregar
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontFamily: 'Inter, sans-serif', fontSize: '.85rem', fontWeight: 600 }}>
          Catálogo de lotes
        </div>
        {cargando ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}><span className="spinner" /></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr><th>Finca</th><th>Lote</th><th>Área (Mz)</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {lotes.map(l => (
                  <tr key={l._id}>
                    <td style={{ fontWeight: 500 }}>{l.finca}</td>
                    <td>{l.lote}</td>
                    <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>{l.areaMz}</td>
                    <td>
                      <button type="button" onClick={() => toggleActivo(l)}
                        className={`badge ${l.activo ? 'badge-green' : 'badge-gray'}`}
                        style={{ cursor: 'pointer', border: 'none' }}>
                        {l.activo ? '● Activo' : '○ Inactivo'}
                      </button>
                    </td>
                  </tr>
                ))}
                {!lotes.length && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>Sin registros aún</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
