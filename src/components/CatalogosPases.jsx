// src/components/CatalogosPases.jsx
import { useState } from 'react'
import CatalogoBodegas from './CatalogoBodegas'
import CatalogoArticulosBodega from './CatalogoArticulosBodega'

export default function CatalogosPases({ onCambioBodegas, onCambioArticulos }) {
  const [sub, setSub] = useState('bodegas') // 'bodegas' | 'articulos'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
        {[['bodegas', 'Bodegas'], ['articulos', 'Artículos']].map(([key, label]) => (
          <button key={key} type="button" onClick={() => setSub(key)} className={sub === key ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '.8rem', padding: '.5rem .9rem' }}>
            {label}
          </button>
        ))}
      </div>
      {sub === 'bodegas' ? <CatalogoBodegas onCambio={onCambioBodegas} /> : <CatalogoArticulosBodega onCambio={onCambioArticulos} />}
    </div>
  )
}
