// src/utils/solicitudesBodega.js — mismas reglas que backend/utils/solicitudesBodega.js

// Correlativo de requisición: 15 -> "REQ-000015" (igual que el backend)
export const fmtReq = (folio) => `REQ-${String(folio ?? '').padStart(6, '0')}`

// Sugerencias para "Destino general" (se puede escribir otro)
export const DESTINOS_GENERALES = [
  'Finca 7 de Mayo', 'Finca San Juan', 'Finca Ojo de Agua', 'Finca Palmerola', 'Finca La Lujosa',
  'Finca El Vado', 'Finca Palenque', 'Finca La Canoa', 'Invernadero', 'Empaque', 'Taller', 'Bodega', 'Administración',
]

// Opciones del combobox de centros de costo: "FSJ10A — Finca San Juan Lote 10A"
export const opcionesCentros = (centros) => centros.map(c => ({
  value: c._id, label: c.codigo ? `${c.codigo} — ${c.nombre}` : c.nombre, sublabel: c.abreviatura || c.finca || '',
}))

export const COLOR_ESTADO_SOLICITUD = {
  Pendiente: 'badge-yellow',
  Revisada: 'badge-blue',
  Parcial: 'badge-blue',
  Despachada: 'badge-green',
  Rechazada: 'badge-red',
  Anulada: 'badge-gray',
}

// Lo que bodega se comprometió a entregar (aprobada; si aún no se revisa, lo pedido)
export const cantidadObjetivo = (it) => (it.cantidadAprobada != null ? it.cantidadAprobada : it.cantidadSolicitada)

// Lo que falta por despachar
export const pendienteDe = (it) => Math.max(0, Math.round((cantidadObjetivo(it) - (it.cantidadDespachada || 0)) * 1000) / 1000)

export const fmtCant = (n) => (n == null ? '—' : Number(n).toLocaleString('es-HN', { maximumFractionDigits: 3 }))

// Abre el PDF de una solicitud en otra pestaña
export async function abrirPDFSolicitud(api, toast, sol) {
  try {
    const blob = await api.requestBlob(`/solicitudes-bodega/solicitudes/${sol._id}/pdf`)
    window.open(URL.createObjectURL(blob), '_blank')
  } catch {
    toast('No se pudo abrir el PDF', 'error')
  }
}

// ── SODISA ───────────────────────────────────────────────────────
// Ayuda a Bodega a grabar las requisiciones en SODISA (Administración de
// Requisiciones). SODISA lleva UN centro de costo por requisición, así que una
// requisición de la App con varios centros sale en varias filas.
export const PROCESO_SODISA = '_REQFG'

const fFecha = (d, utc) => (d ? new Date(d).toLocaleDateString('es-HN', {
  timeZone: utc ? 'UTC' : 'America/Tegucigalpa', day: '2-digit', month: '2-digit', year: 'numeric',
}) : '')

// "Fumigación en Finca 7 de Mayo Lote 8, entregado a Kevin Varela"
export function observacionSodisa(sol, items, pases) {
  const usos = [...new Set(items.map(i => (i.uso || '').trim()).filter(Boolean))]
  const que = usos.join(' / ') || sol.observaciones || sol.destino || ''
  const donde = items[0]?.centroCostoNombre || ''
  const recibe = [...new Set(pases.map(p => p.firmaRecibe?.nombre || p.llevaConforme).filter(Boolean))].join(', ')
  return [que && donde ? `${que} en ${donde}` : (que || donde), recibe && `entregado a ${recibe}`].filter(Boolean).join(', ')
}

// Devuelve { resumen, detalle } listos para exportarExcelHojas
export function filasSodisa(lista) {
  const resumen = [], detalle = []
  lista.forEach(sol => {
    const pases = sol.pases || []
    const grupos = new Map()
    sol.items.forEach(it => {
      const k = it.centroCostoCodigo || '(sin centro)'
      if (!grupos.has(k)) grupos.set(k, [])
      grupos.get(k).push(it)
    })
    grupos.forEach((items, cc) => {
      // Salidas que llevaron algo de estas líneas
      const ids = new Set(items.map(i => String(i._id)))
      const pasesCC = pases.filter(p => (p.items || []).some(pi => ids.has(String(pi.solicitudItem))))
      const usados = pasesCC.length ? pasesCC : pases
      const ultimo = [...usados].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0]
      const bodegas = [...new Set(usados.map(p => p.bodega?.codigo || p.bodega?.nombre).filter(Boolean))]
      const despacha = [...new Set(usados.map(p => p.firmaEntrega?.nombre || p.entregadoPor).filter(Boolean))]
      resumen.push({
        'Definición Proceso': PROCESO_SODISA,
        'Número': sol.folio,   // la boleta que se graba en SODISA es la requisición de la App
        'Fecha Requisición': fFecha(sol.fecha, true),
        'Fecha Aprobación': fFecha(sol.fechaRevision),
        'Fecha Despacho': ultimo ? fFecha(ultimo.fecha, true) : '',
        'Centro Costo': cc,
        'Depto': sol.departamento?.codigo || '',
        'Bodega': bodegas.join(', '),
        'Solicitado por': sol.solicitanteCodigo || '',
        'Solicitado por Empleado': sol.solicitante || '',
        'Despachado por': despacha.join(', '),
        'Estatus': sol.grabadaSodisa ? 'Grabada en SODISA' : 'Por grabar',
        'Observaciones': observacionSodisa(sol, items, usados),
        // Referencia de la App (después de las columnas de SODISA)
        'Requisición App': fmtReq(sol.folio),
        'Departamento': sol.departamentoNombre || sol.departamento?.nombre || '',
        'Nombre centro costo': items[0]?.centroCostoNombre || '',
        'Salidas de Bodega': usados.map(p => p.folio).join(', '),
        'Estado App': sol.estado,
      })
      items.forEach(it => {
        const salidas = pases.filter(p => (p.items || []).some(pi => String(pi.solicitudItem) === String(it._id)))
        detalle.push({
          'Requisición App': fmtReq(sol.folio),
          'Centro Costo': cc,
          'Código artículo': it.codigo || '',
          'Descripción': it.descripcion,
          'U/M': it.unidadMedida || '',
          'Cant. solicitada': it.cantidadSolicitada ?? 0,
          'Cant. aprobada': cantidadObjetivo(it),
          'Cant. despachada': it.cantidadDespachada || 0,
          'Bodega': [...new Set(salidas.map(p => p.bodega?.codigo || p.bodega?.nombre).filter(Boolean))].join(', '),
          'Salida No.': salidas.map(p => p.folio).join(', '),
          'Uso': it.uso || '',
          'Nota bodega': it.notaBodega || '',
        })
      })
    })
  })
  return { resumen, detalle }
}
