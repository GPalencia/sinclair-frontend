// src/components/CatalogosEstacion.jsx
import { useState } from 'react'
import CatalogoMaquinaria from './CatalogoMaquinaria'
import CatalogoRutas from './CatalogoRutas'

export default function CatalogosEstacion({ onCambioMaquinaria, onCambioRutas }) {
  const [sub, setSub] = useState('maquinaria') // 'maquinaria' | 'rutas'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
        {[['maquinaria', 'Maquinaria'], ['rutas', 'Rutas']].map(([key, label]) => (
          <button key={key} type="button" onClick={() => setSub(key)} className={sub === key ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '.8rem', padding: '.5rem .9rem' }}>
            {label}
          </button>
        ))}
      </div>
      {sub === 'maquinaria' ? <CatalogoMaquinaria onCambio={onCambioMaquinaria} /> : <CatalogoRutas onCambio={onCambioRutas} />}
    </div>
  )
}
