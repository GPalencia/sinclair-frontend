// src/pages/Login.jsx
import { useState } from 'react'

import LOGO from '../assets/logo'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../hooks/useToast'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError]       = useState('')
  const { login }  = useAuth()
  const navigate   = useNavigate()
  const { toast }  = useToast()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      const data = await login(email, password)
      // La cuenta de caseta entra directo a su pantalla — nunca ve el
      // dashboard ni el resto de módulos.
      navigate(data.usuario?.rol === 'guardia' ? '/caseta' : '/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  function cancelar() {
    setEmail(''); setPassword(''); setError('')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo + título */}
        <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
          <img src={LOGO} alt="Sinclair" style={{ height: 96, width: 96, objectFit: 'contain', display: 'block', margin: '0 auto 1.25rem' }} />
          <div style={{ fontSize: '2.4rem', fontWeight: 700, letterSpacing: '.12em', color: 'var(--verde)', lineHeight: 1.1 }}>
            SINCLAIR
          </div>
          <div style={{ fontSize: '.85rem', color: 'var(--muted)', letterSpacing: '.3em', textTransform: 'uppercase', marginTop: '.6rem' }}>
            Sistema de Control de Fincas
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '.9rem' }}>
          <div>
            <label className="lbl">Usuario</label>
            <input className="inp" type="email" autoComplete="username" placeholder="correo@sinclair.com"
              value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="lbl">Contraseña</label>
            <input className="inp" type="password" autoComplete="current-password"
              value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          {error && (
            <div style={{ background: '#fdecea', border: '1px solid #f5c2c0', borderRadius: 4, padding: '.55rem .8rem', fontSize: '.875rem', color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '.6rem', justifyContent: 'center', marginTop: '.75rem' }}>
            <button className="btn-primary" type="submit" disabled={cargando} style={{ minWidth: 120, justifyContent: 'center' }}>
              {cargando ? <span className="spinner" style={{ borderTopColor: '#fff' }} /> : 'Acceder'}
            </button>
            <button className="btn-secondary" type="button" onClick={cancelar} style={{ minWidth: 120, justifyContent: 'center' }}>
              Cancelar
            </button>
          </div>
        </form>

        <div style={{ marginTop: '3rem', textAlign: 'center', fontSize: '.85rem', color: 'var(--text2)' }}>
          © {new Date().getFullYear()} Sinclair Import Group
        </div>
      </div>
    </div>
  )
}
