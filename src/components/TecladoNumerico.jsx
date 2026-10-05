// src/components/TecladoNumerico.jsx
// Teclado numérico grande para pantallas táctiles (tablet en la bomba de
// diesel). No escribe en ningún <input>: solo avisa qué tecla se tocó, y
// quien lo usa aplica el resultado con aplicarTecla().
import { Delete } from 'lucide-react'

const FILAS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['.', '0', '⌫'],
]

// Devuelve el nuevo texto del campo después de tocar una tecla.
//  - un solo punto decimal ('.' al inicio da '0.')
//  - máximo de decimales y de caracteres
//  - sin ceros a la izquierda ('05' → '5')
export function aplicarTecla(valor, tecla, { maxDecimales = 2, maxLargo = 9 } = {}) {
  if (tecla === 'C') return ''
  if (tecla === '⌫') return valor.slice(0, -1)
  if (tecla === '.') {
    if (valor.includes('.')) return valor
    return (valor === '' ? '0' : valor) + '.'
  }
  if (valor.length >= maxLargo) return valor
  if (valor.includes('.') && valor.split('.')[1].length >= maxDecimales) return valor
  if (valor === '0') return tecla
  return valor + tecla
}

export default function TecladoNumerico({ onTecla, deshabilitado }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
      {FILAS.map((fila, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.5rem' }}>
          {fila.map(t => (
            <button
              key={t}
              type="button"
              className="pos-tecla"
              disabled={deshabilitado}
              onClick={() => onTecla(t)}
              aria-label={t === '⌫' ? 'Borrar' : t === '.' ? 'Punto decimal' : t}
            >
              {t === '⌫' ? <Delete size={26} /> : t}
            </button>
          ))}
        </div>
      ))}
      <button
        type="button"
        className="pos-tecla pos-tecla-limpiar"
        disabled={deshabilitado}
        onClick={() => onTecla('C')}
      >
        Limpiar
      </button>
    </div>
  )
}
