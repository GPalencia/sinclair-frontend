// src/components/MedidorAreaGPS.jsx
import { useState, useEffect, useRef } from 'react'
import { MapPin, Undo2, Save, X, Crosshair } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { calcularAreaM2, m2AManzanas } from '../utils/areaGPS'

export default function MedidorAreaGPS({ onGuardar, onCerrar }) {
  const mapaRef      = useRef(null)   // contenedor DOM
  const mapaInstancia = useRef(null)  // instancia de Leaflet
  const capaPuntos    = useRef(null)  // capa de marcadores
  const capaPoligono   = useRef(null) // capa del polígono
  const capaUbicacion  = useRef(null) // punto de "aquí estoy"

  const [puntos, setPuntos]         = useState([])
  const [ubicacionActual, setUbicacionActual] = useState(null)
  const [capturando, setCapturando] = useState(false)
  const [error, setError]           = useState('')

  const areaM2 = calcularAreaM2(puntos)
  const areaMz = m2AManzanas(areaM2)

  // Inicializar el mapa una sola vez
  useEffect(() => {
    if (mapaInstancia.current || !mapaRef.current) return
    const mapa = L.map(mapaRef.current, { zoomControl: true }).setView([14.6, -87.2], 15)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 20,
    }).addTo(mapa)
    mapaInstancia.current = mapa
    capaPuntos.current = L.layerGroup().addTo(mapa)

    // Centrar en la ubicación actual apenas abre
    ubicarme(mapa)

    return () => {
      mapa.remove()
      mapaInstancia.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function ubicarme(mapaOverride) {
    if (!navigator.geolocation) { setError('Este dispositivo no tiene GPS disponible'); return }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude, accuracy } = pos.coords
        setUbicacionActual({ lat: latitude, lng: longitude, accuracy })
        const mapa = mapaOverride || mapaInstancia.current
        if (mapa) mapa.setView([latitude, longitude], 18)
        setError('')
      },
      err => setError('No se pudo obtener tu ubicación: ' + err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Redibuja marcadores/polígono cada vez que cambian los puntos
  useEffect(() => {
    const mapa = mapaInstancia.current
    if (!mapa || !capaPuntos.current) return

    capaPuntos.current.clearLayers()
    puntos.forEach((p, i) => {
      L.circleMarker([p.lat, p.lng], { radius: 7, color: '#16a34a', fillColor: '#16a34a', fillOpacity: 1, weight: 2 })
        .addTo(capaPuntos.current)
        .bindTooltip(String(i + 1), { permanent: true, direction: 'top', offset: [0, -6] })
    })

    if (capaPoligono.current) { mapa.removeLayer(capaPoligono.current); capaPoligono.current = null }
    if (puntos.length >= 2) {
      const latlngs = puntos.map(p => [p.lat, p.lng])
      capaPoligono.current = puntos.length >= 3
        ? L.polygon(latlngs, { color: '#16a34a', weight: 2, fillOpacity: 0.25 }).addTo(mapa)
        : L.polyline(latlngs, { color: '#16a34a', weight: 2 }).addTo(mapa)
    }
  }, [puntos])

  // Marca del "aquí estoy" en azul
  useEffect(() => {
    const mapa = mapaInstancia.current
    if (!mapa || !ubicacionActual) return
    if (capaUbicacion.current) mapa.removeLayer(capaUbicacion.current)
    capaUbicacion.current = L.circleMarker([ubicacionActual.lat, ubicacionActual.lng], {
      radius: 6, color: '#2563eb', fillColor: '#60a5fa', fillOpacity: 1, weight: 2,
    }).addTo(mapa)
  }, [ubicacionActual])

  function marcarPunto() {
    if (!navigator.geolocation) { setError('Este dispositivo no tiene GPS disponible'); return }
    setCapturando(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude, accuracy } = pos.coords
        setPuntos(prev => [...prev, { lat: latitude, lng: longitude, accuracy }])
        setUbicacionActual({ lat: latitude, lng: longitude, accuracy })
        setCapturando(false)
      },
      err => { setError('No se pudo capturar el punto: ' + err.message); setCapturando(false) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  function deshacer() {
    setPuntos(prev => prev.slice(0, -1))
  }

  function guardar() {
    if (puntos.length < 3) return
    onGuardar({ areaMz: Math.round(areaMz * 1000) / 1000, coordenadas: puntos.map(p => ({ lat: p.lat, lng: p.lng })) })
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onCerrar()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem', width: '100%', maxWidth: 560, animation: 'fadeUp .25s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '1rem', fontWeight: 700 }}>Marcar área con GPS</h3>
          <button className="btn-ghost" onClick={onCerrar} style={{ fontSize: '1.1rem', padding: '.3rem .6rem' }}><X size={18} /></button>
        </div>

        <div ref={mapaRef} style={{ width: '100%', height: 320, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }} />

        {error && <p style={{ color: 'var(--danger)', fontSize: '.8rem', marginTop: '.5rem' }}>{error}</p>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap', gap: '.5rem' }}>
          <div>
            <div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>{puntos.length} punto{puntos.length === 1 ? '' : 's'} marcado{puntos.length === 1 ? '' : 's'}</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'DM Mono, monospace', color: 'var(--verde)' }}>
              {areaMz.toFixed(3)} Mz
            </div>
          </div>
          <button className="btn-ghost" onClick={() => ubicarme()} title="Centrar en mi ubicación">
            <Crosshair size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={marcarPunto} disabled={capturando}>
            {capturando ? <span className="spinner" /> : <MapPin size={15} />} Marcar punto
          </button>
          <button className="btn-secondary" onClick={deshacer} disabled={!puntos.length}>
            <Undo2 size={15} /> Deshacer
          </button>
        </div>

        <div style={{ display: 'flex', gap: '.75rem', marginTop: '.75rem' }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onCerrar}>Cancelar</button>
          <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={guardar} disabled={puntos.length < 3}>
            <Save size={15} /> Usar esta área
          </button>
        </div>
        {puntos.length > 0 && puntos.length < 3 && (
          <p style={{ fontSize: '.75rem', color: 'var(--muted)', marginTop: '.5rem' }}>Marca al menos 3 puntos para formar un área.</p>
        )}
      </div>
    </div>
  )
}
