// src/utils/exportExcel.js
import * as XLSX from 'xlsx'

// filas: array de objetos planos { Columna: valor, ... } — las llaves son
// exactamente los encabezados que va a mostrar el Excel, en el orden dado.
export function exportarExcel(filas, nombreArchivo) {
  const ws = XLSX.utils.json_to_sheet(filas)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Historial')
  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`)
}

// Varias hojas en un mismo libro: hojas = [{ nombre, filas }]
// El ancho de cada columna se ajusta al texto más largo (máx. 60).
export function exportarExcelHojas(hojas, nombreArchivo) {
  const wb = XLSX.utils.book_new()
  hojas.forEach(({ nombre, filas }) => {
    const ws = XLSX.utils.json_to_sheet(filas.length ? filas : [{ '': 'Sin datos' }])
    const cols = Object.keys(filas[0] || {})
    ws['!cols'] = cols.map(c => ({ wch: Math.min(60, Math.max(c.length, ...filas.map(f => String(f[c] ?? '').length)) + 2) }))
    XLSX.utils.book_append_sheet(wb, ws, nombre.slice(0, 31))
  })
  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`)
}
