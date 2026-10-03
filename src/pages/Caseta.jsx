// src/pages/Caseta.jsx
// Pantalla pensada para quedarse abierta en una tablet/monitor fijo en la
// caseta. Sin sidebar, sin menús — el guardia solo ve la lista y toca
// "Despachar". Se actualiza sola cada 20s para traer pases nuevos.
import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, LogOut, PackageCheck, RefreshCw } from 'lucide-react'
import LOGO from '../assets/logo'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../hooks/useToast'

export default function Caseta() {
  const api        = useApi()
  const { toast }  = useToast()
  const { usuario, logout } = useAuth()

  const [pases, setPases]       = useState([])
  const [cargando, setCargando] = useState(true)
  const [despachando, setDespachando] = useState(null)

  const cargar = useCallback(async () => {
    const res = await api.get('/pases-salida/pases/hoy')
    if (res?.ok) setPases(res.data)
    setCargando(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    cargar()
    const t = setInterval(cargar, 20000)
    return () => clearInterval(t)
  }, [cargar])

  async function despachar(p) {
    if (!window.confirm(`¿Confirmar que el Pase #${p.folio} (${p.autorizadoPara}) está saliendo?`)) return
    setDespachando(p._id)
    try {
      const res = await api.put(`/pases-salida/pases/${p._id}/despachar`)
      if (!res?.ok) { toast(res?.mensaje || 'Error', 'error'); return }
      toast(`✅ Pase #${p.folio} despachado`, 'ok')
      cargar()
    } finally {
      setDespachando(null)
    }
  }

  const pendientes  = pases.filter(p => p.estado === 'Autorizado')
  const despachados = pases.filter(p => p.estado === 'Despachado')

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'var(--verde)', color: '#fff', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <img src={LOGO} alt="Sinclair" style={{ height: 40, width: 40, objectFit: 'contain' }} />
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>Caseta — Pases de Salida</div>
            <div style={{ fontSize: '.8rem', opacity: .85 }}>
              {new Date().toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={cargar} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', borderRadius: 8, padding: '.6rem .9rem', display: 'flex', alignItems: 'center', gap: '.4rem', cursor: 'pointer', fontSize: '.85rem' }}>
            <RefreshCw size={16} /> Actualizar
          </button>
          <button onClick={logout} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', borderRadius: 8, padding: '.6rem .9rem', display: 'flex', alignItems: 'center', gap: '.4rem', cursor: 'pointer', fontSize: '.85rem' }}>
            <LogOut size={16} /> Salir
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text)', marginBottom: '1rem' }}>
          Pendientes de salida — {pendientes.length}
        </h2>

        {cargando ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}><span className="spinner" /></div>
        ) : !pendientes.length ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)', fontSize: '1.05rem' }}>
            No hay pases pendientes de salida en este momento.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {pendientes.map(p => (
              <div key={p._id} style={{ background: '#fff', border: '2px solid var(--verde-mid)', borderRadius: 14, padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '.4rem' }}>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 800, fontSize: '1.3rem', color: 'var(--verde-dark)' }}>#{p.folio}</span>
                    <span style={{ fontSize: '.85rem', color: 'var(--muted)' }}>{p.bodega?.nombre}</span>
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text)', marginBottom: '.2rem' }}>
                    {p.autorizadoPara}
                  </div>
                  <div style={{ fontSize: '.95rem', color: 'var(--text2)' }}>
                    {p.tipoMovimiento}{p.destino ? ` → ${p.destino}` : ''}
                  </div>
                  {(p.transporte || p.placa) && (
                    <div style={{ fontSize: '.9rem', color: 'var(--muted)' }}>
                      🚚 {p.transporte || '—'} {p.placa ? `· Placa ${p.placa}` : ''}
                    </div>
                  )}
                  <div style={{ fontSize: '.85rem', color: 'var(--muted)', marginTop: '.3rem' }}>
                    {p.items?.map(i => `${i.cantidad} ${i.unidadMedida} ${i.nombre}`).join(' · ')}
                  </div>
                </div>
                <button
                  onClick={() => despachar(p)}
                  disabled={despachando === p._id}
                  style={{
                    background: 'var(--verde)', color: '#fff', border: 'none', borderRadius: 12,
                    padding: '1.1rem 1.8rem', fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '.6rem', whiteSpace: 'nowrap',
                  }}>
                  {despachando === p._id ? <span className="spinner" /> : <PackageCheck size={22} />}
                  Despachar
                </button>
              </div>
            ))}
          </div>
        )}

        {despachados.length > 0 && (
          <>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--muted)', marginTop: '2rem', marginBottom: '.75rem' }}>
              Ya despacharon hoy — {despachados.length}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {despachados.map(p => (
                <div key={p._id} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 10, padding: '.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '.75rem', opacity: .7 }}>
                  <CheckCircle2 size={18} color="var(--verde)" />
                  <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, color: 'var(--verde-dark)' }}>#{p.folio}</span>
                  <span style={{ fontWeight: 600 }}>{p.autorizadoPara}</span>
                  <span style={{ fontSize: '.85rem', color: 'var(--muted)' }}>— {p.bodega?.nombre}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
