// src/components/CatalogosFito.jsx
import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'

function hoy() { return new Date().toISOString().split('T')[0] }

// ── Plagas / Enfermedades ────────────────────────────────
function PanelPlagas({ onCambio }) {
  const api       = useApi()
  const { toast } = useToast()
  const [plagas, setPlagas]     = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState({ tipoPlaga: 'plaga', nombre: '', descripcion: '' })
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    try {
      const res = await api.get('/fitoproteccion/plagas?todas=1')
      if (res?.ok) setPlagas(res.data)
    } finally {
      setCargando(false)
    }
  }

  async function crear() {
    if (!form.nombre.trim()) return toast('El nombre es obligatorio', 'error')
    setGuardando(true)
    try {
      const res = await api.post('/fitoproteccion/plagas', form)
      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')
      toast('✅ Agregada al catálogo', 'ok')
      setForm({ tipoPlaga: 'plaga', nombre: '', descripcion: '' })
      cargar()
      onCambio?.()
    } finally {
      setGuardando(false)
    }
  }

  async function toggleActivo(p) {
    const res = await api.put(`/fitoproteccion/plagas/${p._id}`, { activo: !p.activo })
    if (!res?.ok) return toast(res?.mensaje || 'Error', 'error')
    cargar()
    onCambio?.()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card">
        <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '.85rem', color: 'var(--muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Agregar plaga o enfermedad
        </h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: 150 }}>
            <label className="lbl">Tipo</label>
            <select className="inp" value={form.tipoPlaga} onChange={e => setForm(p => ({ ...p, tipoPlaga: e.target.value }))}>
              <option value="plaga">Plaga</option>
              <option value="enfermedad">Enfermedad</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label className="lbl">Nombre</label>
            <input className="inp" placeholder="Ej. araña roja" value={form.nombre}
              onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label className="lbl">Descripción (opcional)</label>
            <input className="inp" value={form.descripcion}
              onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} />
          </div>
          <button className="btn-primary" onClick={crear} disabled={guardando}>
            {guardando ? <span className="spinner" /> : <Plus size={15} />} Agregar
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontFamily: 'Syne, sans-serif', fontSize: '.85rem', fontWeight: 600 }}>
          Catálogo de plagas y enfermedades
        </div>
        {cargando ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}><span className="spinner" /></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr><th>Tipo</th><th>Nombre</th><th>Descripción</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {plagas.map(p => (
                  <tr key={p._id}>
                    <td>
                      <span className={`badge ${p.tipoPlaga === 'plaga' ? 'badge-red' : 'badge-yellow'}`}>{p.tipoPlaga}</span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{p.nombre}</td>
                    <td style={{ fontSize: '.82rem', color: 'var(--muted)' }}>{p.descripcion || '—'}</td>
                    <td>
                      <button type="button" onClick={() => toggleActivo(p)}
                        className={`badge ${p.activo ? 'badge-green' : 'badge-gray'}`}
                        style={{ cursor: 'pointer', border: 'none' }}>
                        {p.activo ? '● Activo' : '○ Inactivo'}
                      </button>
                    </td>
                  </tr>
                ))}
                {!plagas.length && (
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

// ── Lotes Sembrados ───────────────────────────────────────
const FORM_LOTE_VACIO = { loteSembrado: '', cultivo: '', fechaSiembra: hoy(), variedad: '', ciclo: '', manzanasSembradas: '' }

function PanelLotesSembrados({ onCambio }) {
  const api       = useApi()
  const { toast } = useToast()
  const [lotes, setLotes]       = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(FORM_LOTE_VACIO)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    try {
      const res = await api.get('/fitoproteccion/lotes-sembrados?todas=1')
      if (res?.ok) setLotes(res.data)
    } finally {
      setCargando(false)
    }
  }

  async function crear() {
    if (!form.loteSembrado.trim()) return toast('El lote sembrado es obligatorio', 'error')
    if (!form.manzanasSembradas)   return toast('Las manzanas sembradas son obligatorias', 'error')
    setGuardando(true)
    try {
      const res = await api.post('/fitoproteccion/lotes-sembrados', form)
      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')
      toast('✅ Lote sembrado agregado', 'ok')
      setForm(FORM_LOTE_VACIO)
      cargar()
      onCambio?.()
    } finally {
      setGuardando(false)
    }
  }

  async function toggleActivo(l) {
    const res = await api.put(`/fitoproteccion/lotes-sembrados/${l._id}`, { activo: !l.activo })
    if (!res?.ok) return toast(res?.mensaje || 'Error', 'error')
    cargar()
    onCambio?.()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card">
        <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '.85rem', color: 'var(--muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Agregar lote sembrado
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem', maxWidth: 560 }}>
          <div>
            <label className="lbl">Lote sembrado *</label>
            <input className="inp" placeholder="Ej. Finca 7 de Mayo Lote 6" value={form.loteSembrado}
              onChange={e => setForm(p => ({ ...p, loteSembrado: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label className="lbl">Cultivo</label>
              <input className="inp" placeholder="Ej. okra" value={form.cultivo}
                onChange={e => setForm(p => ({ ...p, cultivo: e.target.value }))} />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label className="lbl">Variedad</label>
              <input className="inp" placeholder="AMERICANA / HINDU" value={form.variedad}
                onChange={e => setForm(p => ({ ...p, variedad: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label className="lbl">Fecha de siembra</label>
              <input className="inp" type="date" value={form.fechaSiembra}
                onChange={e => setForm(p => ({ ...p, fechaSiembra: e.target.value }))} />
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label className="lbl">Ciclo</label>
              <input className="inp" type="number" min="0" value={form.ciclo}
                onChange={e => setForm(p => ({ ...p, ciclo: e.target.value }))} />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label className="lbl">Manzanas sembradas *</label>
              <input className="inp" type="number" step="0.01" min="0" value={form.manzanasSembradas}
                onChange={e => setForm(p => ({ ...p, manzanasSembradas: e.target.value }))} />
            </div>
          </div>
          <button className="btn-primary" style={{ justifyContent: 'center', alignSelf: 'flex-start' }} onClick={crear} disabled={guardando}>
            {guardando ? <span className="spinner" /> : <Plus size={15} />} Agregar
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontFamily: 'Syne, sans-serif', fontSize: '.85rem', fontWeight: 600 }}>
          Catálogo de lotes sembrados
          <span style={{ color: 'var(--muted)', fontWeight: 400 }}> — solo los "Activo" aparecen para elegir al registrar un monitoreo</span>
        </div>
        {cargando ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}><span className="spinner" /></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr><th>Lote Sembrado</th><th>Cultivo</th><th>Variedad</th><th>Manzanas</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {lotes.map(l => (
                  <tr key={l._id}>
                    <td style={{ fontWeight: 500 }}>{l.loteSembrado}</td>
                    <td style={{ fontSize: '.82rem', color: 'var(--muted)' }}>{l.cultivo || '—'}</td>
                    <td style={{ fontSize: '.82rem', color: 'var(--muted)' }}>{l.variedad || '—'}</td>
                    <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>{l.manzanasSembradas}</td>
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

// ── Panel principal de Catálogos (sub-tabs) ───────────────
export default function CatalogosFito({ onCambio }) {
  const [sub, setSub] = useState('plagas') // 'plagas' | 'lotesSembrados'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', gap: '.5rem' }}>
        {[['plagas', 'Plagas / Enfermedades'], ['lotesSembrados', 'Lotes Sembrados']].map(([key, label]) => (
          <button key={key} type="button" onClick={() => setSub(key)} className={sub === key ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '.8rem', padding: '.5rem .9rem' }}>
            {label}
          </button>
        ))}
      </div>
      {sub === 'plagas' ? <PanelPlagas onCambio={onCambio} /> : <PanelLotesSembrados onCambio={onCambio} />}
    </div>
  )
}
