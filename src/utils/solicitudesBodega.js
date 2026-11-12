// src/utils/solicitudesBodega.js — mismas reglas que backend/utils/solicitudesBodega.js

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
