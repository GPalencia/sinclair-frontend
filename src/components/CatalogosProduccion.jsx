// src/components/CatalogosProduccion.jsx
import { useState } from 'react'
import CatalogoLotesCosecha from './CatalogoLotesCosecha'
import CatalogoCultivos from './CatalogoCultivos'

export default function CatalogosProduccion({ onCambioLotes, onCambioCultivos }) {
  const [sub, setSub] = useState('lotes') // 'lotes' | 'cultivos'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
        {[['lotes', 'Lotes'], ['cultivos', 'Cultivos']].map(([key, label]) => (
          <button key={key} type="button" onClick={() => setSub(key)} className={sub === key ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '.8rem', padding: '.5rem .9rem' }}>
            {label}
          </button>
        ))}
      </div>
      {sub === 'lotes' ? <CatalogoLotesCosecha onCambio={onCambioLotes} /> : <CatalogoCultivos onCambio={onCambioCultivos} />}
    </div>
  )
}
