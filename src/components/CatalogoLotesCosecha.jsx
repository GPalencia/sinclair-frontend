// src/components/CatalogoLotesCosecha.jsx
import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'

function hoy() { return new Date().toISOString().split('T')[0] }

const FORM_VACIO = { finca: '', lote: '', variedad: '', fechaCalentamiento: hoy(), area: '' }

export default function CatalogoLotesCosecha({ onCambio }) {
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
      const res = await api.get('/produccion-finca/lotes?todas=1')
      if (res?.ok) setLotes(res.data)
    } finally {
      setCargando(false)
    }
  }

  async function crear() {
    if (!form.finca.trim() || !form.lote.trim()) return toast('Finca y lote son obligatorios', 'error')
    if (!form.fechaCalentamiento) return toast('La fecha de calentamiento es obligatoria', 'error')
    setGuardando(true)
    try {
      const res = await api.post('/produccion-finca/lotes', form)
      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')
      toast('✅ Lote de cosecha agregado', 'ok')
      setForm(FORM_VACIO)
      cargar()
      onCambio?.()
    } finally {
      setGuardando(false)
    }
  }

  async function toggleActivo(l) {
    const res = await api.put(`/produccion-finca/lotes/${l._id}`, { activo: !l.activo })
    if (!res?.ok) return toast(res?.mensaje || 'Error', 'error')
    cargar()
    onCambio?.()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card">
        <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '.85rem', color: 'var(--muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Agregar lote de cosecha
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem', maxWidth: 560 }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label className="lbl">Finca *</label>
              <input className="inp" placeholder="Ej. San Juan" value={form.finca}
                onChange={e => setForm(p => ({ ...p, finca: e.target.value }))} />
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label className="lbl">Lote *</label>
              <input className="inp" placeholder="Ej. 10A" value={form.lote}
                onChange={e => setForm(p => ({ ...p, lote: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label className="lbl">Variedad</label>
              <input className="inp" placeholder="Americana / Hindú" value={form.variedad}
                onChange={e => setForm(p => ({ ...p, variedad: e.target.value }))} />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label className="lbl">Fecha de calentamiento *</label>
              <input className="inp" type="date" value={form.fechaCalentamiento}
                onChange={e => setForm(p => ({ ...p, fechaCalentamiento: e.target.value }))} />
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label className="lbl">Área (Mz)</label>
              <input className="inp" type="number" step="0.01" min="0" value={form.area}
                onChange={e => setForm(p => ({ ...p, area: e.target.value }))} />
            </div>
          </div>
          <button className="btn-primary" style={{ justifyContent: 'center', alignSelf: 'flex-start' }} onClick={crear} disabled={guardando}>
            {guardando ? <span className="spinner" /> : <Plus size={15} />} Agregar
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontFamily: 'Syne, sans-serif', fontSize: '.85rem', fontWeight: 600 }}>
          Catálogo de lotes de cosecha
          <span style={{ color: 'var(--muted)', fontWeight: 400 }}> — solo los "Activo" aparecen para elegir al registrar una cosecha</span>
        </div>
        {cargando ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}><span className="spinner" /></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr><th>Finca</th><th>Lote</th><th>Variedad</th><th>Fecha Calentamiento</th><th>Área (Mz)</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {lotes.map(l => (
                  <tr key={l._id}>
                    <td style={{ fontWeight: 500 }}>{l.finca}</td>
                    <td>{l.lote}</td>
                    <td style={{ fontSize: '.82rem', color: 'var(--muted)' }}>{l.variedad || '—'}</td>
                    <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.8rem', color: 'var(--muted)' }}>
                      {new Date(l.fechaCalentamiento).toLocaleDateString('es-HN')}
                    </td>
                    <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>{l.area}</td>
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
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>Sin registros aún</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
