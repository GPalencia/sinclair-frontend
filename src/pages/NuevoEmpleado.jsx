// src/pages/NuevoEmpleado.jsx
import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Camera, RefreshCw, RotateCcw, Save, ScanFace } from 'lucide-react'

import { useNavigate } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'

export default function NuevoEmpleado() {
  const api       = useApi()
  const { toast } = useToast()
  const navigate  = useNavigate()
  const videoRef  = useRef(null)
  const [form, setForm] = useState({ nombres: '', apellidos: '', codigoEmpleado: '', numeroIdentidad: '', telefono: '', cargo: 'operario' })
  const [foto, setFoto]               = useState(null)
  const [stream, setStream]           = useState(null)
  const [descriptor, setDescriptor]   = useState(null)
  const [modelosCargados, setModelos] = useState(false)
  const [cargando, setCargando]       = useState(false)
  const [capturando, setCapturando]   = useState(false)

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

  function set(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  function formatIdentidad(v) {
    let d = v.replace(/\D/g, '').substring(0, 13)
    if (d.length > 8) d = d.slice(0,4) + '-' + d.slice(4,8) + '-' + d.slice(8)
    else if (d.length > 4) d = d.slice(0,4) + '-' + d.slice(4)
    return d
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
    if (!form.nombres || !form.apellidos || !form.numeroIdentidad) {
      return toast('Nombres, apellidos e identidad son obligatorios', 'error')
    }
    setCargando(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, k === 'codigoEmpleado' ? v.toUpperCase() : v) })
      if (foto) fd.append('foto', foto)

      const res = await api.postForm('/personal', fd)
      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')

      if (descriptor) {
        await api.put(`/personal/${res.data._id}/face-descriptor`, { descriptor })
      }

      toast('✅ Empleado registrado correctamente', 'ok')
      navigate('/personal')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 680 }}>
      <div className="fade-up" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button className="btn-ghost" onClick={() => navigate('/personal')}>Volver</button>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Nuevo Empleado</h1>
          <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>Registrar en el sistema</p>
        </div>
      </div>

      {/* Datos personales */}
      <div className="card fade-up">
        <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '.9rem', color: 'var(--muted)', marginBottom: '1.25rem', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          Datos Personales
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {[
            { label: 'Nombres *',                campo: 'nombres',         ph: 'Juan Carlos' },
            { label: 'Apellidos *',              campo: 'apellidos',       ph: 'García Rodríguez' },
            { label: 'Código Sodisa',             campo: 'codigoEmpleado',  ph: 'FG002705', upper: true },
            { label: 'Número de Identidad *',    campo: 'numeroIdentidad', ph: '0101-1990-12345', fmt: formatIdentidad },
            { label: 'Teléfono',                 campo: 'telefono',        ph: '9999-9999' },
          ].map(({ label, campo, ph, upper, fmt }) => (
            <div key={campo}>
              <label className="lbl">{label}</label>
              <input
                className="inp"
                placeholder={ph}
                value={form[campo]}
                onChange={e => set(campo, fmt ? fmt(e.target.value) : upper ? e.target.value.toUpperCase() : e.target.value)}
              />
            </div>
          ))}
          <div>
            <label className="lbl">Cargo</label>
            <select className="inp" value={form.cargo} onChange={e => set('cargo', e.target.value)}>
              {['operario','tecnico','supervisor','coordinador','otro'].map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <label className="lbl">Foto de Perfil</label>
          <input
            className="inp"
            type="file"
            accept="image/*"
            onChange={e => setFoto(e.target.files[0])}
            style={{ padding: '.5rem' }}
          />
        </div>
      </div>

      {/* Captura facial */}
      <div className="card fade-up">
        <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '.9rem', color: 'var(--muted)', marginBottom: '.5rem', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          Descriptor Facial
        </h3>
        <p style={{ fontSize: '.83rem', color: 'var(--muted)', marginBottom: '1rem' }}>
          Centra el rostro dentro del óvalo y presiona <strong>Capturar</strong>.
        </p>

        {/* Cámara con marco guía */}
        <div style={{ position: 'relative', width: '100%', maxWidth: 340, margin: '0 auto 1rem' }}>

          {/* Video */}
          <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#000', aspectRatio: '3/4' }}>
            <video
              ref={videoRef}
              autoPlay muted playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                filter: stream ? 'none' : 'brightness(0.3)' }}
            />

            {/* Overlay oscuro con hueco oval */}
            {stream && (
              <svg
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                viewBox="0 0 340 453"
                preserveAspectRatio="none"
              >
                <defs>
                  <mask id="ovalMask">
                    <rect width="340" height="453" fill="white" />
                    <ellipse cx="170" cy="200" rx="120" ry="155" fill="black" />
                  </mask>
                </defs>
                {/* Fondo oscuro con hueco oval */}
                <rect width="340" height="453" fill="rgba(0,0,0,0.55)" mask="url(#ovalMask)" />
                {/* Borde del óvalo */}
                <ellipse
                  cx="170" cy="200" rx="120" ry="155"
                  fill="none"
                  stroke={descriptor ? '#22c55e' : capturando ? '#fbbf24' : 'rgba(255,255,255,0.8)'}
                  strokeWidth="3"
                  strokeDasharray={descriptor ? 'none' : '10 5'}
                />
                {/* Esquinas decorativas */}
                <line x1="50" y1="45" x2="50" y2="30" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
                <line x1="50" y1="30" x2="65" y2="30" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
                <line x1="290" y1="45" x2="290" y2="30" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
                <line x1="290" y1="30" x2="275" y2="30" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
                <line x1="50" y1="408" x2="50" y2="423" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
                <line x1="50" y1="423" x2="65" y2="423" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
                <line x1="290" y1="408" x2="290" y2="423" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
                <line x1="290" y1="423" x2="275" y2="423" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
              </svg>
            )}

            {/* Mensaje sin cámara */}
            {!stream && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '.75rem', color: 'var(--muted)' }}>
                <span style={{ fontSize: '3rem' }}>📷</span>
                <span style={{ fontSize: '.85rem' }}>Activa la cámara</span>
              </div>
            )}

            {/* Estado en la parte inferior */}
            {stream && (
              <div style={{ position: 'absolute', bottom: '.75rem', left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,.75)', padding: '.3rem 1rem', borderRadius: 20,
                fontSize: '.78rem', fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap',
                color: descriptor ? '#4ade80' : capturando ? '#fbbf24' : 'rgba(255,255,255,.8)' }}>
                {descriptor ? '✓ Descriptor capturado' : capturando ? '⟳ Procesando...' : 'Centra tu rostro en el óvalo'}
              </div>
            )}
          </div>
        </div>

        {/* Botones */}
        <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {!stream ? (
            <button className="btn-primary" onClick={activarCamara} style={{ justifyContent: 'center' }}>
              Activar cámara
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={capturarDescriptor}
              disabled={capturando || !!descriptor}
              style={{ justifyContent: 'center',
                background: descriptor ? 'var(--verde-dark)' : 'var(--verde)' }}
            >
              {capturando ? <span className="spinner" /> : descriptor ? 'Capturado' : 'Capturar rostro'}
            </button>
          )}
          {descriptor && (
            <button className="btn-secondary" onClick={() => setDescriptor(null)} style={{ fontSize: '.82rem' }}>
              Volver a capturar
            </button>
          )}
        </div>

        {/* Instrucciones */}
        <div style={{ marginTop: '1rem', padding: '.75rem', background: 'var(--surface)', borderRadius: 8,
          fontSize: '.78rem', color: 'var(--muted)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text)' }}>💡 Consejos para mejor reconocimiento:</strong><br />
          • Buena iluminación en el rostro<br />
          • Mirar directamente a la cámara<br />
          • Evitar lentes de sol o gorras<br />
          • Mantener el rostro dentro del óvalo
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button className="btn-secondary" onClick={() => navigate('/personal')}>Cancelar</button>
        <button className="btn-primary" onClick={guardar} disabled={cargando}>
          {cargando ? <span className="spinner" /> : <Save size={15} />} Registrar Empleado
        </button>
      </div>
    </div>
  )
}
