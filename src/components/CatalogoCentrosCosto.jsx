// src/components/CatalogoCentrosCosto.jsx — Centros de costo (catálogo oficial de SODISA)
// Es la MISMA colección que usa Planillas. "Usar en Planillas" decide si el centro
// aparece también en la lista de Planillas; en Solicitudes a Bodega salen todos los activos.
// Solo el administrador agrega o edita; los demás solo consultan.
import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Pencil, Plus, Save, Search, X } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../context/AuthContext'

const VACIO = { codigo: '', nombre: '', abreviatura: '', finca: '', enPlanilla: false, activo: true }

export default function CatalogoCentrosCosto() {
  const api = useApi()
  const { toast } = useToast()
  const { usuario } = useAuth()
  const esAdmin = usuario?.rol === 'admin'
  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [verInactivos, setVerInactivos] = useState(false)
  const [modal, setModal] = useState(null) // { id?, form }
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    try {
      const res = await api.get('/solicitudes-bodega/centros-costo?todos=1')
      if (res?.ok) setLista(res.data)
    } finally { setCargando(false) }
  }

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return lista
      .filter(c => verInactivos || c.activo)
      .filter(c => !q || `${c.codigo} ${c.nombre} ${c.abreviatura} ${c.finca}`.toLowerCase().includes(q))
  }, [lista, busqueda, verInactivos])

  const setForm = (patch) => setModal(m => ({ ...m, form: { ...m.form, ...patch } }))

  async function guardar() {
    const f = modal.form
    if (!f.codigo.trim() || !f.nombre.trim()) return toast('Código y nombre son obligatorios', 'error')
    setGuardando(true)
    try {
      const res = modal.id
        ? await api.put(`/solicitudes-bodega/centros-costo/${modal.id}`, f)
        : await api.post('/solicitudes-bodega/centros-costo', f)
      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')
      toast(res.mensaje, 'ok')
      setModal(null)
      cargar()
    } finally { setGuardando(false) }
  }

  async function alternarActivo(c) {
    const res = await api.put(`/solicitudes-bodega/centros-costo/${c._id}`, { activo: !c.activo })
    if (!res?.ok) return toast(res?.mensaje || 'Error', 'error')
    cargar()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="card">
        <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
            <label className="lbl">Buscar</label>
            <input className="inp" placeholder="Código, nombre o finca..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.85rem', paddingBottom: '.7rem' }}>
            <input type="checkbox" checked={verInactivos} onChange={e => setVerInactivos(e.target.checked)} /> Ver inactivos
          </label>
          {esAdmin && (
            <button className="btn-primary" onClick={() => setModal({ form: { ...VACIO } })}><Plus size={15} /> Nuevo centro</button>
          )}
        </div>
        {!esAdmin && <p style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: '.6rem' }}>Solo el administrador puede agregar o editar centros de costo.</p>}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '.75rem 1.25rem', borderBottom: '1px solid var(--border)', fontSize: '.82rem', color: 'var(--muted)' }}>
          {visibles.length} centros {busqueda && 'encontrados'}
        </div>
        <div style={{ overflowX: 'auto', maxHeight: 560, overflowY: 'auto' }}>
          <table className="tbl">
            <thead><tr><th>Código</th><th>Nombre</th><th>Abreviatura</th><th>Finca</th><th>Planillas</th><th>Estado</th>{esAdmin && <th></th>}</tr></thead>
            <tbody>
              {visibles.map(c => (
                <tr key={c._id}>
                  <td style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, whiteSpace: 'nowrap' }}>{c.codigo || <span style={{ color: '#b45309', fontWeight: 500 }}>sin código</span>}</td>
                  <td style={{ fontWeight: 500 }}>{c.nombre}</td>
                  <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.8rem', color: 'var(--muted)' }}>{c.abreviatura || '—'}</td>
                  <td style={{ fontSize: '.82rem', color: 'var(--muted)' }}>{c.finca || '—'}</td>
                  <td>{c.enPlanilla !== false ? <span className="badge badge-blue">Sí</span> : <span style={{ fontSize: '.8rem', color: 'var(--muted2)' }}>No</span>}</td>
                  <td>
                    {esAdmin ? (
                      <button type="button" onClick={() => alternarActivo(c)} className={`badge ${c.activo ? 'badge-green' : 'badge-gray'}`} style={{ border: 'none', cursor: 'pointer' }}>
                        {c.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    ) : <span className={`badge ${c.activo ? 'badge-green' : 'badge-gray'}`}>{c.activo ? 'Activo' : 'Inactivo'}</span>}
                  </td>
                  {esAdmin && (
                    <td>
                      <button className="btn-ghost" style={{ padding: '.35rem .5rem' }} title="Editar"
                        onClick={() => setModal({ id: c._id, form: { codigo: c.codigo || '', nombre: c.nombre, abreviatura: c.abreviatura || '', finca: c.finca || '', enPlanilla: c.enPlanilla !== false, activo: c.activo } })}>
                        <Pencil size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {!cargando && !visibles.length && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>Sin centros de costo{busqueda ? ' con esa búsqueda' : '. Corre seedCentrosCosto.js'}.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {modal && createPortal(
        <div onClick={e => e.target === e.currentTarget && setModal(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.5rem', width: '100%', maxWidth: 480, maxHeight: 'calc(100dvh - 2rem)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '1rem', fontWeight: 700 }}>{modal.id ? 'Editar centro de costo' : 'Nuevo centro de costo'}</h3>
              <button className="btn-ghost" onClick={() => setModal(null)} style={{ padding: '.3rem .6rem' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.9rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="lbl">Código (SODISA) *</label>
                  <input className="inp" style={{ textTransform: 'uppercase', fontFamily: 'DM Mono, monospace' }} placeholder="FSJ012" value={modal.form.codigo} onChange={e => setForm({ codigo: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="lbl">Abreviatura</label>
                  <input className="inp" value={modal.form.abreviatura} onChange={e => setForm({ abreviatura: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="lbl">Nombre *</label>
                <input className="inp" placeholder="Finca San Juan Lote 12" value={modal.form.nombre} onChange={e => setForm({ nombre: e.target.value })} />
              </div>
              <div>
                <label className="lbl">Finca / área</label>
                <input className="inp" placeholder="Finca San Juan, General..." value={modal.form.finca} onChange={e => setForm({ finca: e.target.value })} />
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '.5rem', fontSize: '.88rem' }}>
                <input type="checkbox" style={{ marginTop: '.2rem' }} checked={modal.form.enPlanilla} onChange={e => setForm({ enPlanilla: e.target.checked })} />
                <span>Usar también en Planillas<div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>Si no, solo aparece en Requisiciones a Bodega.</div></span>
              </label>
              {modal.id && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.88rem' }}>
                  <input type="checkbox" checked={modal.form.activo} onChange={e => setForm({ activo: e.target.checked })} /> Activo
                </label>
              )}
              <div style={{ display: 'flex', gap: '.75rem' }}>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setModal(null)}>Cancelar</button>
                <button className="btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={guardar} disabled={guardando}>
                  {guardando ? <span className="spinner" /> : <Save size={15} />} Guardar
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
