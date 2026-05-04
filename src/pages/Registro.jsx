// src/pages/Registro.jsx
import { useState, useEffect, useRef } from 'react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { useSearchParams } from 'react-router-dom'

function hoy() { return new Date().toISOString().split('T')[0] }

export default function Registro() {
  const api          = useApi()
  const { toast }    = useToast()
  const [params]     = useSearchParams()
  const videoRef     = useRef(null)

  // Catálogos
  const [labores, setLabores]   = useState([])
  const [centros, setCentros]   = useState([])
  const [descriptoresBD, setDescBD] = useState([])

  // Estado empleado
  const [persona, setPersona]   = useState(null)
  const [modo, setModo]         = useState('facial') // facial | codigo | identidad

  // Formulario planilla
  const [centroCostoId, setCentro]  = useState('')
  const [laborId, setLabor]         = useState('')
  const [dias, setDias]             = useState(1)
  const [valorManual, setValor]     = useState('')
  const [fecha, setFecha]           = useState(hoy())
  const [obs, setObs]               = useState('')
  const [laborSel, setLaborSel]     = useState(null)

  // Búsqueda
  const [inputCodigo, setInputCodigo] = useState('')
  const [inputId, setInputId]         = useState('')

  // Cámara
  const [stream, setStream]           = useState(null)
  const [modelosCargados, setModelos] = useState(false)
  const [estadoCam, setEstadoCam]     = useState('Sin cámara')
  const [cargandoModelos, setCargandoM] = useState(false)

  const [guardando, setGuardando] = useState(false)
  const [salarioEditable, setSalarioEditable] = useState('')

  useEffect(() => {
    cargarCatalogos()
    cargarModelos()
    // Si viene desde la tabla de personal
    const id     = params.get('id')
    const nombre = params.get('nombre')
    const codigo = params.get('codigo')
    const cargo  = params.get('cargo')
    if (id && nombre) setPersona({ _id: id, nombres: nombre.split(' ')[0], apellidos: nombre.split(' ').slice(1).join(' '), codigoEmpleado: codigo, cargo })
  }, [])

  useEffect(() => () => { stream?.getTracks().forEach(t => t.stop()) }, [stream])

  useEffect(() => {
    const l = labores.find(x => x._id === laborId) || null
    setLaborSel(l)
    if (l?.pideDias && l?.valorDiario) {
      setDias(1)
      setSalarioEditable(l.valorDiario.toFixed(2))
    } else if (l?.pideValor) {
      setSalarioEditable('')
    } else {
      setSalarioEditable('')
    }
    setValor('')
  }, [laborId])

  async function cargarCatalogos() {
    const [resL, resC] = await Promise.all([
      api.get('/catalogos/labores'),
      api.get('/catalogos/centros-costo')
    ])
    if (resL?.ok) setLabores(resL.data)
    if (resC?.ok) setCentros(resC.data)
  }

  async function cargarModelos() {
    if (!window.faceapi) return
    setCargandoM(true)
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/modelos'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/modelos'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/modelos'),
      ])
      setModelos(true)
      // Cargar descriptores de BD
      const res = await api.get('/personal/face-descriptors')
      if (res?.ok) {
        setDescBD(res.data.map(p => ({ personal: p, descriptor: new Float32Array(p.faceDescriptor) })))
      }
    } catch {}
    setCargandoM(false)
  }

  async function activarCamara() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      setStream(s)
      if (videoRef.current) videoRef.current.srcObject = s
      setEstadoCam('● En vivo')
    } catch { toast('No se pudo acceder a la cámara', 'error') }
  }

  async function reconocer() {
    if (!modelosCargados) return toast('Modelos cargando...', 'info')
    if (!descriptoresBD.length) return toast('No hay empleados con Face ID', 'info')
    if (!videoRef.current) return
    try {
      const det = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks().withFaceDescriptor()
      if (!det) { toast('No se detectó rostro', 'warn'); return }
      const etiquetadas = descriptoresBD.map(d => new faceapi.LabeledFaceDescriptors(d.personal._id, [d.descriptor]))
      const match = new faceapi.FaceMatcher(etiquetadas, 0.5).findBestMatch(det.descriptor)
      if (match.label === 'unknown') { toast('Persona no identificada', 'error'); return }
      const entrada = descriptoresBD.find(d => d.personal._id === match.label)
      if (entrada) {
        setPersona({ ...entrada.personal, confianza: ((1 - match.distance) * 100).toFixed(1), metodo: 'facial' })
        setEstadoCam('✓ Identificado')
        toast(`✅ ${entrada.personal.nombres} ${entrada.personal.apellidos}`, 'ok')
      }
    } catch (e) { toast('Error en reconocimiento', 'error') }
  }

  async function buscarCodigo() {
    if (!inputCodigo) return toast('Ingresa el código', 'warn')
    const res = await api.get(`/personal?buscar=${inputCodigo}`)
    const encontrado = (res?.data || []).find(p => p.codigoEmpleado?.toUpperCase() === inputCodigo.toUpperCase())
    if (!encontrado) return toast('No se encontró empleado con ese código', 'error')
    setPersona({ ...encontrado, metodo: 'codigo' })
    toast(`✅ ${encontrado.nombres} ${encontrado.apellidos}`, 'ok')
  }

  async function buscarIdentidad() {
    if (!inputId) return toast('Ingresa la identidad', 'warn')
    const res = await api.get(`/personal/identidad/${encodeURIComponent(inputId)}`)
    if (!res?.ok) return toast(res?.mensaje || 'No encontrado', 'error')
    setPersona({ ...res.data, metodo: 'identidad' })
    toast(`✅ ${res.data.nombres} ${res.data.apellidos}`, 'ok')
  }

  async function guardar() {
    if (!persona)       return toast('Identifica un empleado primero', 'error')
    if (!centroCostoId) return toast('Selecciona el centro de costo', 'error')
    if (!laborId)       return toast('Selecciona la labor', 'error')

    let salario = 0
    let salarioManual = false
    if (laborSel?.pideDias) {
      if (!salarioEditable) return toast('Ingresa el salario', 'error')
      salario = parseFloat(salarioEditable)
      // Si el supervisor modificó el valor del catálogo, marcarlo como manual
      const referencia = laborSel.valorDiario ? dias * laborSel.valorDiario : null
      salarioManual = referencia ? Math.abs(salario - referencia) > 0.01 : true
    } else if (laborSel?.pideValor) {
      if (!valorManual) return toast('Ingresa el monto a pagar', 'error')
      salario = parseFloat(valorManual)
      salarioManual = true
    }

    setGuardando(true)
    try {
      const res = await api.post('/registros', {
        personalId: persona._id, centroCostoId, laborId,
        dias, salario, salarioManual,
        metodo: persona.metodo || 'codigo',
        confianza: persona.confianza ? parseFloat(persona.confianza) / 100 : null,
        observaciones: obs, fecha
      })
      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')
      toast(`✅ Guardado — L ${salario.toFixed(2)}`, 'ok')
      setPersona(null)
      setCentro(''); setLabor(''); setDias(1); setValor(''); setObs(''); setFecha(hoy())
      setInputCodigo(''); setInputId('')
    } finally { setGuardando(false) }
  }

  // Actualizar salario sugerido cuando cambian los días
  function handleDiasChange(valor) {
    setDias(valor)
    if (laborSel?.pideDias && laborSel?.valorDiario) {
      setSalarioEditable((valor * laborSel.valorDiario).toFixed(2))
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="fade-up">
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '.25rem' }}>Registro de Planilla</h1>
        <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>Identifica al empleado y registra su labor del día</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>

        {/* ── Columna izquierda: identificación ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Tabs de modo */}
          <div className="card fade-up" style={{ padding: '.75rem' }}>
            <div style={{ display: 'flex', gap: '.5rem' }}>
              {[['facial','👤 Facial'],['codigo','🪪 Código'],['identidad','🔢 Identidad']].map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setModo(m)}
                  style={{
                    flex: 1,
                    padding: '.5rem .25rem',
                    borderRadius: 8,
                    border: modo === m ? '1px solid rgba(34,197,94,.3)' : '1px solid var(--border)',
                    background: modo === m ? 'rgba(34,197,94,.08)' : 'transparent',
                    color: modo === m ? 'var(--verde)' : 'var(--muted)',
                    fontFamily: 'Syne, sans-serif',
                    fontSize: '.78rem',
                    fontWeight: modo === m ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all .18s',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Cámara con marco oval guía */}
          <div className="card fade-up" style={{ display: modo === 'facial' ? 'flex' : 'none', flexDirection: 'column', gap: '.75rem' }}>
            <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#000', aspectRatio: '3/4' }}>
              <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

              {/* Marco oval guía */}
              {stream && (
                <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                  viewBox="0 0 300 400" preserveAspectRatio="none">
                  <defs>
                    <mask id="ovalReg">
                      <rect width="300" height="400" fill="white" />
                      <ellipse cx="150" cy="175" rx="105" ry="135" fill="black" />
                    </mask>
                  </defs>
                  <rect width="300" height="400" fill="rgba(0,0,0,0.5)" mask="url(#ovalReg)" />
                  <ellipse cx="150" cy="175" rx="105" ry="135" fill="none"
                    stroke={personaDetectada ? '#22c55e' : 'rgba(255,255,255,0.8)'}
                    strokeWidth="2.5"
                    strokeDasharray={personaDetectada ? 'none' : '8 4'} />
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

              {/* Estado inferior */}
              <div style={{ position: 'absolute', bottom: '.5rem', left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,.75)', padding: '.25rem .9rem', borderRadius: 20,
                fontSize: '.75rem', fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap',
                color: personaDetectada ? '#4ade80' : stream ? 'rgba(255,255,255,.8)' : 'var(--muted)' }}>
                {personaDetectada ? `✓ ${personaDetectada.nombres} ${personaDetectada.apellidos}` : stream ? 'Centra el rostro en el óvalo' : 'Sin cámara'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '.5rem' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={activarCamara}>🎥 Activar</button>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={reconocer} disabled={!stream || !modelosCargados}>🔍 Reconocer</button>
            </div>
            {cargandoModelos && <div style={{ fontSize: '.78rem', color: 'var(--muted)', fontFamily: 'DM Mono, monospace' }}>⟳ Cargando modelos de IA...</div>}
            {modelosCargados && <div style={{ fontSize: '.78rem', color: 'var(--verde)', fontFamily: 'DM Mono, monospace' }}>✅ {descriptoresBD.length} descriptores cargados</div>}
          </div>

          {/* Búsqueda por código */}
          {modo === 'codigo' && (
            <div className="card fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              <label className="lbl">Código Empleado Sodisa</label>
              <input className="inp" placeholder="FG002705" value={inputCodigo}
                onChange={e => setInputCodigo(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && buscarCodigo()} />
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={buscarCodigo}>
                🔍 Buscar
              </button>
            </div>
          )}

          {/* Búsqueda por identidad */}
          {modo === 'identidad' && (
            <div className="card fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              <label className="lbl">Número de Identidad</label>
              <input className="inp" placeholder="0000-0000-00000" value={inputId}
                onChange={e => {
                  let v = e.target.value.replace(/\D/g,'').substring(0,13)
                  if (v.length > 8) v = v.slice(0,4)+'-'+v.slice(4,8)+'-'+v.slice(8)
                  else if (v.length > 4) v = v.slice(0,4)+'-'+v.slice(4)
                  setInputId(v)
                }}
                onKeyDown={e => e.key === 'Enter' && buscarIdentidad()} />
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={buscarIdentidad}>
                🔍 Buscar
              </button>
            </div>
          )}

          {/* Persona identificada */}
          {persona && (
            <div className="card fade-up" style={{ border: '1px solid rgba(34,197,94,.25)', background: 'rgba(34,197,94,.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '.25rem' }}>
                    {persona.nombres} {persona.apellidos}
                  </div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '.8rem', color: 'var(--verde)', marginBottom: '.2rem' }}>
                    {persona.codigoEmpleado || 'Sin código'}
                  </div>
                  <div style={{ fontSize: '.8rem', color: 'var(--muted)' }}>{persona.cargo}</div>
                  {persona.confianza && (
                    <div style={{ marginTop: '.4rem' }}>
                      <span className="badge badge-green">Facial · {persona.confianza}% confianza</span>
                    </div>
                  )}
                </div>
                <button className="btn-ghost" onClick={() => setPersona(null)} style={{ color: 'var(--danger)' }}>✕</button>
              </div>
            </div>
          )}
        </div>

        {/* ── Columna derecha: planilla ── */}
        <div className="card fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '.85rem', color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
            Datos de Planilla
          </h3>

          <div>
            <label className="lbl">Centro de Costo *</label>
            <select className="inp" value={centroCostoId} onChange={e => setCentro(e.target.value)}>
              <option value="">— Selecciona —</option>
              {centros.map(c => <option key={c._id} value={c._id}>{c.nombre}</option>)}
            </select>
          </div>

          <div>
            <label className="lbl">Labor / Transacción *</label>
            <select className="inp" value={laborId} onChange={e => setLabor(e.target.value)}>
              <option value="">— Selecciona —</option>
              {labores.map(l => (
                <option key={l._id} value={l._id}>
                  {l.codigo} — {l.nombre}{l.valorDiario ? ` (L${l.valorDiario}/día)` : ' (valor libre)'}
                </option>
              ))}
            </select>
          </div>

          {/* Días (valor fijo) */}
          {laborSel?.pideDias && (
            <div>
              <label className="lbl">Días trabajados</label>
              <input className="inp" type="number" min={0.5} max={2} step={0.5} value={dias} onChange={e => handleDiasChange(parseFloat(e.target.value))} />
            </div>
          )}

          {/* Salario — editable siempre que haya una labor seleccionada */}
          {laborSel && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.35rem' }}>
                <label className="lbl" style={{ margin: 0 }}>
                  {laborSel.pideDias ? 'Salario (editable)' : 'Monto a pagar (Lps)'} *
                </label>
                {laborSel.pideDias && laborSel.valorDiario && (
                  <span style={{ fontSize: '.72rem', color: 'var(--muted)', fontFamily: 'DM Mono, monospace' }}>
                    Referencia: L {(dias * laborSel.valorDiario).toFixed(2)}
                  </span>
                )}
              </div>
              <input
                className="inp"
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                value={laborSel.pideDias ? salarioEditable : valorManual}
                onChange={e => {
                  if (laborSel.pideDias) setSalarioEditable(e.target.value)
                  else setValor(e.target.value)
                }}
                style={{ borderColor: 'rgba(34,197,94,.3)', fontSize: '1rem', fontWeight: 600 }}
              />
              {laborSel.pideDias && (
                <p style={{ fontSize: '.73rem', color: 'var(--muted)', marginTop: '.3rem' }}>
                  💡 Se autocompleta con el precio del catálogo, puedes ajustarlo si varía
                </p>
              )}
            </div>
          )}

          <div>
            <label className="lbl">Fecha del registro</label>
            <input className="inp" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
          </div>

          <div>
            <label className="lbl">Observaciones</label>
            <input className="inp" placeholder="Alguna nota..." value={obs} onChange={e => setObs(e.target.value)} />
          </div>

          <button
            className="btn-primary"
            onClick={guardar}
            disabled={guardando || !persona}
            style={{ width: '100%', justifyContent: 'center', padding: '.8rem', marginTop: '.5rem' }}
          >
            {guardando ? <span className="spinner" /> : '💾'} Guardar en Planilla
          </button>

          {!persona && (
            <p style={{ textAlign: 'center', fontSize: '.82rem', color: 'var(--muted)' }}>
              Identifica al empleado primero
            </p>
          )}
        </div>
      </div>
    </div>
  )
}