// src/components/CatalogoTiposLabor.jsx
import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'

const FORM_VACIO = { nombre: '', requiereVariedad: false, requiereLibrasSemilla: false, objetivoPersonalPorMz: '' }

export default function CatalogoTiposLabor({ onCambio }) {
  const api       = useApi()
  const { toast } = useToast()
  const [tipos, setTipos]       = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    try {
      const res = await api.get('/labores-culturales/tipos-labor?todas=1')
      if (res?.ok) setTipos(res.data)
    } finally {
      setCargando(false)
    }
  }

  async function crear() {
    if (!form.nombre.trim()) return toast('El nombre es obligatorio', 'error')
    setGuardando(true)
    try {
      const res = await api.post('/labores-culturales/tipos-labor', {
        ...form,
        objetivoPersonalPorMz: form.objetivoPersonalPorMz === '' ? null : Number(form.objetivoPersonalPorMz),
      })
      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')
      toast('✅ Tipo de labor agregado', 'ok')
      setForm(FORM_VACIO)
      cargar()
      onCambio?.()
    } finally {
      setGuardando(false)
    }
  }

  async function toggleActivo(t) {
    const res = await api.put(`/labores-culturales/tipos-labor/${t._id}`, { activo: !t.activo })
    if (!res?.ok) return toast(res?.mensaje || 'Error', 'error')
    cargar()
    onCambio?.()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card">
        <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '.85rem', color: 'var(--muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Agregar tipo de labor
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem', maxWidth: 560 }}>
          <div>
            <label className="lbl">Nombre</label>
            <input className="inp" placeholder="Ej. Fertilización" value={form.nombre}
              onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.85rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.requiereVariedad}
                onChange={e => setForm(p => ({ ...p, requiereVariedad: e.target.checked }))} />
              Pide variedad
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.85rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.requiereLibrasSemilla}
                onChange={e => setForm(p => ({ ...p, requiereLibrasSemilla: e.target.checked }))} />
              Pide libras de semilla
            </label>
          </div>
          <div style={{ maxWidth: 220 }}>
            <label className="lbl">Personal objetivo por Mz</label>
            <input className="inp" type="number" step="0.1" min="0" value={form.objetivoPersonalPorMz}
              onChange={e => setForm(p => ({ ...p, objetivoPersonalPorMz: e.target.value }))} />
          </div>
          <button className="btn-primary" style={{ justifyContent: 'center', alignSelf: 'flex-start' }} onClick={crear} disabled={guardando}>
            {guardando ? <span className="spinner" /> : <Plus size={15} />} Agregar
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontFamily: 'Inter, sans-serif', fontSize: '.85rem', fontWeight: 600 }}>
          Catálogo de tipos de labor
        </div>
        {cargando ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}><span className="spinner" /></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr><th>Nombre</th><th>Pide variedad</th><th>Pide libras semilla</th><th>Personal/Mz obj.</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {tipos.map(t => (
                  <tr key={t._id}>
                    <td style={{ fontWeight: 500 }}>{t.nombre}</td>
                    <td>{t.requiereVariedad ? 'Sí' : '—'}</td>
                    <td>{t.requiereLibrasSemilla ? 'Sí' : '—'}</td>
                    <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>{t.objetivoPersonalPorMz ?? '—'}</td>
                    <td>
                      <button type="button" onClick={() => toggleActivo(t)}
                        className={`badge ${t.activo ? 'badge-green' : 'badge-gray'}`}
                        style={{ cursor: 'pointer', border: 'none' }}>
                        {t.activo ? '● Activo' : '○ Inactivo'}
                      </button>
                    </td>
                  </tr>
                ))}
                {!tipos.length && (
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
