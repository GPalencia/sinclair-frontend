// src/utils/lugarCarga.js — dónde se cargó el diesel (igual que backend/models/Despacho.js)
// EF y EL salen del mismo tanque de la empresa; EXT (gasolinera externa) no toca el inventario.
export const LUGARES_CARGA = [
  ['EF', 'Estación Finca'],
  ['EL', 'Estación Camiones de Línea'],
  ['EXT', 'Gasolinera externa'],
]
export const nombreLugar = (c) => (LUGARES_CARGA.find(([k]) => k === (c || 'EF')) || LUGARES_CARGA[0])[1]

// Sugerencia: si en el catálogo la unidad dice "línea" se propone EL
export const esCamionLinea = (m) => /l[ií]nea/i.test(`${m?.tipo || ''} ${m?.unidadDestino || ''}`)
export const lugarSugerido = (m) => (esCamionLinea(m) ? 'EL' : 'EF')
