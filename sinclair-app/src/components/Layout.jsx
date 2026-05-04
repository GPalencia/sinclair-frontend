// src/components/Layout.jsx
import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/dashboard',  icon: '▦',  label: 'Dashboard'      },
  { to: '/registro',   icon: '✦',  label: 'Registro'       },
  { to: '/personal',   icon: '◈',  label: 'Personal'       },
  { to: '/historial',  icon: '◎',  label: 'Historial'      },
  { to: '/catalogos',  icon: '⊞',  label: 'Catálogos'      },
]

export default function Layout({ children }) {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Overlay móvil */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 40 }}
        />
      )}

      {/* ── Sidebar ── */}
      <aside style={{
        width: 220,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 50,
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform .25s ease',
      }}
        className="md-sidebar"
      >
        {/* Logo */}
        <div style={{ padding: '1.5rem 1.25rem 1rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1rem', fontWeight: 800, letterSpacing: '.05em' }}>
            <span style={{ color: 'var(--verde)' }}>SINCLAIR</span>
            <span style={{ color: 'var(--muted)', fontSize: '.75rem', fontWeight: 400 }}> /APP</span>
          </div>
          <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: '.2rem' }}>
            Reliable Producers
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '.75rem .75rem', display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '.75rem',
                padding: '.65rem .9rem',
                borderRadius: 9,
                fontFamily: 'Syne, sans-serif',
                fontSize: '.85rem',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--verde)' : 'var(--muted)',
                background: isActive ? 'rgba(34,197,94,.08)' : 'transparent',
                border: isActive ? '1px solid rgba(34,197,94,.15)' : '1px solid transparent',
                textDecoration: 'none',
                transition: 'all .18s',
              })}
            >
              <span style={{ fontSize: '1rem', width: 20, textAlign: 'center' }}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Usuario */}
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginBottom: '.5rem', fontFamily: 'DM Mono, monospace' }}>
            {usuario?.email}
          </div>
          <button
            onClick={handleLogout}
            className="btn-ghost"
            style={{ width: '100%', justifyContent: 'center', fontSize: '.82rem', color: 'var(--danger)' }}
          >
            ⎋ Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Contenido principal ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: 0 }} className="main-content">

        {/* Header móvil */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '.9rem 1.25rem',
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}>
          <button
            onClick={() => setOpen(!open)}
            className="btn-ghost"
            style={{ fontSize: '1.2rem', padding: '.4rem .6rem' }}
          >
            ☰
          </button>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '.95rem', color: 'var(--verde)' }}>
            SINCLAIR/APP
          </div>
          <div style={{ fontSize: '.8rem', color: 'var(--muted)', fontFamily: 'DM Mono, monospace' }}>
            {usuario?.nombre?.split(' ')[0]}
          </div>
        </header>

        {/* Página */}
        <main style={{ flex: 1, padding: '1.5rem', maxWidth: 1100, width: '100%', margin: '0 auto' }}>
          {children}
        </main>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .md-sidebar {
            transform: translateX(0) !important;
            position: sticky !important;
            top: 0 !important;
            height: 100vh !important;
          }
          .main-content {
            margin-left: 220px !important;
          }
          header { display: none !important; }
        }
      `}</style>
    </div>
  )
}
