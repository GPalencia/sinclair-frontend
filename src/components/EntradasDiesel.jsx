// src/components/EntradasDiesel.jsx
import { useState, useEffect } from 'react'
import { Plus, Lock, Unlock, Pencil, Save, X } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../context/AuthContext'
import { fechaCorta, hoyLocal } from '../utils/fecha'

function hoy() { return hoyLocal() }

// Costo neto según la factura: galones × (precio − descuento)
const costoCalculado = (gal, precio, desc) => {
  const g = Number(gal), p = Number(precio), d = Number(desc) || 0
  return g > 0 && p > 0 ? Math.round(g * (p - d) * 100) / 100 : null
}
const fmtL = (n) => (n == null ? '—' : `L ${Number(n).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
const isoDia = (d) => (d ? new Date(d).toISOString().slice(0, 10) : hoy())

const FORM_VACIO = {
  fecha: hoy(), proveedor: '', numeroOrden: '', factura: '', cantidadGalones: '',
  costoTotal: '', encargadoBomba: '', observaciones: '', descuentoPorGalon: '', precioUnitarioBruto: '',
}

export default function EntradasDiesel({ onCambio }) {
  const api       = useApi()
  const { toast } = useToast()
  const { usuario } = useAuth()
  const puedeCerrar  = ['admin', 'supervisor'].includes(usuario?.rol)
  const puedeReabrir = usuario?.rol === 'admin'
  const [entradas, setEntradas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(FORM_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [editando, setEditando] = useState(null)   // entrada que se está corrigiendo
  // Cierre de entrada (dar de baja la reserva que no se va a usar)
  const [cerrando, setCerrando]   = useState(null)   // entrada que se va a cerrar
  const [motivo, setMotivo]       = useState('Reserva sin uso')
  const [procesando, setProcesando] = useState(false)

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

  function editar(e) {
    setEditando(e)
    setForm({
      fecha: isoDia(e.fecha), proveedor: e.proveedor || '', numeroOrden: e.numeroOrden || '', factura: e.factura || '',
      cantidadGalones: String(e.cantidadGalones ?? ''), costoTotal: e.costoTotal == null ? '' : String(e.costoTotal),
      encargadoBomba: e.encargadoBomba || '', observaciones: e.observaciones || '',
      descuentoPorGalon: String(e.descuentoPorGalon ?? ''), precioUnitarioBruto: String(e.precioUnitarioBruto ?? ''),
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelarEdicion() { setEditando(null); setForm(FORM_VACIO) }

  async function crear() {
    if (!form.cantidadGalones)      return toast('La cantidad de galones es obligatoria', 'error')
    if (!form.precioUnitarioBruto)  return toast('El precio por galón es obligatorio', 'error')
    setGuardando(true)
    try {
      const url = editando ? `/estacion-sinclair/entradas/${editando._id}` : '/estacion-sinclair/entradas'
      const res = await api[editando ? 'put' : 'post'](url, {
        ...form,
        cantidadGalones: Number(form.cantidadGalones),
        costoTotal: form.costoTotal === '' ? null : Number(form.costoTotal),
        descuentoPorGalon: form.descuentoPorGalon === '' ? 0 : Number(form.descuentoPorGalon),
        precioUnitarioBruto: Number(form.precioUnitarioBruto),
      })
      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')
      toast(editando ? 'Entrada actualizada' : 'Entrada registrada', 'ok')
      setEditando(null)
      setForm(FORM_VACIO)
      cargar()
      onCambio?.()
    } finally {
      setGuardando(false)
    }
  }

  function abrirCierre(e) {
    setMotivo('Reserva sin uso')
    setCerrando(e)
  }

  async function confirmarCierre() {
    setProcesando(true)
    try {
      const res = await api.post(`/estacion-sinclair/entradas/${cerrando._id}/cerrar`, { motivo })
      if (!res?.ok) return toast(res?.mensaje || 'No se pudo cerrar la entrada', 'error')
      toast(res.mensaje, 'ok')
      setCerrando(null)
      cargar()
      onCambio?.()
    } finally {
      setProcesando(false)
    }
  }

  async function reabrir(e) {
    if (!window.confirm(`¿Reabrir la entrada ${e.factura || fechaCorta(e.fecha)}? Los ${e.galonesBaja} galones dados de baja vuelven a la existencia.`)) return
    const res = await api.post(`/estacion-sinclair/entradas/${e._id}/reabrir`, {})
    if (!res?.ok) return toast(res?.mensaje || 'No se pudo reabrir', 'error')
    toast(res.mensaje, 'ok')
    cargar()
    onCambio?.()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="card">
        <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '.85rem', color: 'var(--muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          {editando ? `Editar entrada ${editando.factura ? `· Factura ${editando.factura}` : ''}` : 'Registrar entrada de diesel'}
        </h3>
        {editando && (
          <p style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: '-.5rem', marginBottom: '1rem' }}>
            Si cambias el precio o el descuento, se recalcula el costo de los despachos que salieron de esta entrada.
          </p>
        )}
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
              <input className="inp" type="number" step="0.0001" min="0" value={form.precioUnitarioBruto}
                onChange={e => setForm(p => ({ ...p, precioUnitarioBruto: e.target.value }))} />
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="lbl">Descuento por galón</label>
              <input className="inp" type="number" step="0.0001" min="0" value={form.descuentoPorGalon}
                onChange={e => setForm(p => ({ ...p, descuentoPorGalon: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="lbl">Costo total (según factura)</label>
              <input className="inp" type="number" step="0.01" min="0" value={form.costoTotal}
                onChange={e => setForm(p => ({ ...p, costoTotal: e.target.value }))} />
              {(() => {
                const calc = costoCalculado(form.cantidadGalones, form.precioUnitarioBruto, form.descuentoPorGalon)
                if (calc == null) return null
                const dif = form.costoTotal !== '' ? Math.round((Number(form.costoTotal) - calc) * 100) / 100 : null
                return (
                  <div style={{ fontSize: '.74rem', color: 'var(--muted)', marginTop: '.3rem' }}>
                    Galones × (precio − descuento) = <b>{fmtL(calc)}</b>
                    {dif != null && Math.abs(dif) > 1 && <span style={{ color: 'var(--danger)' }}> · no cuadra por {fmtL(dif)}</span>}
                    {form.costoTotal === '' && (
                      <button type="button" className="btn-ghost" style={{ padding: '0 .4rem', fontSize: '.74rem' }}
                        onClick={() => setForm(p => ({ ...p, costoTotal: String(calc) }))}>Usar</button>
                    )}
                  </div>
                )
              })()}
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
          <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ justifyContent: 'center' }} onClick={crear} disabled={guardando}>
              {guardando ? <span className="spinner" /> : editando ? <Save size={15} /> : <Plus size={15} />} {editando ? 'Guardar cambios' : 'Registrar Entrada'}
            </button>
            {editando && <button className="btn-secondary" onClick={cancelarEdicion}><X size={15} /> Cancelar</button>}
          </div>
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
                <tr><th>Fecha</th><th>Proveedor</th><th>Orden</th><th>Factura</th><th style={{ textAlign: 'right' }}>Galones</th><th style={{ textAlign: 'right' }}>Precio/Gal</th><th style={{ textAlign: 'right' }}>Desc./Gal</th><th style={{ textAlign: 'right' }}>Costo total</th><th style={{ textAlign: 'right' }}>Restantes</th><th>Encargado</th><th></th></tr>
              </thead>
              <tbody>
                {entradas.map(e => (
                  <tr key={e._id}>
                    <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.8rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {fechaCorta(e.fecha)}
                    </td>
                    <td style={{ fontWeight: 500 }}>{e.proveedor || '—'}</td>
                    <td style={{ fontSize: '.82rem', color: 'var(--muted)' }}>{e.numeroOrden || '—'}</td>
                    <td style={{ fontSize: '.82rem', color: 'var(--muted)' }}>{e.factura || '—'}</td>
                    <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem', textAlign: 'right' }}>{e.cantidadGalones}</td>
                    <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem', textAlign: 'right' }}>{e.precioUnitarioBruto}</td>
                    <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem', textAlign: 'right' }}>{e.descuentoPorGalon}</td>
                    <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {fmtL(e.costoTotal)}
                      {(() => {
                        const calc = costoCalculado(e.cantidadGalones, e.precioUnitarioBruto, e.descuentoPorGalon)
                        if (calc == null || (e.costoTotal != null && Math.abs(e.costoTotal - calc) <= 1)) return null
                        return <div style={{ fontSize: '.68rem', color: e.costoTotal == null ? 'var(--muted)' : 'var(--danger)' }}
                          title="Galones × (precio − descuento)">Calculado {fmtL(calc)}</div>
                      })()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem', fontWeight: 600 }}>
                        {e.galonesRestantes}
                      </span>
                      {e.cerrada && (
                        <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginTop: '.25rem', whiteSpace: 'nowrap' }}
                          title={`${e.motivoCierre || ''} — ${fechaCorta(e.fechaCierre)}`}>
                          Cerrada · baja {e.galonesBaja} gal
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '.8rem', color: 'var(--muted)' }}>{e.encargadoBomba || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {puedeCerrar && (
                        <button className="btn-ghost" style={{ padding: '.35rem .5rem' }} title="Editar entrada" onClick={() => editar(e)}>
                          <Pencil size={14} />
                        </button>
                      )}
                      {!e.cerrada && e.galonesRestantes > 0 && puedeCerrar && (
                        <button className="btn-ghost" style={{ padding: '.35rem .6rem', fontSize: '.78rem' }} onClick={() => abrirCierre(e)}
                          title="Dar de baja los galones que quedan">
                          <Lock size={14} /> Cerrar
                        </button>
                      )}
                      {e.cerrada && puedeReabrir && (
                        <button className="btn-ghost" style={{ padding: '.35rem .6rem', fontSize: '.78rem' }} onClick={() => reabrir(e)}
                          title="Devolver los galones a la existencia">
                          <Unlock size={14} /> Reabrir
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!entradas.length && (
                  <tr><td colSpan={11} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>Sin registros aún</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: cerrar entrada */}
      {cerrando && (
        <div
          onClick={ev => ev.target === ev.currentTarget && setCerrando(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        >
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.75rem', width: '100%', maxWidth: 460, maxHeight: 'calc(100dvh - 2rem)', overflowY: 'auto', animation: 'fadeUp .25s ease' }}>
            <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '1rem', fontWeight: 700, marginBottom: '.75rem' }}>Cerrar entrada</h3>
            <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
              {cerrando.proveedor || 'Entrada'} {cerrando.factura ? `· ${cerrando.factura}` : ''} · {fechaCorta(cerrando.fecha)}
            </p>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '.9rem 1rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Se darán de baja</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'DM Mono, monospace', color: 'var(--danger)' }}>{cerrando.galonesRestantes} gal</div>
            </div>
            <p style={{ fontSize: '.8rem', color: 'var(--muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
              Esos galones salen de la existencia y ya no se asignarán a despachos. Los despachos anteriores y sus costos no cambian.
              Si fue un error, un administrador puede reabrirla.
            </p>
            <label className="lbl">Motivo</label>
            <input className="inp" value={motivo} onChange={ev => setMotivo(ev.target.value)} placeholder="Reserva sin uso" />
            <div style={{ display: 'flex', gap: '.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setCerrando(null)}>Cancelar</button>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={confirmarCierre} disabled={procesando}>
                {procesando ? <span className="spinner" /> : <Lock size={15} />} Cerrar entrada
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
