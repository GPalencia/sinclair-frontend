// src/pages/Personal.jsx
import { useState, useEffect } from 'react'
import { ClipboardList, Pencil, Plus, Search, UserPlus, UserX } from 'lucide-react'

import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { useNavigate } from 'react-router-dom'

// ── Modal de edición ──────────────────────────────────
function ModalEditar({ persona, onCerrar, onGuardado }) {
  const api       = useApi()
  const { toast } = useToast()
  const videoRef  = useRef(null)
  const [form, setForm] = useState({
    nombres:         persona.nombres        || '',
    apellidos:       persona.apellidos      || '',
    codigoEmpleado:  persona.codigoEmpleado || '',
    numeroIdentidad: persona.numeroIdentidad|| '',
    telefono:        persona.telefono       || '',
    cargo:           persona.cargo          || 'operario',
    activo:          persona.activo !== false,
  })
  const [guardando, setGuardando]     = useState(false)
  const [stream, setStream]           = useState(null)
  const [capturando, setCapturando]   = useState(false)
  const [nuevoDescriptor, setNuevoDesc] = useState(null)
  const [modelosCargados, setModelos] = useState(false)
  const [mostrarCamara, setMostrarCamara] = useState(false)

  // Limpiar cámara al cerrar
  const cerrarConLimpieza = () => {
    stream?.getTracks().forEach(t => t.stop())
    onCerrar()
  }

  async function activarCamara() {
    setMostrarCamara(true)
    try {
      if (!window.faceapi) return toast('face-api.js no disponible', 'error')
      if (!modelosCargados) {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/modelos'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/modelos'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/modelos'),
        ])
        setModelos(true)
      }
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      setStream(s)
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = s
      }, 100)
    } catch { toast('No se pudo acceder a la cámara', 'error') }
  }

  async function capturarFaceID() {
    if (!videoRef.current) return
    setCapturando(true)
    try {
      const det = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks().withFaceDescriptor()
      if (!det) { toast('No se detectó rostro, ajusta la posición', 'warn'); return }
      setNuevoDescriptor(Array.from(det.descriptor))
      stream?.getTracks().forEach(t => t.stop())
      setStream(null)
      toast('✅ Descriptor facial capturado', 'ok')
    } catch { toast('Error al capturar', 'error') }
    finally { setCapturando(false) }
  }

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
        if (v !== null && v !== undefined)
          fd.append(k, k === 'codigoEmpleado' ? String(v).toUpperCase() : v)
      })
      const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/personal/${persona._id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('sinclair_token')}` },
        body: fd
      }).then(r => r.json())
      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')

      // Si hay nuevo descriptor facial, guardarlo
      if (nuevoDescriptor) {
        const resDesc = await api.put(`/personal/${persona._id}/face-descriptor`, { descriptor: nuevoDescriptor })
        if (!resDesc?.ok) toast('Datos guardados pero error al actualizar Face ID', 'warn')
        else toast('✅ Empleado y Face ID actualizados', 'ok')
      } else {
        toast('✅ Empleado actualizado', 'ok')
      }
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

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1rem', fontWeight: 700 }}>
            Editar — {persona.nombres} {persona.apellidos}
          </h3>
          <button className="btn-ghost" onClick={cerrarConLimpieza} style={{ fontSize: '1.1rem' }}>✕</button>
        </div>

        {/* Formulario */}
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
              {['operario','tecnico','supervisor','coordinador','otro'].map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Face ID ── */}
        <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.75rem' }}>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '.82rem', fontWeight: 600 }}>
                Reconocimiento Facial
              </div>
              <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: '.15rem' }}>
                {nuevoDescriptor
                  ? '✅ Nuevo descriptor listo para guardar'
                  : persona.faceDescriptor?.length
                    ? '✓ Face ID registrado — puedes reemplazarlo'
                    : '⚠ Sin Face ID — captúralo para habilitar reconocimiento'}
              </div>
            </div>
            {!mostrarCamara && (
              <button className="btn-secondary" onClick={activarCamara} style={{ fontSize: '.8rem', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                <Camera size={14} />
                {persona.faceDescriptor?.length ? 'Recapturar' : 'Capturar Face ID'}
              </button>
            )}
          </div>

          {/* Cámara */}
          {mostrarCamara && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#000', aspectRatio: '4/3', maxWidth: 280, margin: '0 auto' }}>
                <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {stream && (
                  <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                    viewBox="0 0 280 210" preserveAspectRatio="none">
                    <defs>
                      <mask id="ovalEdit">
                        <rect width="280" height="210" fill="white" />
                        <ellipse cx="140" cy="100" rx="90" ry="95" fill="black" />
                      </mask>
                    </defs>
                    <rect width="280" height="210" fill="rgba(0,0,0,0.5)" mask="url(#ovalEdit)" />
                    <ellipse cx="140" cy="100" rx="90" ry="95" fill="none"
                      stroke={nuevoDescriptor ? '#22c55e' : 'rgba(255,255,255,0.8)'}
                      strokeWidth="2" strokeDasharray={nuevoDescriptor ? 'none' : '8 4'} />
                  </svg>
                )}
                {!stream && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '.8rem' }}>
                    Activando cámara...
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'center' }}>
                {!nuevoDescriptor ? (
                  <button className="btn-primary" onClick={capturarFaceID} disabled={capturando || !stream}
                    style={{ justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                    {capturando ? <span className="spinner" /> : <ScanFace size={15} />}
                    Capturar
                  </button>
                ) : (
                  <button className="btn-secondary" onClick={() => { setNuevoDescriptor(null); activarCamara() }}
                    style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.82rem' }}>
                    <RotateCcw size={13} /> Volver a capturar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Estado activo/inactivo */}
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

        {/* Botones */}
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

// ── Página principal ──────────────────────────────────
export default function Personal() {
  const api        = useApi()
  const { toast }  = useToast()
  const navigate   = useNavigate()
  const [personal, setPersonal]     = useState([])
  const [filtrado, setFiltrado]     = useState([])
  const [buscar, setBuscar]         = useState('')
  const [cargando, setCargando]     = useState(true)
  const [editando, setEditando]     = useState(null) // persona que se está editando

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

      {/* Modal editar */}
      {editando && (
        <ModalEditar
          persona={editando}
          onCerrar={() => setEditando(null)}
          onGuardado={() => { setEditando(null); cargar() }}
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
                  <th>Estado</th>
                  <th>Face ID</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrado.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>
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
