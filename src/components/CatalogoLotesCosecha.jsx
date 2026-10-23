// src/components/CatalogoLotesCosecha.jsx
import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Plus, RefreshCcw, X } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { fechaCorta, hoyLocal } from '../utils/fecha'

// Cada fila del catálogo es UN CICLO de cosecha. Un mismo Finca+Lote puede
// tener varios ciclos (solo uno activo); el botón "Nuevo ciclo" cierra el
// actual y abre otro con la nueva fecha de calentamiento.
const claveLote = (l) => `${String(l.finca).trim().toLowerCase().replace(/^finca\s+/, '')}|${String(l.lote).trim().toLowerCase().replace(/^lote\s*/, '').replace(/\s+/g, '')}`

function hoy() { return hoyLocal() }

const FORM_VACIO = { finca: '', lote: '', variedad: '', fechaCalentamiento: hoy(), area: '' }

export default function CatalogoLotesCosecha({ onCambio }) {
  const api       = useApi()
  const { toast } = useToast()
  const [lotes, setLotes]       = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [modalCiclo, setModalCiclo] = useState(null)   // { lote, form }
  const [guardandoCiclo, setGuardandoCiclo] = useState(false)

  // Número de ciclo (1, 2, 3...) y cuál es el último de cada Finca+Lote
  const infoCiclos = useMemo(() => {
    const grupos = {}
    lotes.forEach(l => { (grupos[claveLote(l)] ||= []).push(l) })
    const info = {}
    Object.values(grupos).forEach(arr => {
      arr.sort((a, b) => new Date(a.fechaCalentamiento) - new Date(b.fechaCalentamiento))
      arr.forEach((l, i) => { info[l._id] = { n: i + 1, de: arr.length, esUltimo: i === arr.length - 1 } })
    })
    return info
  }, [lotes])

  function abrirNuevoCiclo(l) {
    setModalCiclo({ lote: l, form: { fechaCalentamiento: hoy(), variedad: l.variedad || '', area: l.area ?? '' } })
  }

  async function guardarNuevoCiclo() {
    const { lote, form: f } = modalCiclo
    if (!f.fechaCalentamiento) return toast('La fecha de calentamiento es obligatoria', 'error')
    setGuardandoCiclo(true)
    try {
      const res = await api.post(`/produccion-finca/lotes/${lote._id}/nuevo-ciclo`, f)
      if (!res?.ok) return toast(res?.mensaje || 'Error al crear el ciclo', 'error')
      toast(`✅ Nuevo ciclo de ${lote.finca} lote ${lote.lote} desde ${fechaCorta(f.fechaCalentamiento + 'T00:00:00Z')}`, 'ok')
      setModalCiclo(null)
      cargar()
      onCambio?.()
    } finally { setGuardandoCiclo(false) }
  }

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
        <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '.85rem', color: 'var(--muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Agregar lote de cosecha (lote nuevo)
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
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontFamily: 'Inter, sans-serif', fontSize: '.85rem', fontWeight: 600 }}>
          Catálogo de lotes de cosecha
        </div>
        {cargando ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}><span className="spinner" /></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr><th>Finca</th><th>Lote</th><th>Ciclo</th><th>Variedad</th><th>Fecha Calentamiento</th><th>Cierre</th><th>Área (Mz)</th><th>Estado</th><th></th></tr>
              </thead>
              <tbody>
                {lotes.map(l => (
                  <tr key={l._id}>
                    <td style={{ fontWeight: 500 }}>{l.finca}</td>
                    <td>{l.lote}</td>
                    <td style={{ fontSize: '.8rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {infoCiclos[l._id]?.de > 1 ? `${infoCiclos[l._id].n} de ${infoCiclos[l._id].de}` : '1'}
                    </td>
                    <td style={{ fontSize: '.82rem', color: 'var(--muted)' }}>{l.variedad || '—'}</td>
                    <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.8rem', color: 'var(--muted)' }}>
                      {fechaCorta(l.fechaCalentamiento)}
                    </td>
                    <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.8rem', color: 'var(--muted)' }}>
                      {l.fechaCierre ? fechaCorta(l.fechaCierre) : '—'}
                    </td>
                    <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>{l.area}</td>
                    <td>
                      <button type="button" onClick={() => toggleActivo(l)}
                        className={`badge ${l.activo ? 'badge-green' : 'badge-gray'}`}
                        style={{ cursor: 'pointer', border: 'none' }}>
                        {l.activo ? '● Activo' : '○ Inactivo'}
                      </button>
                    </td>
                    <td>
                      {infoCiclos[l._id]?.esUltimo && (
                        <button type="button" className="btn-secondary" style={{ padding: '.35rem .7rem', fontSize: '.78rem', whiteSpace: 'nowrap' }}
                          onClick={() => abrirNuevoCiclo(l)} title="El lote vuelve a cosecha: cierra este ciclo y abre uno nuevo">
                          <RefreshCcw size={13} /> Nuevo ciclo
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!lotes.length && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>Sin registros aún</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalCiclo && createPortal(
        <div onClick={e => e.target === e.currentTarget && setModalCiclo(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.5rem', width: '100%', maxWidth: 460, maxHeight: 'calc(100dvh - 2rem)', overflowY: 'auto', animation: 'fadeUp .25s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '1rem', fontWeight: 700 }}>
                Nuevo ciclo — {modalCiclo.lote.finca} lote {modalCiclo.lote.lote}
              </h3>
              <button className="btn-ghost" onClick={() => setModalCiclo(null)} style={{ padding: '.3rem .6rem' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: '.82rem', color: 'var(--text2)', background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, padding: '.7rem .85rem', marginBottom: '1rem', lineHeight: 1.5 }}>
              {modalCiclo.lote.activo
                ? <>El ciclo actual (desde <b>{fechaCorta(modalCiclo.lote.fechaCalentamiento)}</b>) se va a <b>cerrar</b>. </>
                : <>El último ciclo (desde <b>{fechaCorta(modalCiclo.lote.fechaCalentamiento)}</b>) ya está cerrado. </>}
              Sus registros se quedan en el historial con sus propios días de cosecha. Lo que se registre de aquí en adelante va al ciclo nuevo.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.9rem' }}>
              <div>
                <label className="lbl">Fecha de calentamiento del nuevo ciclo *</label>
                <input className="inp" type="date" value={modalCiclo.form.fechaCalentamiento}
                  onChange={e => setModalCiclo(m => ({ ...m, form: { ...m.form, fechaCalentamiento: e.target.value } }))} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="lbl">Variedad</label>
                  <input className="inp" value={modalCiclo.form.variedad}
                    onChange={e => setModalCiclo(m => ({ ...m, form: { ...m.form, variedad: e.target.value } }))} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="lbl">Área (Mz)</label>
                  <input className="inp" type="number" step="0.01" min="0" value={modalCiclo.form.area}
                    onChange={e => setModalCiclo(m => ({ ...m, form: { ...m.form, area: e.target.value } }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '.75rem' }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setModalCiclo(null)}>Cancelar</button>
                <button className="btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={guardarNuevoCiclo} disabled={guardandoCiclo}>
                  {guardandoCiclo ? <span className="spinner" /> : <RefreshCcw size={15} />} Crear nuevo ciclo
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
