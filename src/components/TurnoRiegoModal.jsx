// src/components/TurnoRiegoModal.jsx
// Un solo formulario para los cuatro momentos de un turno de riego:
//   iniciar   → estación + lote + tipo (hora de inicio = ahora). Lo mínimo para arrancar.
//   finalizar → hora fin, horómetro y diesel finales. Opción de seguir con el siguiente
//               turno (abre 'iniciar' prellenado con la hora, horómetro y diesel finales).
//   editar    → corregir cualquier campo de un turno ya guardado.
//   manual    → registrar un turno con hora de inicio y fin escritas a mano. Con
//               inline=true se pinta dentro de la página (pestaña Registrar) en vez de modal.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Play, Square, Save, Plus, X } from 'lucide-react'
import { fechaInput, hoyLocal } from '../utils/fecha'
import {
  ahoraHHMM, minutosEntre, fmtDuracion, fmtNum, num, vacioSiNull, UNIDADES,
} from '../utils/riego'

const TITULO = { iniciar: 'Iniciar turno', finalizar: 'Finalizar turno', editar: 'Editar turno', manual: 'Registrar turno anterior' }

function formInicial(modo, { estaciones, turno, estacionId, estacioneroGuardado, prefill }) {
  if (turno) {
    return {
      fecha: fechaInput(turno.fecha),
      estacion: turno.estacion?._id || turno.estacion,
      lote: turno.lote, sector: turno.sector || '', tipo: turno.tipo,
      productos: (turno.productos || []).map(p => ({ ...p, cantidad: vacioSiNull(p.cantidad) })),
      horaInicio: turno.horaInicio || '',
      horaFin: modo === 'finalizar' ? ahoraHHMM() : (turno.horaFin || ''),
      rpm: vacioSiNull(turno.rpm),
      horometroInicial: vacioSiNull(turno.horometroInicial), horometroFinal: vacioSiNull(turno.horometroFinal),
      combustibleInicial: vacioSiNull(turno.combustibleInicial), combustibleFinal: vacioSiNull(turno.combustibleFinal),
      combustibleAgregado: vacioSiNull(turno.combustibleAgregado),
      estacionero: turno.estacionero || estacioneroGuardado || '',
      observaciones: turno.observaciones || '',
    }
  }
  const est = estaciones.find(e => e._id === estacionId) || (estaciones.length === 1 ? estaciones[0] : null)
  return {
    fecha: hoyLocal(),
    estacion: est?._id || '', lote: '', sector: '', tipo: 'Riego', productos: [],
    horaInicio: modo === 'iniciar' ? ahoraHHMM() : '', horaFin: '',
    rpm: vacioSiNull(est?.rpmHabitual),
    horometroInicial: '', horometroFinal: '', combustibleInicial: '', combustibleFinal: '', combustibleAgregado: '',
    estacionero: estacioneroGuardado || '', observaciones: '',
    ...(prefill || {}),   // viene de "seguir con el siguiente turno"
  }
}

const chip = (activo) => ({
  padding: '.55rem 1rem', borderRadius: 999, cursor: 'pointer', fontSize: '.9rem', fontWeight: activo ? 700 : 500,
  fontFamily: 'Inter, sans-serif', minHeight: 40,
  border: `1.5px solid ${activo ? 'var(--verde)' : 'var(--border)'}`,
  background: activo ? 'var(--verde)' : 'var(--card)', color: activo ? '#fff' : 'var(--text2)',
})

export default function TurnoRiegoModal({ modo, inline = false, estaciones, turno, estacionId, prefill, estacioneroGuardado, productosSugeridos = [], estacionerosSugeridos = [], guardando, onGuardar, onClose }) {
  const [f, setF] = useState(() => formInicial(modo, { estaciones, turno, estacionId, estacioneroGuardado, prefill }))
  const [siguiente, setSiguiente] = useState(true)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))

  const est = estaciones.find(e => e._id === f.estacion)
  const lotes = est?.lotes || []

  const verInicio = modo !== 'finalizar'                       // hora inicio, horómetro/diesel iniciales
  const verFin    = modo !== 'iniciar'                         // hora fin, horómetro/diesel finales
  const verFecha  = modo === 'manual' || modo === 'editar'
  const motorAbierto = modo === 'finalizar' || modo === 'editar' || modo === 'manual'

  const minutos = verFin ? minutosEntre(f.horaInicio, f.horaFin) : null
  const gastado = (num(f.combustibleInicial) != null && num(f.combustibleFinal) != null)
    ? num(f.combustibleInicial) + (num(f.combustibleAgregado) || 0) - num(f.combustibleFinal) : null

  function setProducto(i, k, v) {
    setF(p => ({ ...p, productos: p.productos.map((x, j) => j === i ? { ...x, [k]: v } : x) }))
  }

  function enviar() {
    onGuardar(
      { ...f, rpm: num(f.rpm), horometroInicial: num(f.horometroInicial), horometroFinal: num(f.horometroFinal),
        combustibleInicial: num(f.combustibleInicial), combustibleFinal: num(f.combustibleFinal), combustibleAgregado: num(f.combustibleAgregado),
        productos: f.tipo === 'Fertirriego' ? f.productos.map(p => ({ ...p, cantidad: num(p.cantidad) })) : [] },
      { siguiente: modo === 'finalizar' && siguiente }
    )
  }

  const campoNum = (k, label, step = '0.1') => (
    <div key={k} style={{ flex: 1, minWidth: 120 }}>
      <label className="lbl">{label}</label>
      <input className="inp" type="number" inputMode="decimal" step={step} min="0" value={f[k]} onChange={e => set(k, e.target.value)} />
    </div>
  )

  const cuerpo = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Estación (solo si no viene fijada) */}
          {(modo === 'manual' || (modo === 'iniciar' && !estacionId) || modo === 'editar') && (
            <div>
              <label className="lbl">Estación *</label>
              <select className="inp" value={f.estacion} onChange={e => { const n = estaciones.find(x => x._id === e.target.value); setF(p => ({ ...p, estacion: e.target.value, lote: '', sector: '', rpm: p.rpm === '' ? vacioSiNull(n?.rpmHabitual) : p.rpm })) }}>
                <option value="">Selecciona...</option>
                {estaciones.map(e => <option key={e._id} value={e._id}>{e.finca} — Estación {e.nombre}</option>)}
              </select>
            </div>
          )}

          {verFecha && (
            <div>
              <label className="lbl">Fecha</label>
              <input className="inp" type="date" value={f.fecha} onChange={e => set('fecha', e.target.value)} />
            </div>
          )}

          {/* Lote: botones grandes */}
          <div>
            <label className="lbl">Lote *</label>
            {lotes.length ? (
              <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                {lotes.map(l => (
                  <button key={l.codigo} type="button" style={chip(f.lote === l.codigo)} onClick={() => set('lote', l.codigo)}>{l.codigo}</button>
                ))}
                {f.lote && !lotes.some(l => l.codigo === f.lote) && <button type="button" style={chip(true)}>{f.lote}</button>}
              </div>
            ) : (
              <input className="inp" placeholder={est ? 'Ej. 10.12 (agrega los lotes en Catálogos)' : 'Primero elige la estación'} value={f.lote} onChange={e => set('lote', e.target.value)} />
            )}
          </div>

          <div>
            <label className="lbl">Turno / sector (opcional)</label>
            <input className="inp" placeholder="Ej. 10.12 — la válvula o sector que se abrió" value={f.sector} onChange={e => set('sector', e.target.value)} />
          </div>

          {/* Tipo */}
          <div>
            <label className="lbl">Qué se está aplicando</label>
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <button type="button" style={{ ...chip(f.tipo === 'Riego'), flex: 1 }} onClick={() => set('tipo', 'Riego')}>💧 Solo riego</button>
              <button type="button" style={{ ...chip(f.tipo === 'Fertirriego'), flex: 1 }} onClick={() => set('tipo', 'Fertirriego')}>🧪 Fertirriego</button>
            </div>
          </div>

          {f.tipo === 'Fertirriego' && (
            <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, padding: '.85rem', display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
              <datalist id="lista-productos-riego">{productosSugeridos.map(n => <option key={n} value={n} />)}</datalist>
              <label className="lbl" style={{ margin: 0 }}>Fertilizantes por la tubería</label>
              {f.productos.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
                  <input className="inp" style={{ flex: 3, minWidth: 0 }} list="lista-productos-riego" placeholder="Producto" value={p.nombre} onChange={e => setProducto(i, 'nombre', e.target.value)} />
                  <input className="inp" style={{ flex: 1.3, minWidth: 0 }} type="number" inputMode="decimal" step="0.01" min="0" placeholder="Cant." value={p.cantidad} onChange={e => setProducto(i, 'cantidad', e.target.value)} />
                  <select className="inp" style={{ flex: 1.2, minWidth: 0, padding: '.6rem .4rem' }} value={p.unidad} onChange={e => setProducto(i, 'unidad', e.target.value)}>
                    {UNIDADES.map(u => <option key={u}>{u}</option>)}
                  </select>
                  <button type="button" className="btn-ghost" style={{ padding: '.35rem', color: 'var(--danger)' }} onClick={() => set('productos', f.productos.filter((_, j) => j !== i))}><X size={16} /></button>
                </div>
              ))}
              <button type="button" className="btn-secondary" style={{ alignSelf: 'flex-start' }}
                onClick={() => set('productos', [...f.productos, { nombre: '', cantidad: '', unidad: 'lb' }])}>
                <Plus size={14} /> Agregar producto
              </button>
            </div>
          )}

          {/* Horas */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {verInicio && (
              <div style={{ flex: 1, minWidth: 130 }}>
                <label className="lbl">Hora de inicio *</label>
                <input className="inp" type="time" value={f.horaInicio} onChange={e => set('horaInicio', e.target.value)} />
              </div>
            )}
            {verFin && (
              <div style={{ flex: 1, minWidth: 130 }}>
                <label className="lbl">Hora de fin {modo === 'finalizar' || modo === 'manual' ? '*' : ''}</label>
                <input className="inp" type="time" value={f.horaFin} onChange={e => set('horaFin', e.target.value)} />
              </div>
            )}
          </div>
          {modo === 'finalizar' && (
            <p style={{ fontSize: '.8rem', color: 'var(--muted)', marginTop: '-.4rem' }}>
              Inició a las <b>{f.horaInicio}</b>{minutos != null && <> · duración <b>{fmtDuracion(minutos)}</b></>}
            </p>
          )}

          {/* Motor y diesel */}
          <details open={motorAbierto || undefined} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '.6rem .85rem' }}>
            <summary style={{ cursor: 'pointer', fontSize: '.85rem', fontWeight: 600, color: 'var(--text2)' }}>
              Motor y diesel {modo === 'iniciar' ? '(opcional)' : ''}
            </summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.8rem', marginTop: '.8rem' }}>
              <div style={{ display: 'flex', gap: '.8rem', flexWrap: 'wrap' }}>
                {modo !== 'finalizar' && campoNum('rpm', 'RPM', '1')}
                {verInicio && campoNum('horometroInicial', 'Horómetro inicial')}
                {verFin && campoNum('horometroFinal', 'Horómetro final')}
              </div>
              <div style={{ display: 'flex', gap: '.8rem', flexWrap: 'wrap' }}>
                {verInicio && campoNum('combustibleInicial', 'Diesel inicial (gal)')}
                {verFin && campoNum('combustibleFinal', 'Diesel final (gal)')}
                {verFin && campoNum('combustibleAgregado', 'Diesel agregado (gal)')}
              </div>
              {verFin && gastado != null && (
                <p style={{ fontSize: '.82rem', color: gastado < 0 ? 'var(--danger)' : 'var(--verde)', fontWeight: 600 }}>
                  {gastado < 0 ? 'Revisa los galones: el diesel final es mayor al inicial (¿agregaste diesel?)' : `Diesel gastado: ${fmtNum(gastado)} gal`}
                </p>
              )}
            </div>
          </details>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label className="lbl">Estacionero de turno</label>
              <datalist id="lista-estacioneros"> {estacionerosSugeridos.map(n => <option key={n} value={n} />)}</datalist>
              <input className="inp" list="lista-estacioneros" value={f.estacionero} onChange={e => set('estacionero', e.target.value)} />
            </div>
            <div style={{ flex: 2, minWidth: 180 }}>
              <label className="lbl">Observaciones</label>
              <input className="inp" value={f.observaciones} onChange={e => set('observaciones', e.target.value)} />
            </div>
          </div>

          {modo === 'finalizar' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '.6rem', fontSize: '.9rem', background: 'var(--verde-light)', borderRadius: 10, padding: '.7rem .85rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={siguiente} onChange={e => setSiguiente(e.target.checked)} style={{ width: 18, height: 18 }} />
              <span>Seguir enseguida con <b>otro turno</b> en esta estación (se abre ya lleno con la hora, horómetro y diesel de este)</span>
            </label>
          )}

          <div style={{ display: 'flex', gap: '.75rem' }}>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>{inline ? 'Limpiar' : 'Cancelar'}</button>
            <button className="btn-primary" style={{ flex: 2, justifyContent: 'center', minHeight: 44 }} onClick={enviar} disabled={guardando}>
              {guardando ? <span className="spinner" /> : modo === 'iniciar' ? <Play size={16} /> : modo === 'finalizar' ? <Square size={16} /> : <Save size={16} />}
              {modo === 'iniciar' ? 'Iniciar turno' : modo === 'finalizar' ? 'Finalizar turno' : inline ? 'Guardar turno' : 'Guardar'}
            </button>
          </div>
        </div>
  )

  // Formulario dentro de la página (pestaña Registrar)
  if (inline) return <div style={{ maxWidth: 640 }}>{cuerpo}</div>

  // Modal: portal al <body> para que ningún contenedor con transform/overflow lo recorte
  return createPortal(
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.5rem', width: '100%', maxWidth: 520, maxHeight: 'calc(100dvh - 2rem)', overflowY: 'auto', animation: 'fadeUp .25s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
          <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '1.05rem', fontWeight: 700 }}>
            {TITULO[modo]}{est ? ` — Estación ${est.nombre}` : ''}
          </h3>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '.3rem .6rem' }}><X size={18} /></button>
        </div>
        {cuerpo}
      </div>
    </div>,
    document.body
  )
}
