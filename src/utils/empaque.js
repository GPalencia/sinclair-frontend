// src/utils/empaque.js — mismos factores que el backend
// (controllers/produccion.controller.js, constante EMPAQUE). Solo se usan para
// la vista previa del formulario; los valores oficiales los calcula el backend.
//   Rend.     = Peso x Cesta / 15.4   (Peso x Cesta = peso neto de las 3 cestas / 3)
//   Cajas 7KG = Cestas × Rend.
//   Cajas 4KG = Cajas 7KG × 6.36 / 4.2   (Hindú)
//   Cajas 5KG = Cajas 7KG × 6.36 / 5.2   (Americana)
export const EMPAQUE = { pesoCaja7kg: 15.4, netoCaja7kg: 6.36, netoCaja4kg: 4.2, netoCaja5kg: 5.2 }

const esHindu = (v) => /hind/i.test(String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, ''))
const esAmericana = (v) => /americ/i.test(String(v || ''))
const r = (n, d = 2) => (n == null || !Number.isFinite(n) ? null : Math.round(n * 10 ** d) / 10 ** d)

export function calcularEmpaque({ pesoNeto, cestas, rendManual, variedad }) {
  const peso = pesoNeto === '' || pesoNeto == null ? null : Number(pesoNeto)
  const c = cestas === '' || cestas == null ? null : Number(cestas)
  const pesoXCesta = peso != null ? peso / 3 : null
  // Rend. redondeado a 2 decimales antes de usarse (igual que el backend y el Excel del historial)
  const rend = pesoXCesta != null ? Math.round(pesoXCesta / EMPAQUE.pesoCaja7kg * 100) / 100
    : (rendManual === '' || rendManual == null ? null : Number(rendManual))
  const cajas7kg = c != null && rend != null ? c * rend : null
  return {
    pesoXCesta: r(pesoXCesta),
    rendimiento: r(rend, 2),
    cajas7kg: r(cajas7kg),
    cajas4kg: cajas7kg != null && esHindu(variedad) ? r(cajas7kg * EMPAQUE.netoCaja7kg / EMPAQUE.netoCaja4kg) : null,
    cajas5kg: cajas7kg != null && esAmericana(variedad) ? r(cajas7kg * EMPAQUE.netoCaja7kg / EMPAQUE.netoCaja5kg) : null,
  }
}
