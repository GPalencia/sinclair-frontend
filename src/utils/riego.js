// src/utils/riego.js — helpers del módulo Estaciones de Riego
import { fechaInput } from './fecha'

// 'HH:MM' de la hora actual del usuario
export function ahoraHHMM() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 1.5 -> '1:30'   (como se anota en la hoja de papel)
export function fmtHoras(h) {
  if (h == null || !Number.isFinite(h)) return '—'
  const min = Math.round(h * 60)
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`
}

// minutos -> '1 h 30 min' / '45 min'
export function fmtDuracion(min) {
  if (min == null || min < 0) return '—'
  const h = Math.floor(min / 60), m = min % 60
  return h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`
}

// Minutos transcurridos desde que arrancó un turno en curso (fecha del turno + hora inicio)
export function minutosDesdeInicio(turno, ahora = new Date()) {
  if (!turno?.fecha || !turno?.horaInicio) return null
  const inicio = new Date(`${fechaInput(turno.fecha)}T${turno.horaInicio}:00`)
  return Math.max(0, Math.round((ahora - inicio) / 60000))
}

// Minutos entre dos HH:MM (cruza medianoche si fin < inicio) — igual que el backend
export function minutosEntre(ini, fin) {
  if (!ini || !fin) return null
  const [h1, m1] = ini.split(':').map(Number)
  const [h2, m2] = fin.split(':').map(Number)
  let min = (h2 * 60 + m2) - (h1 * 60 + m1)
  if (min < 0) min += 24 * 60
  return min
}

export const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v))
export const vacioSiNull = (v) => (v === null || v === undefined ? '' : v)

export const fmtNum = (n, dec = 2) =>
  n == null || !Number.isFinite(n) ? '—' : n.toLocaleString('es-HN', { maximumFractionDigits: dec })

// Siguiente lote de la secuencia de la estación (después de `actual`); si no hay, el primero
export function siguienteLote(estacion, actual) {
  const lotes = (estacion?.lotes || []).map(l => l.codigo)
  if (!lotes.length) return ''
  const i = lotes.indexOf(actual)
  return lotes[(i + 1) % lotes.length]
}

export const UNIDADES = ['lb', 'kg', 'L', 'gal', 'oz']
