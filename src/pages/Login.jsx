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
      await login(email, password)
      navigate('/dashboard')
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
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #dcfce7 0%, #f0fdf4 50%, #bbf7d0 100%)',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Fondo decorativo */}
      <div style={{
        position: 'absolute',
        width: 500, height: 500,
        borderRadius: '50%',
        background: 'rgba(22,163,74,.04)',
        top: -100, left: -100,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        width: 400, height: 400,
        borderRadius: '50%',
        background: 'rgba(22,163,74,.03)',
        bottom: -80, right: -80,
        pointerEvents: 'none',
      }} />

      {/* Card */}
      <div className="fade-up" style={{
        width: '100%',
        maxWidth: 400,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 18,
        padding: '2.5rem',
        boxShadow: '0 8px 32px rgba(0,0,0,.08)',
        position: 'relative',
      }}>
        {/* Logo + título */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src={LOGO} alt="Sinclair" style={{ height: 90, width: 90, objectFit: 'contain', display: 'block', margin: '0 auto .75rem' }} />
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.6rem', fontWeight: 800, letterSpacing: '.04em', marginBottom: '.25rem' }}>
            <span style={{ color: 'var(--verde)' }}>SINCLAIR</span>
            <span style={{ color: 'var(--muted)', fontSize: '.95rem', fontWeight: 400 }}>/APP</span>
          </div>
          <p style={{ fontSize: '.85rem', color: 'var(--muted)' }}>Sistema de Operaciones de Fincas</p>
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
              background: 'rgba(239,68,68,.1)',
              border: '1px solid rgba(239,68,68,.2)',
              borderRadius: 8,
              padding: '.6rem .9rem',
              fontSize: '.85rem',
              color: '#f87171',
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

        <div style={{
          marginTop: '1.5rem',
          padding: '.75rem',
          background: 'var(--bg)',
          borderRadius: 8,
          fontSize: '.78rem',
          color: 'var(--muted)',
          fontFamily: 'DM Mono, monospace',
          textAlign: 'center',
        }}>
          Sinclair Reliable Producers © 2026
        </div>
      </div>
    </div>
  )
}
