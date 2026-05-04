// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react'

const BASE = import.meta.env.VITE_API_URL || '/api'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario]   = useState(null)
  const [token, setToken]       = useState(localStorage.getItem('sinclair_token'))
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (token) verificarToken()
    else setCargando(false)
  }, [])

  async function verificarToken() {
    try {
      const res  = await fetch(`${BASE}/auth/yo`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.ok) setUsuario(data.usuario)
      else logout()
    } catch {
      logout()
    } finally {
      setCargando(false)
    }
  }

  async function login(email, password) {
    const res  = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    const data = await res.json()
    if (!data.ok) throw new Error(data.mensaje)
    localStorage.setItem('sinclair_token', data.token)
    setToken(data.token)
    setUsuario(data.usuario)
    return data
  }

  function logout() {
    localStorage.removeItem('sinclair_token')
    setToken(null)
    setUsuario(null)
  }

  return (
    <AuthContext.Provider value={{ usuario, token, login, logout, cargando }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)