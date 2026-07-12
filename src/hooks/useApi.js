// src/hooks/useApi.js
import { useAuth } from '../context/AuthContext'
import { useToast } from '../hooks/useToast'

const BASE = import.meta.env.VITE_API_URL || '/api'

export function useApi() {
  const { token, logout } = useAuth()
  const { toast } = useToast()

  const headers = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  })

  async function request(url, options = {}) {
    try {
      const res  = await fetch(`${BASE}${url}`, { ...options, headers: { ...headers(), ...options.headers } })
      if (res.status === 401) { logout(); return null }
      const data = await res.json()
      return data
    } catch (e) {
      toast('Error de conexión con el servidor', 'error')
      return null
    }
  }

  async function requestBlob(url) {
    const res = await fetch(`${BASE}${url}`, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error('Error al descargar')
    return res.blob()
  }

  const get    = (url)       => request(url)
  const post   = (url, body) => request(url, { method: 'POST', body: JSON.stringify(body) })
  const put    = (url, body) => request(url, { method: 'PUT',  body: JSON.stringify(body) })
  const del    = (url)       => request(url, { method: 'DELETE' })

  async function postForm(url, formData) {
    try {
      const res = await fetch(`${BASE}${url}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      if (res.status === 401) { logout(); return null }
      return res.json()
    } catch (e) {
      toast('Error de conexión con el servidor', 'error')
      return null
    }
  }

  async function putForm(url, formData) {
    try {
      const res = await fetch(`${BASE}${url}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      if (res.status === 401) { logout(); return null }
      return res.json()
    } catch (e) {
      toast('Error de conexión con el servidor', 'error')
      return null
    }
  }

  return { get, post, put, del, postForm, putForm, requestBlob }
}
