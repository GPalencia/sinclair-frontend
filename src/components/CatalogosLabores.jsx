// src/components/CatalogosLabores.jsx
import { useState } from 'react'
import CatalogoLotesLabores from './CatalogoLotesLabores'
import CatalogoTiposLabor from './CatalogoTiposLabor'

export default function CatalogosLabores({ onCambioLotes, onCambioTipos }) {
  const [sub, setSub] = useState('lotes') // 'lotes' | 'tipos'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
        {[['lotes', 'Lotes'], ['tipos', 'Tipos de Labor']].map(([key, label]) => (
          <button key={key} type="button" onClick={() => setSub(key)} className={sub === key ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '.8rem', padding: '.5rem .9rem' }}>
            {label}
          </button>
        ))}
      </div>
      {sub === 'lotes' ? <CatalogoLotesLabores onCambio={onCambioLotes} /> : <CatalogoTiposLabor onCambio={onCambioTipos} />}
    </div>
  )
}
