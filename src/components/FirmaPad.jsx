// src/components/FirmaPad.jsx — recuadro para firmar con el dedo, el lápiz o el mouse.
// Usa <canvas> con Pointer Events (funciona en teléfono, tablet y compu).
// onChange(dataURL | null): PNG transparente reducido a 600×180 (~10–30 KB).
import { useRef, useEffect, useState } from 'react'
import { Eraser } from 'lucide-react'

const ANCHO_PNG = 600, ALTO_PNG = 180

export default function FirmaPad({ onChange, alto = 170, disabled = false }) {
  const canvasRef = useRef(null)
  const dibujando = useRef(false)
  const ultimo = useRef(null)
  const [vacio, setVacio] = useState(true)

  // Ajusta la resolución real del canvas al tamaño en pantalla (nítido en pantallas de alta densidad)
  useEffect(() => {
    const c = canvasRef.current
    const ajustar = () => {
      const r = c.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      c.width = Math.round(r.width * dpr)
      c.height = Math.round(r.height * dpr)
      const ctx = c.getContext('2d')
      ctx.scale(dpr, dpr)
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2.4
      setVacio(true); onChange?.(null)
    }
    ajustar()
    // Si la pantalla gira, el trazo se perdería deformado: se limpia
    window.addEventListener('orientationchange', ajustar)
    return () => window.removeEventListener('orientationchange', ajustar)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const punto = (e) => {
    const r = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  function inicio(e) {
    if (disabled) return
    e.preventDefault()
    canvasRef.current.setPointerCapture?.(e.pointerId)
    dibujando.current = true
    ultimo.current = punto(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath(); ctx.arc(ultimo.current.x, ultimo.current.y, 1.1, 0, Math.PI * 2); ctx.fillStyle = '#0f172a'; ctx.fill()
  }

  function mover(e) {
    if (!dibujando.current) return
    e.preventDefault()
    const p = punto(e)
    const ctx = canvasRef.current.getContext('2d')
    // Un poco más grueso con más presión (lápiz)
    ctx.lineWidth = e.pressure && e.pointerType === 'pen' ? 1.6 + e.pressure * 2.2 : 2.4
    ctx.beginPath(); ctx.moveTo(ultimo.current.x, ultimo.current.y); ctx.lineTo(p.x, p.y); ctx.stroke()
    ultimo.current = p
  }

  function fin() {
    if (!dibujando.current) return
    dibujando.current = false
    setVacio(false)
    onChange?.(exportar())
  }

  // Copia reducida a 600×180 para que la imagen guardada sea liviana
  function exportar() {
    const c = canvasRef.current
    const out = document.createElement('canvas')
    out.width = ANCHO_PNG; out.height = ALTO_PNG
    const k = Math.min(ANCHO_PNG / c.width, ALTO_PNG / c.height)
    const w = c.width * k, h = c.height * k
    out.getContext('2d').drawImage(c, (ANCHO_PNG - w) / 2, (ALTO_PNG - h) / 2, w, h)
    return out.toDataURL('image/png')
  }

  function limpiar() {
    const c = canvasRef.current
    const ctx = c.getContext('2d')
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height); ctx.restore()
    setVacio(true); onChange?.(null)
  }

  return (
    <div>
      <div style={{ position: 'relative', border: '1.5px dashed var(--border2, #cbd5e1)', borderRadius: 10, background: '#fff', touchAction: 'none' }}>
        <canvas ref={canvasRef}
          style={{ width: '100%', height: alto, display: 'block', cursor: disabled ? 'not-allowed' : 'crosshair', touchAction: 'none' }}
          onPointerDown={inicio} onPointerMove={mover} onPointerUp={fin} onPointerLeave={fin} onPointerCancel={fin} />
        {/* Línea guía */}
        <div style={{ position: 'absolute', left: '8%', right: '8%', bottom: 34, borderBottom: '1px solid #cbd5e1', pointerEvents: 'none' }} />
        {vacio && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '.9rem', pointerEvents: 'none' }}>
            Firme aquí
          </div>
        )}
      </div>
      <button type="button" className="btn-ghost" onClick={limpiar} disabled={vacio || disabled}
        style={{ marginTop: '.35rem', padding: '.3rem .6rem', fontSize: '.8rem' }}>
        <Eraser size={14} /> Limpiar
      </button>
    </div>
  )
}
