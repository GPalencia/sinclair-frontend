// src/pages/Login.jsx
import { useState } from 'react'
import { LogIn } from 'lucide-react'

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

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#f8fafc',
    }}>
      {/* Franja superior */}
      <div style={{ height: 8, background: 'var(--verde)' }} />

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        {/* Card */}
        <div style={{
          width: '100%',
          maxWidth: 400,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 10,
          padding: '2.5rem 2rem',
        }}>
          {/* Logo + título */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <img src={LOGO} alt="Sinclair" style={{ height: 84, width: 84, objectFit: 'contain', display: 'block', margin: '0 auto 1rem' }} />
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '.06em', color: 'var(--verde)', marginBottom: '.35rem' }}>
              SINCLAIR
            </div>
            <p style={{ fontSize: '.9rem', color: '#334155', fontWeight: 500 }}>Sistema de Control de Fincas</p>
          </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="lbl">Email</label>
            <input
              className="inp"
              type="email"
              placeholder="admin@sinclair.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="lbl">Contraseña</label>
            <input
              className="inp"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              padding: '.6rem .9rem',
              fontSize: '.85rem',
              color: '#dc2626',
            }}>
              {error}
            </div>
          )}

          <button
            className="btn-primary"
            type="submit"
            disabled={cargando}
            style={{ width: '100%', justifyContent: 'center', marginTop: '.5rem', padding: '.8rem' }}
          >
            {cargando ? <span className="spinner" /> : <><LogIn size={16} /> Ingresar</>}
          </button>
        </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '.75rem', color: 'var(--muted)' }}>
            Sinclair Reliable Producers © 2026
          </div>
        </div>
      </div>
    </div>
  )
}
