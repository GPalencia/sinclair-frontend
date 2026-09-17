// src/components/ComboboxBuscable.jsx
import { useState, useRef, useEffect } from 'react'
import { Search, ChevronDown } from 'lucide-react'

// options: [{ value, label, sublabel? }]
export default function ComboboxBuscable({ options, value, onChange, placeholder = 'Buscar...' }) {
  const [query, setQuery] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [resaltado, setResaltado] = useState(0)
  const boxRef = useRef(null)

  const seleccionado = options.find(o => o.value === value)

  useEffect(() => {
    function alClicFuera(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setAbierto(false)
    }
    document.addEventListener('mousedown', alClicFuera)
    return () => document.removeEventListener('mousedown', alClicFuera)
  }, [])

  const filtradas = query.trim()
    ? options.filter(o =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        o.sublabel?.toLowerCase().includes(query.toLowerCase())
      )
    : options

  function elegir(opt) {
    onChange(opt.value)
    setQuery('')
    setAbierto(false)
  }

  function alTeclear(e) {
    if (!abierto) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setResaltado(p => Math.min(p + 1, filtradas.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setResaltado(p => Math.max(p - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtradas[resaltado]) elegir(filtradas[resaltado]) }
    else if (e.key === 'Escape') { setAbierto(false) }
  }

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          className="inp"
          style={{ paddingLeft: '2.2rem', paddingRight: '2.2rem' }}
          placeholder={placeholder}
          value={abierto ? query : (seleccionado?.label || '')}
          onFocus={() => { setAbierto(true); setQuery(''); setResaltado(0) }}
          onChange={e => { setQuery(e.target.value); setAbierto(true); setResaltado(0) }}
          onKeyDown={alTeclear}
        />
        <Search size={15} style={{ position: 'absolute', left: '.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
        <ChevronDown size={15} style={{ position: 'absolute', right: '.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
      </div>

      {abierto && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 20,
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
          maxHeight: 260, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,.12)',
        }}>
          {filtradas.length === 0 && (
            <div style={{ padding: '.75rem 1rem', fontSize: '.85rem', color: 'var(--muted)' }}>Sin resultados</div>
          )}
          {filtradas.map((opt, i) => (
            <div
              key={opt.value}
              onMouseDown={() => elegir(opt)}
              onMouseEnter={() => setResaltado(i)}
              style={{
                padding: '.6rem 1rem', cursor: 'pointer', fontSize: '.87rem',
                background: i === resaltado ? 'var(--verde-light)' : 'transparent',
                color: i === resaltado ? 'var(--verde-dark)' : 'var(--text)',
                borderBottom: '1px solid var(--card2)',
              }}
            >
              {opt.label}
              {opt.sublabel && <div style={{ fontSize: '.76rem', color: 'var(--muted)' }}>{opt.sublabel}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
