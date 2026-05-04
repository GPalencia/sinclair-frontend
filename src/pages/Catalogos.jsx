// src/pages/Catalogos.jsx
import { useState, useEffect } from 'react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'

// ── Modal reutilizable ─────────────────────────────────
function Modal({ titulo, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.75rem', width: '100%', maxWidth: 480, animation: 'fadeUp .25s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1rem', fontWeight: 700 }}>{titulo}</h3>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize: '1.1rem', padding: '.3rem .6rem' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Formulario Labor ───────────────────────────────────
function FormLabor({ inicial, onGuardar, onCerrar, cargando }) {
  const [form, setForm] = useState(inicial || {
    codigo: '', nombre: '', pideDias: true, pideValor: false, valorDiario: '', activa: true
  })

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  function handleTipo(tipo) {
    if (tipo === 'dias')  setForm(p => ({ ...p, pideDias: true,  pideValor: false }))
    if (tipo === 'valor') setForm(p => ({ ...p, pideDias: false, pideValor: true, valorDiario: '' }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
        <div>
          <label className="lbl">Código *</label>
          <input className="inp" placeholder="F001" value={form.codigo}
            onChange={e => set('codigo', e.target.value.toUpperCase())}
            disabled={!!inicial} />
        </div>
        <div>
          <label className="lbl">Nombre *</label>
          <input className="inp" placeholder="COSECHA" value={form.nombre}
            onChange={e => set('nombre', e.target.value.toUpperCase())} />
        </div>
      </div>

      <div>
        <label className="lbl">Tipo de pago</label>
        <div style={{ display: 'flex', gap: '.5rem', marginTop: '.35rem' }}>
          {[['dias','📅 Por día (valor fijo)'],['valor','✏ Destajo (valor libre)']].map(([t, label]) => (
            <button key={t} type="button"
              onClick={() => handleTipo(t)}
              style={{
                flex: 1, padding: '.55rem', borderRadius: 8,
                border: (t === 'dias' ? form.pideDias : form.pideValor) ? '1px solid rgba(34,197,94,.4)' : '1px solid var(--border)',
                background: (t === 'dias' ? form.pideDias : form.pideValor) ? 'rgba(34,197,94,.08)' : 'transparent',
                color: (t === 'dias' ? form.pideDias : form.pideValor) ? 'var(--verde)' : 'var(--muted)',
                fontFamily: 'Syne, sans-serif', fontSize: '.8rem', cursor: 'pointer', transition: 'all .18s'
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {form.pideDias && (
        <div>
          <label className="lbl">Valor diario (Lps)</label>
          <input className="inp" type="number" placeholder="285.00" min={0} step={0.01}
            value={form.valorDiario}
            onChange={e => set('valorDiario', e.target.value)} />
        </div>
      )}

      {inicial && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <label className="lbl" style={{ margin: 0 }}>Estado:</label>
          <button type="button"
            onClick={() => set('activa', !form.activa)}
            className={`badge ${form.activa ? 'badge-green' : 'badge-red'}`}
            style={{ cursor: 'pointer', border: 'none', padding: '.3rem .8rem' }}>
            {form.activa ? '● Activa' : '○ Inactiva'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '.75rem', marginTop: '.5rem' }}>
        <button className="btn-secondary" onClick={onCerrar} style={{ flex: 1 }}>Cancelar</button>
        <button className="btn-primary" onClick={() => onGuardar(form)} disabled={cargando} style={{ flex: 1, justifyContent: 'center' }}>
          {cargando ? <span className="spinner" /> : '💾'} {inicial ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </div>
  )
}

// ── Formulario Centro de Costo ─────────────────────────
function FormCentro({ inicial, onGuardar, onCerrar, cargando }) {
  const [form, setForm] = useState(inicial || { nombre: '', finca: '', activo: true })
  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  const fincas = ['Finca Guasaule','Finca San Juan','Finca Ojo De Agua','General']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <label className="lbl">Nombre del centro *</label>
        <input className="inp" placeholder="Finca Guasaule Lote 23" value={form.nombre}
          onChange={e => set('nombre', e.target.value)} />
      </div>
      <div>
        <label className="lbl">Finca / Área</label>
        <select className="inp" value={form.finca} onChange={e => set('finca', e.target.value)}>
          <option value="">— Selecciona —</option>
          {fincas.map(f => <option key={f} value={f}>{f}</option>)}
          <option value="Otro">Otro</option>
        </select>
      </div>

      {inicial && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <label className="lbl" style={{ margin: 0 }}>Estado:</label>
          <button type="button"
            onClick={() => set('activo', !form.activo)}
            className={`badge ${form.activo ? 'badge-green' : 'badge-red'}`}
            style={{ cursor: 'pointer', border: 'none', padding: '.3rem .8rem' }}>
            {form.activo ? '● Activo' : '○ Inactivo'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '.75rem', marginTop: '.5rem' }}>
        <button className="btn-secondary" onClick={onCerrar} style={{ flex: 1 }}>Cancelar</button>
        <button className="btn-primary" onClick={() => onGuardar(form)} disabled={cargando} style={{ flex: 1, justifyContent: 'center' }}>
          {cargando ? <span className="spinner" /> : '💾'} {inicial ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </div>
  )
}

// ── Página principal ───────────────────────────────────
export default function Catalogos() {
  const api       = useApi()
  const { toast } = useToast()

  const [tab, setTab]         = useState('labores')
  const [labores, setLabores] = useState([])
  const [centros, setCentros] = useState([])
  const [buscarL, setBuscarL] = useState('')
  const [buscarC, setBuscarC] = useState('')
  const [tipoFiltro, setTipo] = useState('')
  const [fincaFiltro, setFinca] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  // Modales
  const [modalLabor, setModalLabor]   = useState(null) // null | 'nuevo' | objeto
  const [modalCentro, setModalCentro] = useState(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    const [resL, resC] = await Promise.all([
      api.get('/catalogos/labores'),
      api.get('/catalogos/centros-costo')
    ])
    if (resL?.ok) setLabores(resL.data)
    if (resC?.ok) setCentros(resC.data)
    setCargando(false)
  }

  // ── CRUD Labores ───────────────────────────────────
  async function guardarLabor(form) {
    if (!form.codigo || !form.nombre) return toast('Código y nombre son obligatorios', 'error')
    setGuardando(true)
    try {
      const body = {
        codigo:      form.codigo,
        nombre:      form.nombre,
        pideDias:    form.pideDias,
        pideValor:   form.pideValor,
        valorDiario: form.pideDias && form.valorDiario ? parseFloat(form.valorDiario) : null,
        activa:      form.activa ?? true
      }

      let res
      if (modalLabor?._id) {
        // Actualizar
        res = await api.put(`/catalogos/labores/${modalLabor._id}`, body)
      } else {
        // Crear
        res = await api.post('/catalogos/labores', body)
      }

      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')
      toast(modalLabor?._id ? '✅ Labor actualizada' : '✅ Labor creada', 'ok')
      setModalLabor(null)
      cargar()
    } finally { setGuardando(false) }
  }

  // ── CRUD Centros ───────────────────────────────────
  async function guardarCentro(form) {
    if (!form.nombre) return toast('El nombre es obligatorio', 'error')
    setGuardando(true)
    try {
      let res
      if (modalCentro?._id) {
        res = await api.put(`/catalogos/centros-costo/${modalCentro._id}`, form)
      } else {
        res = await api.post('/catalogos/centros-costo', form)
      }
      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')
      toast(modalCentro?._id ? '✅ Centro actualizado' : '✅ Centro creado', 'ok')
      setModalCentro(null)
      cargar()
    } finally { setGuardando(false) }
  }

  // ── Filtros ────────────────────────────────────────
  const laboresFiltradas = labores.filter(l => {
    const txt  = `${l.codigo} ${l.nombre}`.toLowerCase().includes(buscarL.toLowerCase())
    const tipo = tipoFiltro === 'dias' ? l.pideDias : tipoFiltro === 'valor' ? l.pideValor : true
    return txt && tipo
  })

  const centrosFiltrados = centros.filter(c => {
    const txt   = `${c.nombre} ${c.finca}`.toLowerCase().includes(buscarC.toLowerCase())
    const finca = fincaFiltro ? c.finca === fincaFiltro : true
    return txt && finca
  })

  const fincasUnicas = [...new Set(centros.map(c => c.finca).filter(Boolean))].sort()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Título */}
      <div className="fade-up">
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '.25rem' }}>Catálogos</h1>
        <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>Gestiona labores y centros de costo del sistema Sodisa</p>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }} className="fade-up">
        {[['labores', `⚙ Labores (${labores.length})`], ['centros', `📍 Centros de Costo (${centros.length})`]].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '.6rem 1.2rem', borderRadius: 8,
            border: tab === t ? '1px solid rgba(34,197,94,.3)' : '1px solid var(--border)',
            background: tab === t ? 'rgba(34,197,94,.08)' : 'transparent',
            color: tab === t ? 'var(--verde)' : 'var(--muted)',
            fontFamily: 'Syne, sans-serif', fontSize: '.85rem',
            fontWeight: tab === t ? 600 : 400, cursor: 'pointer', transition: 'all .18s',
          }}>{label}</button>
        ))}
      </div>

      {cargando ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
          <span className="spinner" />
        </div>
      ) : (
        <>
          {/* ══ LABORES ══ */}
          {tab === 'labores' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <input className="inp" style={{ flex: 1, minWidth: 200 }} placeholder="Buscar por código o nombre..."
                  value={buscarL} onChange={e => setBuscarL(e.target.value)} />
                <select className="inp" style={{ width: 'auto' }} value={tipoFiltro} onChange={e => setTipo(e.target.value)}>
                  <option value="">Todos los tipos</option>
                  <option value="dias">📅 Por día</option>
                  <option value="valor">✏ Destajo</option>
                </select>
                <button className="btn-primary" onClick={() => setModalLabor('nuevo')}>
                  + Nueva Labor
                </button>
              </div>

              <div style={{ fontSize: '.78rem', color: 'var(--muted)' }}>
                {laboresFiltradas.length} de {labores.length} labores
              </div>

              <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Nombre</th>
                        <th>Tipo</th>
                        <th>Valor Diario</th>
                        <th>Estado</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {laboresFiltradas.map(l => (
                        <tr key={l._id}>
                          <td>
                            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '.85rem', fontWeight: 600,
                              color: l.codigo.startsWith('F') ? '#60a5fa' : '#fbbf24' }}>
                              {l.codigo}
                            </span>
                          </td>
                          <td style={{ fontWeight: 500 }}>{l.nombre}</td>
                          <td>
                            {l.pideDias
                              ? <span className="badge badge-blue">📅 Por día</span>
                              : <span className="badge badge-yellow">✏ Destajo</span>}
                          </td>
                          <td>
                            {l.valorDiario != null
                              ? <span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--verde)', fontWeight: 600 }}>L {l.valorDiario.toFixed(2)}</span>
                              : <span style={{ color: 'var(--muted)' }}>—</span>}
                          </td>
                          <td>
                            <span className={`badge ${l.activa ? 'badge-green' : 'badge-gray'}`}>
                              {l.activa ? '● Activa' : '○ Inactiva'}
                            </span>
                          </td>
                          <td>
                            <button className="btn-ghost" style={{ fontSize: '.8rem' }}
                              onClick={() => setModalLabor(l)}>
                              ✎ Editar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══ CENTROS ══ */}
          {tab === 'centros' && (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <input className="inp" style={{ flex: 1, minWidth: 200 }} placeholder="Buscar por nombre o finca..."
                  value={buscarC} onChange={e => setBuscarC(e.target.value)} />
                <select className="inp" style={{ width: 'auto' }} value={fincaFiltro} onChange={e => setFinca(e.target.value)}>
                  <option value="">Todas las fincas</option>
                  {fincasUnicas.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <button className="btn-primary" onClick={() => setModalCentro('nuevo')}>
                  + Nuevo Centro
                </button>
              </div>

              <div style={{ fontSize: '.78rem', color: 'var(--muted)' }}>
                {centrosFiltrados.length} de {centros.length} centros de costo
              </div>

              <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Centro de Costo</th>
                        <th>Finca / Área</th>
                        <th>Estado</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {centrosFiltrados.map(c => (
                        <tr key={c._id}>
                          <td style={{ fontWeight: 500 }}>{c.nombre}</td>
                          <td style={{ color: 'var(--muted)', fontSize: '.85rem' }}>{c.finca || '—'}</td>
                          <td>
                            <span className={`badge ${c.activo ? 'badge-green' : 'badge-gray'}`}>
                              {c.activo ? '● Activo' : '○ Inactivo'}
                            </span>
                          </td>
                          <td>
                            <button className="btn-ghost" style={{ fontSize: '.8rem' }}
                              onClick={() => setModalCentro(c)}>
                              ✎ Editar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Modal Labor ── */}
      {modalLabor && (
        <Modal
          titulo={modalLabor === 'nuevo' ? 'Nueva Labor' : `Editar — ${modalLabor.codigo}`}
          onClose={() => setModalLabor(null)}
        >
          <FormLabor
            inicial={modalLabor === 'nuevo' ? null : modalLabor}
            onGuardar={guardarLabor}
            onCerrar={() => setModalLabor(null)}
            cargando={guardando}
          />
        </Modal>
      )}

      {/* ── Modal Centro ── */}
      {modalCentro && (
        <Modal
          titulo={modalCentro === 'nuevo' ? 'Nuevo Centro de Costo' : `Editar — ${modalCentro.nombre}`}
          onClose={() => setModalCentro(null)}
        >
          <FormCentro
            inicial={modalCentro === 'nuevo' ? null : modalCentro}
            onGuardar={guardarCentro}
            onCerrar={() => setModalCentro(null)}
            cargando={guardando}
          />
        </Modal>
      )}
    </div>
  )
}
