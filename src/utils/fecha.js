// src/utils/fecha.js
// Convención: las fechas de calendario (despacho, cosecha, labor, registro de
// planilla...) se guardan a medianoche UTC del día elegido. Si se formatean en la
// zona horaria del navegador (Honduras = UTC-6), el 27/9 se vería como 26/9.
//
// Estos helpers son tolerantes con datos viejos: si el valor guardado NO es
// medianoche UTC exacta (por ejemplo un timestamp real o una fecha que quedó en
// medianoche local), se interpreta en la hora local del usuario, que es lo correcto.

const esMedianocheUTC = (d) =>
  d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0

const ymdLocal = (d) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]

// Texto de fecha para mostrar en pantalla / Excel. opciones = las de toLocaleDateString.
export function fechaCorta(f, opciones) {
  if (!f) return '—'
  const d = new Date(f)
  return d.toLocaleDateString('es-HN', { ...opciones, ...(esMedianocheUTC(d) ? { timeZone: 'UTC' } : {}) })
}

// Solo día/mes (etiquetas de gráficas)
export const fechaDiaMes = (f) => fechaCorta(f, { day: '2-digit', month: '2-digit' })

// 'YYYY-MM-DD' para poner un valor guardado dentro de un <input type="date">
export function fechaInput(f) {
  if (!f) return ''
  const d = new Date(f)
  return esMedianocheUTC(d) ? d.toISOString().split('T')[0] : ymdLocal(d)
}

// Fecha de HOY según el reloj del usuario. toISOString() usa UTC y después de las
// 6 pm en Honduras ya devolvía el día siguiente.
export function hoyLocal() {
  return ymdLocal(new Date())
}

// Fecha de hace N días (local), 'YYYY-MM-DD'
export function haceDiasLocal(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return ymdLocal(d)
}
