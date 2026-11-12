// src/utils/solicitudesBodega.js — mismas reglas que backend/utils/solicitudesBodega.js

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
