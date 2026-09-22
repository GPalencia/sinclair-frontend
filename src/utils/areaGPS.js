// src/utils/areaGPS.js
import { fromLatLon } from 'utm'

// Convierte los puntos {lat, lng} capturados por GPS a UTM (metros) y
// calcula el área encerrada con la fórmula de Gauss (shoelace) — la misma
// lógica que usa cualquier app de medición de terrenos (como la de Google
// Maps). Devuelve el área en metros cuadrados.
export function calcularAreaM2(puntos) {
  if (puntos.length < 3) return 0
  const utmPts = puntos.map(p => {
    const { easting, northing } = fromLatLon(p.lat, p.lng)
    return { x: easting, y: northing }
  })
  let suma = 0
  for (let i = 0; i < utmPts.length; i++) {
    const a = utmPts[i]
    const b = utmPts[(i + 1) % utmPts.length]
    suma += a.x * b.y - b.x * a.y
  }
  return Math.abs(suma) / 2
}

// 1 manzana = 7,000 m² (la misma conversión que ya usa Germán en su Excel
// de Áreas_MZ: =m2/7000)
export function m2AManzanas(m2) {
  return m2 / 7000
}
