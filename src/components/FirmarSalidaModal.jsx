// src/components/FirmarSalidaModal.jsx — "Firmar entrega" de una Salida de Bodega.
// Dos firmas en pantalla: Entregado por (Bodega) y Recibido / lleva conforme.
// Se pueden guardar juntas o una por una; mientras falte alguna, la salida queda
// "Pendiente de firma" y la caseta no la deja pasar.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, FileText, PenLine, X } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../context/AuthContext'
import FirmaPad from './FirmaPad'

const fmtHora = (d) => new Date(d).toLocaleString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function Bloque({ titulo, firmada, nombre, setNombre, onFirma }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '.9rem', background: 'var(--card2)', display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
      <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{titulo}</div>
      {firmada ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', color: 'var(--verde)', fontSize: '.88rem' }}>
          <CheckCircle2 size={18} /> Firmado por <b>{firmada.nombre}</b> — {fmtHora(firmada.fecha)}
        </div>
      ) : (
        <>
          <div>
            <label className="lbl" style={{ fontSize: '.7rem' }}>Nombre de quien firma *</label>
            <input className="inp" value={nombre} onChange={e => setNombre(e.target.value)} />
          </div>
          <FirmaPad onChange={onFirma} />
        </>
      )}
    </div>
  )
}

export default function FirmarSalidaModal({ pase, onClose, onFirmado, onVerPDF }) {
  const api = useApi()
  const { toast } = useToast()
  const { usuario } = useAuth()
  const [estado, setEstado] = useState({ firmaEntrega: pase.firmaEntrega || null, firmaRecibe: pase.firmaRecibe || null })
  const [nomEntrega, setNomEntrega] = useState(pase.entregadoPor || usuario?.nombre || '')
  const [nomRecibe, setNomRecibe] = useState(pase.llevaConforme || pase.autorizadoPara || '')
  const [imgEntrega, setImgEntrega] = useState(null)
  const [imgRecibe, setImgRecibe] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const completa = estado.firmaEntrega?.fecha && estado.firmaRecibe?.fecha

  async function guardar() {
    const pendientes = []
    if (!estado.firmaEntrega?.fecha && imgEntrega) pendientes.push({ tipo: 'entrega', nombre: nomEntrega, imagen: imgEntrega })
    if (!estado.firmaRecibe?.fecha && imgRecibe) pendientes.push({ tipo: 'recibe', nombre: nomRecibe, imagen: imgRecibe })
    if (!pendientes.length) return toast('Falta la firma', 'error')
    if (pendientes.some(p => !p.nombre.trim())) return toast('Escribe el nombre de quien firma', 'error')

    setGuardando(true)
    try {
      let ultimo = null
      for (const p of pendientes) {
        const res = await api.post(`/pases-salida/pases/${pase._id}/firmas`, p)
        if (!res?.ok) { toast(res?.mensaje || 'No se pudo guardar la firma', 'error'); break }
        ultimo = res
        setEstado({ firmaEntrega: res.data.firmaEntrega, firmaRecibe: res.data.firmaRecibe })
      }
      if (ultimo) { toast(ultimo.mensaje, 'ok'); onFirmado?.(ultimo.data) }
    } finally { setGuardando(false) }
  }

  return createPortal(
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.4rem', width: '100%', maxWidth: 760, maxHeight: 'calc(100dvh - 2rem)', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '.75rem', marginBottom: '.9rem' }}>
          <div>
            <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '1.1rem', fontWeight: 700 }}>Firmar entrega — Salida No. {pase.folio}</h3>
            <div style={{ fontSize: '.82rem', color: 'var(--muted)', marginTop: '.15rem' }}>
              {pase.autorizadoPara}{pase.destino ? ` · ${pase.destino}` : ''} · {pase.items?.length || 0} artículo{pase.items?.length === 1 ? '' : 's'}
            </div>
          </div>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '.3rem .6rem' }}><X size={18} /></button>
        </div>

        {pase.items?.length > 0 && (
          <div style={{ fontSize: '.8rem', color: 'var(--text2)', background: 'var(--card2)', borderRadius: 10, padding: '.6rem .8rem', marginBottom: '.9rem', lineHeight: 1.6 }}>
            {pase.items.map((i, k) => <div key={k}>{i.cantidad} {i.unidadMedida} — {i.nombre}</div>)}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          <Bloque titulo="Entregado por (Bodega)" firmada={estado.firmaEntrega?.fecha && estado.firmaEntrega}
            nombre={nomEntrega} setNombre={setNomEntrega} onFirma={setImgEntrega} />
          <Bloque titulo="Recibido / lleva conforme" firmada={estado.firmaRecibe?.fecha && estado.firmaRecibe}
            nombre={nomRecibe} setNombre={setNomRecibe} onFirma={setImgRecibe} />
        </div>

        <p style={{ fontSize: '.78rem', color: completa ? 'var(--verde)' : '#b45309', marginTop: '.8rem' }}>
          {completa
            ? 'Salida firmada. Ya puede pasar por caseta.'
            : 'Mientras falte una firma, la salida queda "Pendiente de firma" y la caseta no la deja pasar.'}
        </p>

        <div style={{ display: 'flex', gap: '.75rem', marginTop: '.6rem', flexWrap: 'wrap' }}>
          {!completa && (
            <button className="btn-secondary" style={{ flex: 1, minWidth: 140 }} onClick={onClose}>Firmar después</button>
          )}
          <button className="btn-secondary" style={{ flex: 1, minWidth: 160 }} onClick={() => onVerPDF?.(pase)}>
            <FileText size={15} /> Ver / imprimir pase
          </button>
          {!completa ? (
            <button className="btn-primary" style={{ flex: 2, minWidth: 180, justifyContent: 'center', minHeight: 44 }} onClick={guardar} disabled={guardando}>
              {guardando ? <span className="spinner" /> : <PenLine size={16} />} Guardar firmas
            </button>
          ) : (
            <button className="btn-primary" style={{ flex: 2, minWidth: 180, justifyContent: 'center', minHeight: 44 }} onClick={onClose}>Listo</button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
