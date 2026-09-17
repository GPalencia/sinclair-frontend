// src/components/CatalogoMaquinaria.jsx
import { useState, useEffect } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'

const FORM_VACIO = { codigo: '', unidadDestino: '', tipo: '', tipoMedidor: 'Ninguno', rendimientoObjetivo: '', nota: '' }

// ── Modal genérico ─────────────────────────────────────
function Modal({ titulo, onClose, children }) {
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.75rem', width: '100%', maxWidth: 460, animation: 'fadeUp .25s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '1rem', fontWeight: 700 }}>{titulo}</h3>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize: '1.1rem', padding: '.3rem .6rem' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function CatalogoMaquinaria({ onCambio }) {
  const api       = useApi()
  const { toast } = useToast()
  const [lista, setLista]       = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [modalEditar, setModalEditar] = useState(null)
  const [formEditar, setFormEditar] = useState(null)
  const [guardandoEditar, setGE] = useState(false)

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

  function abrirEditar(m) {
    setFormEditar({
      unidadDestino: m.unidadDestino, tipo: m.tipo || '', tipoMedidor: m.tipoMedidor,
      rendimientoObjetivo: m.rendimientoObjetivo || '', nota: m.nota || '',
    })
    setModalEditar(m)
  }

  async function guardarEdicion() {
    setGE(true)
    try {
      const res = await api.put(`/estacion-sinclair/maquinaria/${modalEditar._id}`, formEditar)
      if (!res?.ok) return toast(res?.mensaje || 'Error al actualizar', 'error')
      toast('✅ Máquina actualizada', 'ok')
      setModalEditar(null)
      cargar()
      onCambio?.()
    } finally {
      setGE(false)
    }
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
                <tr><th>Código</th><th>Unidad</th><th>Tipo</th><th>Medidor</th><th>Rend. Objetivo</th><th>Estado</th><th></th></tr>
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
                    <td>
                      <button className="btn-ghost" style={{ padding: '.35rem .6rem' }} onClick={() => abrirEditar(m)} title="Editar máquina">
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!lista.length && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>Sin registros aún</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalEditar && formEditar && (
        <Modal titulo={`Editar máquina — ${modalEditar.codigo}`} onClose={() => setModalEditar(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="lbl">Unidad</label>
              <input className="inp" value={formEditar.unidadDestino}
                onChange={e => setFormEditar(p => ({ ...p, unidadDestino: e.target.value }))} />
            </div>
            <div>
              <label className="lbl">Tipo</label>
              <input className="inp" value={formEditar.tipo}
                onChange={e => setFormEditar(p => ({ ...p, tipo: e.target.value }))} />
            </div>
            <div>
              <label className="lbl">Tipo de medidor</label>
              <select className="inp" value={formEditar.tipoMedidor}
                onChange={e => setFormEditar(p => ({ ...p, tipoMedidor: e.target.value }))}>
                <option value="Ninguno">Ninguno</option>
                <option value="Ninguno (temporal)">Ninguno (temporal)</option>
                <option value="Kilometraje">Kilometraje</option>
                <option value="Horometro">Horómetro</option>
              </select>
            </div>
            <div>
              <label className="lbl">Rendimiento objetivo</label>
              <input className="inp" type="number" step="0.01" min="0" value={formEditar.rendimientoObjetivo}
                onChange={e => setFormEditar(p => ({ ...p, rendimientoObjetivo: e.target.value }))} />
            </div>
            <div>
              <label className="lbl">Nota</label>
              <input className="inp" value={formEditar.nota}
                onChange={e => setFormEditar(p => ({ ...p, nota: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: '.75rem', marginTop: '.5rem', flexWrap: 'wrap' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setModalEditar(null)}>Cancelar</button>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={guardarEdicion} disabled={guardandoEditar}>
                {guardandoEditar ? <span className="spinner" /> : <Pencil size={15} />} Guardar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
