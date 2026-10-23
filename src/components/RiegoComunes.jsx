// src/components/RiegoComunes.jsx
// Piezas compartidas por la página de Riego (formulario) y el Modo Tablet:
// tabla de turnos, tarjeta de estación, insignias y la lógica para validar /
// armar / encadenar turnos.
import { Pencil, Play, Square, Trash2 } from 'lucide-react'
import { fechaCorta } from '../utils/fecha'
import { fmtHoras, fmtNum, fmtDuracion, minutosDesdeInicio, siguienteLote } from '../utils/riego'

export const textoProductos = (t) => (t.productos || []).map(p => `${p.nombre}${p.cantidad != null ? ` ${p.cantidad} ${p.unidad}` : ''}`).join(', ')
const KEY_ESTACIONERO = 'riego.ultimoEstacionero'

export function leerEstacionero() { try { return localStorage.getItem(KEY_ESTACIONERO) || '' } catch { return '' } }
export function guardarEstacionero(n) { try { if (n) localStorage.setItem(KEY_ESTACIONERO, n) } catch { /* sin almacenamiento */ } }

export function BadgeTipo({ t }) {
  return <span className={`badge ${t.tipo === 'Fertirriego' ? 'badge-yellow' : 'badge-blue'}`}>{t.tipo === 'Fertirriego' ? '🧪 Fertirriego' : '💧 Riego'}</span>
}

// ── Tarjeta de una estación en el tablero de "Hoy" ─────────────
export function TarjetaEstacion({ estacion, turno, ahora, onIniciar, onFinalizar }) {
  const regando = !!turno
  const min = regando ? minutosDesdeInicio(turno, ahora) : null
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', borderColor: regando ? 'var(--verde)' : undefined, borderWidth: regando ? 2 : undefined }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.5rem' }}>
        <div>
          <div style={{ fontSize: '.72rem', color: 'var(--muted)' }}>{estacion.finca}</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>Estación {estacion.nombre}</div>
        </div>
        <span className={`badge ${regando ? 'badge-green' : 'badge-gray'}`}>{regando ? '● Regando' : 'Libre'}</span>
      </div>

      {regando ? (
        <>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'DM Mono, monospace', color: 'var(--verde)' }}>
              Lote {turno.lote}{turno.sector && <span style={{ fontSize: '1rem', color: 'var(--text2)', fontWeight: 600 }}> · turno {turno.sector}</span>}
            </div>
            <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '.25rem' }}>
              <BadgeTipo t={turno} />
              <span style={{ fontSize: '.82rem', color: 'var(--text2)' }}>desde las <b>{turno.horaInicio}</b> · {fmtDuracion(min)}</span>
            </div>
            {turno.tipo === 'Fertirriego' && textoProductos(turno) && (
              <div style={{ fontSize: '.8rem', color: 'var(--muted)', marginTop: '.3rem' }}>{textoProductos(turno)}</div>
            )}
            {turno.estacionero && <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: '.2rem' }}>Estacionero: {turno.estacionero}</div>}
          </div>
          <button className="btn-primary" style={{ justifyContent: 'center', minHeight: 46, background: '#dc2626' }} onClick={() => onFinalizar(turno)}>
            <Square size={16} /> Finalizar turno
          </button>
        </>
      ) : (
        <button className="btn-primary" style={{ justifyContent: 'center', minHeight: 46 }} onClick={() => onIniciar(estacion)}>
          <Play size={16} /> Iniciar turno
        </button>
      )}
    </div>
  )
}

// ── Tabla de turnos (Hoy e Historial) ──────────────────────────
export function TablaTurnos({ turnos, onEditar, onEliminar, esAdmin, conTotales }) {
  const terminados = turnos.filter(t => t.calculado?.horasTurno != null)
  const horas = terminados.reduce((a, t) => a + t.calculado.horasTurno, 0)
  const conGalones = turnos.filter(t => t.calculado?.galonesGastados != null)
  const galones = conGalones.reduce((a, t) => a + t.calculado.galonesGastados, 0)
  const horasConGalones = conGalones.reduce((a, t) => a + (t.calculado.horasTurno || 0), 0)

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="tbl">
        <thead>
          <tr>
            <th>Fecha</th><th>Estación</th><th>Lote</th><th>Tipo</th><th>Inicio</th><th>Fin</th><th>Horas</th>
            <th>Horómetro</th><th>Diesel (gal)</th><th>Gasto</th><th>Estacionero</th>
            {onEditar && <th style={{ position: 'sticky', right: 0, background: 'var(--card2)', boxShadow: '-4px 0 6px -4px rgba(0,0,0,.15)' }}></th>}
          </tr>
        </thead>
        <tbody>
          {turnos.map(t => (
            <tr key={t._id}>
              <td style={{ whiteSpace: 'nowrap', fontSize: '.8rem' }}>
                <span style={{ fontFamily: 'DM Mono, monospace', color: 'var(--muted)' }}>{fechaCorta(t.fecha)}</span>
                <div style={{ fontSize: '.7rem', color: 'var(--muted2)', textTransform: 'capitalize' }}>{fechaCorta(t.fecha, { weekday: 'long' })}</div>
              </td>
              <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{t.estacion?.nombre ?? '—'}</td>
              <td style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {t.lote}
                {t.sector && <div style={{ fontSize: '.7rem', color: 'var(--muted)', fontWeight: 500 }}>turno {t.sector}</div>}
              </td>
              <td>
                <BadgeTipo t={t} />
                {t.productos?.length > 0 && <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginTop: '.2rem' }}>{textoProductos(t)}</div>}
              </td>
              <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>{t.horaInicio}</td>
              <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>
                {t.horaFin || <span className="badge badge-green">En curso</span>}
              </td>
              <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem', fontWeight: 600 }}>{fmtHoras(t.calculado?.horasTurno)}</td>
              <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.78rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                {t.horometroInicial != null || t.horometroFinal != null ? `${t.horometroInicial ?? '—'} → ${t.horometroFinal ?? '—'}` : '—'}
              </td>
              <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.78rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                {t.combustibleInicial != null || t.combustibleFinal != null ? `${t.combustibleInicial ?? '—'} → ${t.combustibleFinal ?? '—'}` : '—'}
              </td>
              <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem', fontWeight: 600, color: 'var(--verde)' }}>
                {t.calculado?.galonesGastados != null ? fmtNum(t.calculado.galonesGastados) : '—'}
              </td>
              <td style={{ fontSize: '.82rem' }}>
                {t.estacionero || '—'}
                {(t.registradoPor || t.modificadoPor) && (
                  <div style={{ fontSize: '.68rem', color: 'var(--muted2)', whiteSpace: 'nowrap' }}>
                    {t.registradoPor && <>reg. {t.registradoPor.nombre}</>}
                    {t.modificadoPor && <> · mod. {t.modificadoPor.nombre}</>}
                  </div>
                )}
              </td>
              {onEditar && <td style={{ position: 'sticky', right: 0, background: 'var(--card)', boxShadow: '-4px 0 6px -4px rgba(0,0,0,.15)' }}>
                <div style={{ display: 'flex', gap: '.25rem' }}>
                  <button className="btn-ghost" style={{ padding: '.35rem .6rem' }} onClick={() => onEditar(t)} title="Editar turno"><Pencil size={14} /></button>
                  {esAdmin && <button className="btn-ghost" style={{ padding: '.35rem .6rem', color: 'var(--danger)' }} onClick={() => onEliminar(t)} title="Eliminar turno"><Trash2 size={14} /></button>}
                </div>
              </td>}
            </tr>
          ))}
          {!turnos.length && <tr><td colSpan={onEditar ? 12 : 11} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>Sin turnos</td></tr>}
        </tbody>
        {conTotales && turnos.length > 0 && (
          <tfoot>
            <tr style={{ background: 'var(--card2)', borderTop: '2px solid var(--border2)', fontWeight: 700 }}>
              <td colSpan={6} style={{ fontSize: '.75rem', textTransform: 'uppercase', color: 'var(--muted)' }}>Totales ({turnos.length} turnos)</td>
              <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.85rem' }}>{fmtHoras(horas)}</td>
              <td></td><td></td>
              <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.85rem', color: 'var(--verde)' }}>
                {conGalones.length ? fmtNum(galones) : '—'}
                {horasConGalones > 0 && <div style={{ fontSize: '.65rem', color: 'var(--muted)', fontWeight: 500 }}>{fmtNum(galones / horasConGalones)} gal/h</div>}
              </td>
              <td></td>
              {onEditar && <td style={{ position: 'sticky', right: 0, background: 'var(--card2)' }}></td>}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}


// ── Lógica de guardado (igual en formulario, modales y tablet) ─────────

// Devuelve el mensaje de error o null
export function validarTurno(modo, f) {
  if (!f.estacion) return 'Selecciona la estación'
  if (!f.lote?.trim()) return 'Selecciona el lote'
  if (modo !== 'finalizar' && !f.horaInicio) return 'La hora de inicio es obligatoria'
  if ((modo === 'finalizar' || modo === 'manual') && !f.horaFin) return 'La hora de fin es obligatoria'
  if (f.tipo === 'Fertirriego' && f.productos.some(p => !p.nombre.trim())) return 'Escribe el nombre de cada producto o quítalo'
  return null
}

export function bodyTurno(modo, f) {
  return {
    fecha: f.fecha, estacion: f.estacion, lote: f.lote.trim(), sector: f.sector || '', tipo: f.tipo, productos: f.productos,
    horaInicio: f.horaInicio || undefined, horaFin: modo === 'iniciar' ? undefined : (f.horaFin || null),
    rpm: f.rpm, horometroInicial: f.horometroInicial, horometroFinal: f.horometroFinal,
    combustibleInicial: f.combustibleInicial, combustibleFinal: f.combustibleFinal, combustibleAgregado: f.combustibleAgregado,
    estacionero: f.estacionero, observaciones: f.observaciones,
  }
}

// Datos para arrancar el turno que sigue: empieza donde terminó este (hora,
// horómetro, diesel). Con sector numerado (10.12) propone el siguiente (10.13)
// en el mismo lote; sin sector, el siguiente lote de la estación.
export function prefillSiguiente(f, estaciones) {
  const est = estaciones.find(e => e._id === f.estacion)
  const m = (f.sector || '').match(/^(.*?)(\d+)$/)
  const sigSector = m ? `${m[1]}${String(Number(m[2]) + 1).padStart(m[2].length, '0')}` : ''
  return {
    estacion: f.estacion,
    lote: m ? f.lote : siguienteLote(est, f.lote), sector: sigSector,
    tipo: f.tipo, productos: f.productos.map(p => ({ nombre: p.nombre, cantidad: '', unidad: p.unidad })),
    horaInicio: f.horaFin || '', horaFin: '', rpm: f.rpm ?? '',
    horometroInicial: f.horometroFinal ?? '', combustibleInicial: f.combustibleFinal ?? '',
    estacionero: f.estacionero,
  }
}
