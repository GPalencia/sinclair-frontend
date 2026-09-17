// src/components/CatalogoMaquinaria.jsx
import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'

const FORM_VACIO = { codigo: '', unidadDestino: '', tipo: '', tipoMedidor: 'Ninguno', rendimientoObjetivo: '', nota: '' }

export default function CatalogoMaquinaria({ onCambio }) {
  const api       = useApi()
  const { toast } = useToast()
  const [lista, setLista]       = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    try {
      const res = await api.get('/estacion-sinclair/maquinaria?todas=1')
      if (res?.ok) setLista(res.data)
    } finally {
      setCargando(false)
    }
  }

  async function crear() {
    if (!form.codigo.trim() || !form.unidadDestino.trim()) return toast('Código y unidad son obligatorios', 'error')
    setGuardando(true)
    try {
      const res = await api.post('/estacion-sinclair/maquinaria', form)
      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')
      toast('✅ Máquina registrada', 'ok')
      setForm(FORM_VACIO)
      cargar()
      onCambio?.()
    } finally {
      setGuardando(false)
    }
  }

  async function toggleActivo(m) {
    const res = await api.put(`/estacion-sinclair/maquinaria/${m._id}`, { activo: !m.activo })
    if (!res?.ok) return toast(res?.mensaje || 'Error', 'error')
    cargar()
    onCambio?.()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card">
        <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '.85rem', color: 'var(--muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Agregar máquina
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem', maxWidth: 620 }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label className="lbl">Código *</label>
              <input className="inp" placeholder="U-068" value={form.codigo}
                onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))} />
            </div>
            <div style={{ flex: 2, minWidth: 220 }}>
              <label className="lbl">Unidad *</label>
              <input className="inp" placeholder="TRACTOR 13 JOHN DEERE" value={form.unidadDestino}
                onChange={e => setForm(p => ({ ...p, unidadDestino: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label className="lbl">Tipo</label>
              <input className="inp" placeholder="Tractor, Vehículo..." value={form.tipo}
                onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))} />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label className="lbl">Tipo de medidor</label>
              <select className="inp" value={form.tipoMedidor} onChange={e => setForm(p => ({ ...p, tipoMedidor: e.target.value }))}>
                <option value="Ninguno">Ninguno</option>
                <option value="Ninguno (temporal)">Ninguno (temporal)</option>
                <option value="Kilometraje">Kilometraje</option>
                <option value="Horometro">Horómetro</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label className="lbl">Rendimiento objetivo</label>
              <input className="inp" type="number" step="0.01" min="0" value={form.rendimientoObjetivo}
                onChange={e => setForm(p => ({ ...p, rendimientoObjetivo: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="lbl">Nota</label>
            <input className="inp" value={form.nota} onChange={e => setForm(p => ({ ...p, nota: e.target.value }))} />
          </div>
          <button className="btn-primary" style={{ justifyContent: 'center', alignSelf: 'flex-start' }} onClick={crear} disabled={guardando}>
            {guardando ? <span className="spinner" /> : <Plus size={15} />} Agregar
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontFamily: 'Inter, sans-serif', fontSize: '.85rem', fontWeight: 600 }}>
          Catálogo de maquinaria
        </div>
        {cargando ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}><span className="spinner" /></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr><th>Código</th><th>Unidad</th><th>Tipo</th><th>Medidor</th><th>Rend. Objetivo</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {lista.map(m => (
                  <tr key={m._id}>
                    <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>{m.codigo}</td>
                    <td style={{ fontWeight: 500 }}>{m.unidadDestino}</td>
                    <td style={{ fontSize: '.82rem', color: 'var(--muted)' }}>{m.tipo || '—'}</td>
                    <td style={{ fontSize: '.82rem', color: 'var(--muted)' }}>{m.tipoMedidor}</td>
                    <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>{m.rendimientoObjetivo || '—'}</td>
                    <td>
                      <button type="button" onClick={() => toggleActivo(m)}
                        className={`badge ${m.activo ? 'badge-green' : 'badge-gray'}`}
                        style={{ cursor: 'pointer', border: 'none' }}>
                        {m.activo ? '● Activo' : '○ Inactivo'}
                      </button>
                    </td>
                  </tr>
                ))}
                {!lista.length && (
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
