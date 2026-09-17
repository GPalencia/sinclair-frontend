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
