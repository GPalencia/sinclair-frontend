// src/pages/Personal.jsx
import { useState, useEffect, useRef } from 'react'
import { ClipboardList, FileText, Pencil, Plus, ScanFace, UserX } from 'lucide-react'

import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { useNavigate } from 'react-router-dom'


// ── Modal de Contrato ─────────────────────────
function ModalContrato({ persona, onCerrar, onGuardado }) {
  const api       = useApi()
  const { toast } = useToast()

  const hoy = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    fechaInicio:  hoy,
    diasContrato: 50,
    observaciones: ''
  })
  const [historial, setHistorial] = useState([])
  const [tab, setTab]             = useState('nuevo')   // 'nuevo' | 'historial'
  const [guardando, setGuardando] = useState(false)
  const [cargando, setCargando]   = useState(false)

  useEffect(() => { cargarHistorial() }, [])

  async function cargarHistorial() {
    setCargando(true)
    const res = await api.get(`/contratos/empleado/${persona._id}`)
    if (res?.ok) setHistorial(res.data)
    setCargando(false)
  }

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  // Calcular fecha fin preview
  const fechaFinPreview = (() => {
    if (!form.fechaInicio) return '—'
    const d = new Date(form.fechaInicio)
    d.setDate(d.getDate() + Number(form.diasContrato))
    return d.toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  })()

  async function guardar() {
    if (!form.fechaInicio) return toast('La fecha de inicio es obligatoria', 'error')
    setGuardando(true)
    try {
      const res = await api.post('/contratos', {
        personalId:    persona._id,
        fechaInicio:   form.fechaInicio,
        diasContrato:  Number(form.diasContrato),
        observaciones: form.observaciones
      })
      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')
      toast('✅ Contrato registrado', 'ok')
      setTab('historial')
      cargarHistorial()
      onGuardado()
    } finally { setGuardando(false) }
  }

  const badgeEstado = (estado, dias) => {
    if (estado === 'activo' && dias <= 5)  return { cls: 'badge-red',  label: `⚠ ${dias}d restantes` }
    if (estado === 'activo' && dias <= 10) return { cls: 'badge-red',  label: `${dias}d restantes` }
    if (estado === 'activo')               return { cls: 'badge-green', label: `${dias}d restantes` }
    if (estado === 'renovado')             return { cls: 'badge-gray',  label: 'Renovado' }
    return                                        { cls: 'badge-red',   label: 'Vencido' }
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onCerrar()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14,
        padding: '1.75rem', width: '100%', maxWidth: 500, animation: 'fadeUp .25s ease',
        maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1rem', fontWeight: 700 }}>
              Contrato — {persona.nombres} {persona.apellidos}
            </h3>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '.75rem', color: 'var(--verde)' }}>
              {persona.codigoEmpleado || 'Sin código'}
            </span>
          </div>
          <button className="btn-ghost" onClick={onCerrar} style={{ fontSize: '1.1rem' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.25rem' }}>
          {[['nuevo', 'Nuevo Contrato'], ['historial', `Historial (${historial.length})`]].map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '.45rem', borderRadius: 8, cursor: 'pointer',
              border: tab === t ? '1px solid rgba(34,197,94,.3)' : '1px solid var(--border)',
              background: tab === t ? 'rgba(34,197,94,.08)' : 'transparent',
              color: tab === t ? 'var(--verde)' : 'var(--muted)',
              fontFamily: 'Syne, sans-serif', fontSize: '.8rem', fontWeight: tab === t ? 600 : 400
            }}>{label}</button>
          ))}
        </div>

        {/* Tab: Nuevo contrato */}
        {tab === 'nuevo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="lbl">Fecha de inicio *</label>
                <input className="inp" type="date" value={form.fechaInicio}
                  onChange={e => set('fechaInicio', e.target.value)} />
              </div>
              <div>
                <label className="lbl">Días de contrato</label>
                <input className="inp" type="number" min={1} max={365} value={form.diasContrato}
                  onChange={e => set('diasContrato', e.target.value)} />
              </div>
            </div>

            {/* Preview fecha fin */}
            <div style={{ padding: '.65rem 1rem', background: 'var(--surface)',
              borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '.82rem', color: 'var(--muted)' }}>Fecha de vencimiento</span>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '.9rem',
                fontWeight: 600, color: 'var(--verde)' }}>{fechaFinPreview}</span>
            </div>

            <div>
              <label className="lbl">Observaciones</label>
              <input className="inp" placeholder="Contrato temporal, renovación, etc."
                value={form.observaciones} onChange={e => set('observaciones', e.target.value)} />
            </div>

            {historial.some(c => c.estado === 'activo') && (
              <div style={{ padding: '.65rem 1rem', background: 'rgba(234,179,8,.06)',
                border: '1px solid rgba(234,179,8,.25)', borderRadius: 8,
                fontSize: '.8rem', color: '#ca8a04' }}>
                ⚠ Este empleado ya tiene un contrato activo. Al guardar, el contrato anterior
                quedará marcado como <strong>Renovado</strong>.
              </div>
            )}

            <div style={{ display: 'flex', gap: '.75rem', marginTop: '.5rem' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={onCerrar}>Cancelar</button>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}
                onClick={guardar} disabled={guardando}>
                {guardando ? <span className="spinner" /> : null} Registrar Contrato
              </button>
            </div>
          </div>
        )}

        {/* Tab: Historial */}
        {tab === 'historial' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
            {cargando ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}><span className="spinner" /></div>
            ) : historial.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', fontSize: '.85rem' }}>
                Sin contratos registrados
              </div>
            ) : historial.map((c, i) => {
              const { cls, label } = badgeEstado(c.estado, c.diasRestantes)
              return (
                <div key={c._id} style={{ padding: '.85rem 1rem', background: 'var(--surface)',
                  borderRadius: 10, border: '1px solid var(--border)',
                  borderLeft: i === 0 && c.estado === 'activo' ? '3px solid var(--verde)' : '3px solid transparent' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.3rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '.88rem' }}>
                      Contrato #{historial.length - i}
                    </span>
                    <span className={`badge ${cls}`}>{label}</span>
                  </div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '.76rem', color: 'var(--muted)', lineHeight: 1.8 }}>
                    <span>Inicio: {new Date(c.fechaInicio).toLocaleDateString('es-HN')}</span>
                    <span style={{ margin: '0 .6rem' }}>→</span>
                    <span>Fin: {new Date(c.fechaFin).toLocaleDateString('es-HN')}</span>
                    <span style={{ marginLeft: '.6rem' }}>({c.diasContrato}d)</span>
                  </div>
                  {c.observaciones && (
                    <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: '.3rem' }}>
                      {c.observaciones}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Modal de edición de datos ─────────────────────────
function ModalEditar({ persona, onCerrar, onGuardado }) {
  const api       = useApi()
  const { toast } = useToast()
  const [form, setForm] = useState({
    nombres:         persona.nombres         || '',
    apellidos:       persona.apellidos       || '',
    codigoEmpleado:  persona.codigoEmpleado  || '',
    numeroIdentidad: persona.numeroIdentidad || '',
    telefono:        persona.telefono        || '',
    cargo:           persona.cargo           || 'operario',
    activo:          persona.activo !== false,
    FechaIngreso:    persona.FechaIngreso
                       ? new Date(persona.FechaIngreso).toISOString().split('T')[0]
                       : '',
  })
  const [guardando, setGuardando] = useState(false)

  function set(k, v) { setForm(p => ({ ...p, [k]: v })) }

  function formatIdentidad(v) {
    let d = v.replace(/\D/g, '').substring(0, 13)
    if (d.length > 8) d = d.slice(0,4) + '-' + d.slice(4,8) + '-' + d.slice(8)
    else if (d.length > 4) d = d.slice(0,4) + '-' + d.slice(4)
    return d
  }

  async function guardar() {
    if (!form.nombres || !form.apellidos) return toast('Nombres y apellidos son obligatorios', 'error')
    setGuardando(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== '')
          fd.append(k, k === 'codigoEmpleado' ? String(v).toUpperCase() : v)
      })
      const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/personal/${persona._id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('sinclair_token')}` },
        body: fd
      }).then(r => r.json())

      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')
      toast('✅ Empleado actualizado', 'ok')
      onGuardado()
    } finally { setGuardando(false) }
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onCerrar()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14,
        padding: '1.75rem', width: '100%', maxWidth: 520, animation: 'fadeUp .25s ease',
        maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1rem', fontWeight: 700 }}>
            Editar — {persona.nombres} {persona.apellidos}
          </h3>
          <button className="btn-ghost" onClick={onCerrar} style={{ fontSize: '1.1rem' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label className="lbl">Nombres *</label>
            <input className="inp" value={form.nombres} onChange={e => set('nombres', e.target.value)} />
          </div>
          <div>
            <label className="lbl">Apellidos *</label>
            <input className="inp" value={form.apellidos} onChange={e => set('apellidos', e.target.value)} />
          </div>
          <div>
            <label className="lbl">Código Sodisa</label>
            <input className="inp" value={form.codigoEmpleado}
              onChange={e => set('codigoEmpleado', e.target.value.toUpperCase())}
              placeholder="FG002705" />
          </div>
          <div>
            <label className="lbl">Número de Identidad</label>
            <input className="inp" value={form.numeroIdentidad}
              onChange={e => set('numeroIdentidad', formatIdentidad(e.target.value))}
              placeholder="0101-1990-12345" maxLength={15} />
          </div>
          <div>
            <label className="lbl">Teléfono</label>
            <input className="inp" value={form.telefono}
              onChange={e => set('telefono', e.target.value)}
              placeholder="9999-9999" />
          </div>
          <div>
            <label className="lbl">Cargo</label>
            <select className="inp" value={form.cargo} onChange={e => set('cargo', e.target.value)}>
              {['operario','tecnico','supervisor','coordinador','otro','empaque'].map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="lbl">Fecha de Ingreso</label>
            <input
              className="inp"
              type="date"
              value={form.FechaIngreso}
              onChange={e => set('FechaIngreso', e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <label className="lbl" style={{ margin: 0 }}>Estado:</label>
          <button
            type="button"
            onClick={() => set('activo', !form.activo)}
            className={`badge ${form.activo ? 'badge-green' : 'badge-red'}`}
            style={{ cursor: 'pointer', border: 'none', padding: '.35rem .9rem', fontSize: '.8rem' }}
          >
            {form.activo ? '● Activo' : '○ Inactivo'}
          </button>
          <span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>
            {form.activo ? 'El empleado puede hacer registros' : 'El empleado no aparecerá en búsquedas'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '.75rem', marginTop: '1.5rem' }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onCerrar}>Cancelar</button>
          <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}
            onClick={guardar} disabled={guardando}>
            {guardando ? <span className="spinner" /> : null} Guardar cambios
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal para asignar Face ID ────────────────────────
function ModalFaceId({ persona, onCerrar, onGuardado }) {
  const { toast } = useToast()
  const videoRef  = useRef(null)
  const [stream, setStream]           = useState(null)
  const [descriptor, setDescriptor]   = useState(null)
  const [modelosCargados, setModelos] = useState(false)
  const [capturando, setCapturando]   = useState(false)
  const [guardando, setGuardando]     = useState(false)

  useEffect(() => { cargarModelos() }, [])
  useEffect(() => () => { stream?.getTracks().forEach(t => t.stop()) }, [stream])

  async function cargarModelos() {
    try {
      if (!window.faceapi) return
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/modelos'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/modelos'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/modelos'),
      ])
      setModelos(true)
    } catch {}
  }

  async function activarCamara() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      setStream(s)
      if (videoRef.current) videoRef.current.srcObject = s
    } catch { toast('No se pudo acceder a la cámara', 'error') }
  }

  async function capturarDescriptor() {
    if (!modelosCargados) return toast('Modelos de IA cargando...', 'info')
    if (!videoRef.current) return
    setCapturando(true)
    try {
      const det = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks().withFaceDescriptor()
      if (!det) { toast('No se detectó rostro, ajusta la posición', 'warn'); return }
      setDescriptor(Array.from(det.descriptor))
      toast('✅ Descriptor facial capturado', 'ok')
    } catch { toast('Error al capturar', 'error') }
    finally { setCapturando(false) }
  }

  async function guardar() {
    if (!descriptor) return toast('Primero captura el rostro', 'error')
    setGuardando(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || '/api'}/personal/${persona._id}/face-descriptor`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('sinclair_token')}`
          },
          body: JSON.stringify({ descriptor })
        }
      ).then(r => r.json())

      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar Face ID', 'error')
      toast('✅ Face ID asignado correctamente', 'ok')
      onGuardado()
    } finally { setGuardando(false) }
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onCerrar()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14,
        padding: '1.75rem', width: '100%', maxWidth: 400, animation: 'fadeUp .25s ease',
        maxHeight: '95vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1rem', fontWeight: 700 }}>
              Asignar Face ID
            </h3>
            <p style={{ fontSize: '.82rem', color: 'var(--muted)' }}>
              {persona.nombres} {persona.apellidos}
              {persona.codigoEmpleado && (
                <span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--verde)', marginLeft: '.5rem' }}>
                  {persona.codigoEmpleado}
                </span>
              )}
            </p>
          </div>
          <button className="btn-ghost" onClick={onCerrar} style={{ fontSize: '1.1rem' }}>✕</button>
        </div>

        {/* Badge si ya tiene Face ID */}
        {persona.faceDescriptor && (
          <div style={{ marginBottom: '1rem', padding: '.6rem .9rem', background: 'rgba(34,197,94,.1)',
            border: '1px solid rgba(34,197,94,.3)', borderRadius: 8, fontSize: '.8rem', color: '#16a34a' }}>
            ✓ Este empleado ya tiene Face ID registrado. Puedes reemplazarlo capturando uno nuevo.
          </div>
        )}

        {/* Cámara */}
        <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden',
          background: '#000', aspectRatio: '3/4', maxWidth: 280, margin: '0 auto 1rem' }}>
          <video
            ref={videoRef}
            autoPlay muted playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              filter: stream ? 'none' : 'brightness(0.3)' }}
          />

          {stream && (
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
              viewBox="0 0 280 373" preserveAspectRatio="none">
              <defs>
                <mask id="ovalMaskFace">
                  <rect width="280" height="373" fill="white" />
                  <ellipse cx="140" cy="165" rx="95" ry="125" fill="black" />
                </mask>
              </defs>
              <rect width="280" height="373" fill="rgba(0,0,0,0.55)" mask="url(#ovalMaskFace)" />
              <ellipse cx="140" cy="165" rx="95" ry="125"
                fill="none"
                stroke={descriptor ? '#22c55e' : capturando ? '#fbbf24' : 'rgba(255,255,255,0.8)'}
                strokeWidth="3"
                strokeDasharray={descriptor ? 'none' : '8 4'} />
            </svg>
          )}

          {!stream && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '.75rem', color: 'var(--muted)' }}>
              <span style={{ fontSize: '2.5rem' }}>📷</span>
              <span style={{ fontSize: '.82rem' }}>Activa la cámara</span>
            </div>
          )}

          {stream && (
            <div style={{ position: 'absolute', bottom: '.6rem', left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,.75)', padding: '.25rem .9rem', borderRadius: 20,
              fontSize: '.75rem', fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap',
              color: descriptor ? '#4ade80' : capturando ? '#fbbf24' : 'rgba(255,255,255,.8)' }}>
              {descriptor ? '✓ Descriptor capturado' : capturando ? '⟳ Procesando...' : 'Centra tu rostro'}
            </div>
          )}
        </div>

        {/* Botones cámara */}
        <div style={{ display: 'flex', gap: '.6rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {!stream ? (
            <button className="btn-primary" onClick={activarCamara} style={{ justifyContent: 'center' }}>
              Activar cámara
            </button>
          ) : (
            <button className="btn-primary" onClick={capturarDescriptor}
              disabled={capturando || !!descriptor}
              style={{ justifyContent: 'center', background: descriptor ? 'var(--verde-dark)' : 'var(--verde)' }}>
              {capturando ? <span className="spinner" /> : descriptor ? 'Capturado ✓' : 'Capturar rostro'}
            </button>
          )}
          {descriptor && (
            <button className="btn-secondary" onClick={() => setDescriptor(null)} style={{ fontSize: '.82rem' }}>
              Volver a capturar
            </button>
          )}
        </div>

        {/* Acciones finales */}
        <div style={{ display: 'flex', gap: '.75rem' }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onCerrar}>Cancelar</button>
          <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}
            onClick={guardar} disabled={!descriptor || guardando}>
            {guardando ? <span className="spinner" /> : <ScanFace size={15} />} Guardar Face ID
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────
export default function Personal() {
  const api        = useApi()
  const { toast }  = useToast()
  const navigate   = useNavigate()
  const [personal, setPersonal]     = useState([])
  const [filtrado, setFiltrado]     = useState([])
  const [buscar, setBuscar]         = useState('')
  const [cargando, setCargando]     = useState(true)
  const [editando, setEditando]         = useState(null)   // modal editar datos
  const [asignandoFace, setAsignandoFace] = useState(null) // modal face id
  const [contratando, setContratando]    = useState(null)   // modal contrato

  useEffect(() => { cargar() }, [])
  useEffect(() => {
    const txt = buscar.toLowerCase()
    setFiltrado(personal.filter(p =>
      `${p.nombres} ${p.apellidos} ${p.codigoEmpleado || ''} ${p.numeroIdentidad || ''}`.toLowerCase().includes(txt)
    ))
  }, [buscar, personal])

  async function cargar() {
    setCargando(true)
    const res = await api.get('/personal')
    if (res?.ok) { setPersonal(res.data); setFiltrado(res.data) }
    setCargando(false)
  }

  async function desactivar(id, nombre) {
    if (!confirm(`¿Desactivar a ${nombre}? Podrás reactivarlo editando el empleado.`)) return
    const res = await api.del(`/personal/${id}`)
    if (res?.ok) { toast('Empleado desactivado', 'ok'); cargar() }
    else toast(res?.mensaje || 'Error', 'error')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Modal editar datos */}
      {editando && (
        <ModalEditar
          persona={editando}
          onCerrar={() => setEditando(null)}
          onGuardado={() => { setEditando(null); cargar() }}
        />
      )}

      {/* Modal contrato */}
      {contratando && (
        <ModalContrato
          persona={contratando}
          onCerrar={() => setContratando(null)}
          onGuardado={() => setContratando(null)}
        />
      )}

      {/* Modal asignar Face ID */}
      {asignandoFace && (
        <ModalFaceId
          persona={asignandoFace}
          onCerrar={() => setAsignandoFace(null)}
          onGuardado={() => { setAsignandoFace(null); cargar() }}
        />
      )}

      {/* Título */}
      <div className="fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '.25rem' }}>Personal</h1>
          <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>{personal.length} empleados registrados</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/personal/nuevo')}>
          <Plus size={16} /> Nuevo Empleado
        </button>
      </div>

      {/* Buscador */}
      <input
        className="inp fade-up"
        placeholder="Buscar por nombre, código Sodisa o identidad..."
        value={buscar}
        onChange={e => setBuscar(e.target.value)}
      />

      {/* Tabla */}
      <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
        {cargando ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <span className="spinner" />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Código Sodisa</th>
                  <th>Nombre</th>
                  <th>Identidad</th>
                  <th>Cargo</th>
                  <th>Ingreso</th>
                  <th>Estado</th>
                  <th>Face ID</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrado.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>
                      {buscar ? 'Sin resultados para esa búsqueda' : 'Sin personal registrado'}
                    </td>
                  </tr>
                ) : filtrado.map(p => (
                  <tr key={p._id}>
                    <td>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem', color: 'var(--verde)' }}>
                        {p.codigoEmpleado || '—'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{p.nombres} {p.apellidos}</td>
                    <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.8rem', color: 'var(--muted)' }}>
                      {p.numeroIdentidad || '—'}
                    </td>
                    <td>
                      <span className="badge badge-gray">{p.cargo}</span>
                    </td>
                    <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.8rem', color: 'var(--muted)' }}>
                      {p.FechaIngreso
                        ? new Date(p.FechaIngreso).toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        : '—'}
                    </td>
                    <td>
                      <span className={`badge ${p.activo ? 'badge-green' : 'badge-red'}`}>
                        {p.activo ? '● Activo' : '○ Inactivo'}
                      </span>
                    </td>
                    <td>
                      {p.faceDescriptor
                        ? <span className="badge badge-green">✓ Face ID</span>
                        : <span className="badge badge-red">Sin Face ID</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '.4rem' }}>
                        <button
                          className="btn-ghost"
                          style={{ padding: '.4rem .5rem' }}
                          onClick={() => navigate(`/registro?id=${p._id}&nombre=${p.nombres} ${p.apellidos}&codigo=${p.codigoEmpleado || ''}&cargo=${p.cargo}`)}
                          title="Registrar planilla"
                        >
                          <ClipboardList size={15} />
                        </button>
                        <button
                          className="btn-ghost"
                          style={{ padding: '.4rem .5rem', color: '#2563eb' }}
                          onClick={() => setEditando(p)}
                          title="Editar empleado"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="btn-ghost"
                          style={{ padding: '.4rem .5rem', color: '#7c3aed' }}
                          onClick={() => setContratando(p)}
                          title="Gestionar contrato"
                        >
                          <FileText size={15} />
                        </button>
                        {/* Botón Face ID — verde si ya tiene, amarillo si falta */}
                        <button
                          className="btn-ghost"
                          style={{
                            padding: '.4rem .5rem',
                            color: p.faceDescriptor ? '#16a34a' : '#d97706'
                          }}
                          onClick={() => setAsignandoFace(p)}
                          title={p.faceDescriptor ? 'Actualizar Face ID' : 'Asignar Face ID'}
                        >
                          <ScanFace size={15} />
                        </button>
                        {p.activo && (
                          <button
                            className="btn-ghost"
                            style={{ padding: '.4rem .5rem', color: 'var(--danger)' }}
                            onClick={() => desactivar(p._id, `${p.nombres} ${p.apellidos}`)}
                            title="Desactivar empleado"
                          >
                            <UserX size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}