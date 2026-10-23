// src/components/CatalogoEstacionesRiego.jsx
// Catálogo de estaciones de riego y la lista de lotes que riega cada una.
import { useState } from 'react'
import { Plus, Pencil, Save, X } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { num, vacioSiNull } from '../utils/riego'

const VACIO = { finca: '', nombre: '', rpmHabitual: '', lotes: [], activo: true }

export default function CatalogoEstacionesRiego({ estaciones, onCambio, puedeEditar }) {
  const api = useApi()
  const { toast } = useToast()
  const [modal, setModal] = useState(null)   // null | { id?, form }
  const [nuevoLote, setNuevoLote] = useState('')
  const [guardando, setGuardando] = useState(false)

  const form = modal?.form
  const setForm = (patch) => setModal(m => ({ ...m, form: { ...m.form, ...patch } }))

  function abrirNueva() { setNuevoLote(''); setModal({ form: { ...VACIO, finca: estaciones[0]?.finca || '' } }) }
  function abrirEditar(e) {
    setNuevoLote('')
    setModal({ id: e._id, form: { finca: e.finca, nombre: e.nombre, rpmHabitual: vacioSiNull(e.rpmHabitual), lotes: e.lotes.map(l => ({ ...l })), activo: e.activo } })
  }

  function agregarLote() {
    // Acepta varios separados por coma o espacio: "10.12, 10.13 10.14"
    const codigos = nuevoLote.split(/[,\s]+/).map(c => c.trim()).filter(Boolean)
    if (!codigos.length) return
    const existentes = new Set(form.lotes.map(l => l.codigo))
    const agregar = codigos.filter((c, i) => !existentes.has(c) && codigos.indexOf(c) === i).map(codigo => ({ codigo, areaMz: null }))
    setForm({ lotes: [...form.lotes, ...agregar] })
    setNuevoLote('')
  }

  async function guardar() {
    if (!form.finca.trim() || !form.nombre.trim()) return toast('Finca y nombre de la estación son obligatorios', 'error')
    setGuardando(true)
    try {
      const body = { ...form, finca: form.finca.trim(), nombre: form.nombre.trim(), rpmHabitual: num(form.rpmHabitual) }
      const res = modal.id ? await api.put(`/riego/estaciones/${modal.id}`, body) : await api.post('/riego/estaciones', body)
      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')
      toast('✅ Estación guardada', 'ok')
      setModal(null)
      onCambio()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '.85rem', fontWeight: 600 }}>Estaciones y sus lotes</span>
        {puedeEditar && <button className="btn-primary" onClick={abrirNueva}><Plus size={15} /> Nueva estación</button>}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="tbl">
          <thead><tr><th>Finca</th><th>Estación</th><th>RPM</th><th>Lotes (en orden de riego)</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {estaciones.map(e => (
              <tr key={e._id}>
                <td>{e.finca}</td>
                <td style={{ fontWeight: 600 }}>{e.nombre}</td>
                <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>{e.rpmHabitual ?? '—'}</td>
                <td style={{ fontSize: '.85rem' }}>{e.lotes.length ? e.lotes.map(l => l.codigo).join(' · ') : <span style={{ color: 'var(--muted)' }}>sin lotes</span>}</td>
                <td><span className={`badge ${e.activo ? 'badge-green' : 'badge-gray'}`}>{e.activo ? 'Activa' : 'Inactiva'}</span></td>
                <td>{puedeEditar && <button className="btn-ghost" style={{ padding: '.35rem .6rem' }} onClick={() => abrirEditar(e)} title="Editar"><Pencil size={14} /></button>}</td>
              </tr>
            ))}
            {!estaciones.length && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>Aún no hay estaciones. Crea la primera.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <div onClick={e => e.target === e.currentTarget && setModal(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.5rem', width: '100%', maxWidth: 460, maxHeight: 'calc(100dvh - 2rem)', overflowY: 'auto', animation: 'fadeUp .25s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
              <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '1rem', fontWeight: 700 }}>{modal.id ? 'Editar estación' : 'Nueva estación'}</h3>
              <button className="btn-ghost" onClick={() => setModal(null)} style={{ padding: '.3rem .6rem' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <datalist id="lista-fincas-riego">{[...new Set(estaciones.map(e => e.finca))].map(f => <option key={f} value={f} />)}</datalist>
              <div>
                <label className="lbl">Finca *</label>
                <input className="inp" list="lista-fincas-riego" value={form.finca} onChange={e => setForm({ finca: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="lbl">Estación (nombre o número) *</label>
                  <input className="inp" placeholder="Ej. 10" value={form.nombre} onChange={e => setForm({ nombre: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="lbl">RPM habitual</label>
                  <input className="inp" type="number" inputMode="numeric" placeholder="1700" value={form.rpmHabitual} onChange={e => setForm({ rpmHabitual: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="lbl">Lotes que riega (en el orden en que se riegan)</label>
                <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginBottom: '.5rem' }}>
                  {form.lotes.map(l => (
                    <span key={l.codigo} className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', fontSize: '.85rem', padding: '.3rem .6rem' }}>
                      {l.codigo}
                      <button type="button" onClick={() => setForm({ lotes: form.lotes.filter(x => x.codigo !== l.codigo) })}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: 'inherit', display: 'flex' }}><X size={13} /></button>
                    </span>
                  ))}
                  {!form.lotes.length && <span style={{ fontSize: '.8rem', color: 'var(--muted)' }}>Sin lotes todavía</span>}
                </div>
                <div style={{ display: 'flex', gap: '.5rem' }}>
                  <input className="inp" placeholder="Ej. 10.12 (varios separados por coma)" value={nuevoLote}
                    onChange={e => setNuevoLote(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregarLote() } }} />
                  <button type="button" className="btn-secondary" style={{ flexShrink: 0 }} onClick={agregarLote}><Plus size={15} /> Agregar</button>
                </div>
              </div>
              {modal.id && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.9rem' }}>
                  <input type="checkbox" checked={form.activo} onChange={e => setForm({ activo: e.target.checked })} /> Estación activa
                </label>
              )}
              <div style={{ display: 'flex', gap: '.75rem' }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setModal(null)}>Cancelar</button>
                <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={guardar} disabled={guardando}>
                  {guardando ? <span className="spinner" /> : <Save size={15} />} Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
