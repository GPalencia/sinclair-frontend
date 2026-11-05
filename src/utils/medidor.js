// src/utils/medidor.js — qué medidor lleva una unidad de la Estación Diesel.
//
// Regla: lo que diga el catálogo (Kilometraje / Horometro). Además, toda
// ESTACIÓN DE RIEGO lleva horómetro aunque en el catálogo haya quedado como
// "Ninguno": se reconoce porque su tipo o su nombre dicen "riego"
// (ej. tipo "Equipo Estacionario - Riego", "ESTACION DE RIEGO Nº2 - SAN JUAN").
// La misma regla está en backend/controllers/estacion.controller.js.

export const esEstacionRiego = (m) => /riego/i.test(`${m?.tipo || ''} ${m?.unidadDestino || ''}`)

// 'Kilometraje' | 'Horometro' | null
export function medidorDe(m) {
  if (!m) return null
  if (m.tipoMedidor === 'Kilometraje' || m.tipoMedidor === 'Horometro') return m.tipoMedidor
  if (esEstacionRiego(m)) return 'Horometro'
  return null
}
