// src/components/EntradasDiesel.jsx
import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'

function hoy() { return new Date().toISOString().split('T')[0] }

const FORM_VACIO = {
  fecha: hoy(), proveedor: '', numeroOrden: '', factura: '', cantidadGalones: '',
  costoTotal: '', encargadoBomba: '', observaciones: '', descuentoPorGalon: '', precioUnitarioBruto: '',
}

export default function EntradasDiesel({ onCambio }) {
  const api       = useApi()
  const { toast } = useToast()
  const [entradas, setEntradas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    try {
      const res = await api.get('/estacion-sinclair/entradas')
      if (res?.ok) setEntradas(res.data)
    } finally {
      setCargando(false)
    }
  }

  async function crear() {
    if (!form.cantidadGalones)      return toast('La cantidad de galones es obligatoria', 'error')
    if (!form.precioUnitarioBruto)  return toast('El precio por galón es obligatorio', 'error')
    setGuardando(true)
    try {
      const res = await api.post('/estacion-sinclair/entradas', {
        ...form,
        cantidadGalones: Number(form.cantidadGalones),
        costoTotal: form.costoTotal === '' ? null : Number(form.costoTotal),
        descuentoPorGalon: form.descuentoPorGalon === '' ? 0 : Number(form.descuentoPorGalon),
        precioUnitarioBruto: Number(form.precioUnitarioBruto),
      })
      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')
      toast('✅ Entrada registrada', 'ok')
      setForm(FORM_VACIO)
      cargar()
      onCambio?.()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card">
        <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '.85rem', color: 'var(--muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Registrar entrada de diesel
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem', maxWidth: 640 }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label className="lbl">Fecha</label>
              <input className="inp" type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label className="lbl">Proveedor</label>
              <input className="inp" placeholder="Puma" value={form.proveedor} onChange={e => setForm(p => ({ ...p, proveedor: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="lbl">Número de orden</label>
              <input className="inp" value={form.numeroOrden} onChange={e => setForm(p => ({ ...p, numeroOrden: e.target.value }))} />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label className="lbl">Factura</label>
              <input className="inp" value={form.factura} onChange={e => setForm(p => ({ ...p, factura: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="lbl">Cantidad (galones) *</label>
              <input className="inp" type="number" step="0.01" min="0" value={form.cantidadGalones}
                onChange={e => setForm(p => ({ ...p, cantidadGalones: e.target.value }))} />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="lbl">Precio por galón *</label>
              <input className="inp" type="number" step="0.01" min="0" value={form.precioUnitarioBruto}
                onChange={e => setForm(p => ({ ...p, precioUnitarioBruto: e.target.value }))} />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="lbl">Descuento por galón</label>
              <input className="inp" type="number" step="0.01" min="0" value={form.descuentoPorGalon}
                onChange={e => setForm(p => ({ ...p, descuentoPorGalon: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="lbl">Costo total</label>
              <input className="inp" type="number" step="0.01" min="0" value={form.costoTotal}
                onChange={e => setForm(p => ({ ...p, costoTotal: e.target.value }))} />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label className="lbl">Encargado de bomba</label>
              <input className="inp" value={form.encargadoBomba} onChange={e => setForm(p => ({ ...p, encargadoBomba: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="lbl">Observaciones</label>
            <input className="inp" value={form.observaciones} onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))} />
          </div>
          <button className="btn-primary" style={{ justifyContent: 'center', alignSelf: 'flex-start' }} onClick={crear} disabled={guardando}>
            {guardando ? <span className="spinner" /> : <Plus size={15} />} Registrar Entrada
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontFamily: 'Inter, sans-serif', fontSize: '.85rem', fontWeight: 600 }}>
          Entradas de diesel
        </div>
        {cargando ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}><span className="spinner" /></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr><th>Fecha</th><th>Proveedor</th><th>Factura</th><th>Galones</th><th>Precio/Gal</th><th>Descuento/Gal</th><th>Restantes</th></tr>
              </thead>
              <tbody>
                {entradas.map(e => (
                  <tr key={e._id}>
                    <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.8rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {new Date(e.fecha).toLocaleDateString('es-HN')}
                    </td>
                    <td style={{ fontWeight: 500 }}>{e.proveedor || '—'}</td>
                    <td style={{ fontSize: '.82rem', color: 'var(--muted)' }}>{e.factura || '—'}</td>
                    <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>{e.cantidadGalones}</td>
                    <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>{e.precioUnitarioBruto}</td>
                    <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>{e.descuentoPorGalon}</td>
                    <td>
                      <span className={`badge ${e.galonesRestantes > 0 ? 'badge-green' : 'badge-red'}`}>
                        {e.galonesRestantes}
                      </span>
                    </td>
                  </tr>
                ))}
                {!entradas.length && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>Sin registros aún</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
