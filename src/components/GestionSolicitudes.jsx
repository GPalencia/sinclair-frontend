// src/components/GestionSolicitudes.jsx — Salida de Bodega → pestaña Solicitudes
// Bodega ve lo que pidieron los departamentos, lo revisa (cantidad a entregar,
// "no hay", ligar con el catálogo), lo imprime y genera la Salida de Bodega.
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Ban, ClipboardCheck, PackageCheck, Plus, Printer, Save, Search, X } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import ComboboxBuscable from './ComboboxBuscable'
import SolicitudResumen from './SolicitudResumen'
import { abrirPDFSolicitud, pendienteDe, fmtCant } from '../utils/solicitudesBodega'
import { haceDiasLocal, hoyLocal } from '../utils/fecha'

const FILTROS_ESTADO = [
  ['abiertas', 'Por atender'], ['Pendiente', 'Pendientes'], ['Revisada', 'Revisadas'], ['Parcial', 'Parciales'],
  ['Despachada', 'Despachadas'], ['Rechazada', 'Rechazadas'], ['', 'Todas'],
]

function ModalRevisar({ sol, articulos, guardando, onGuardar, onClose }) {
  const [lineas, setLineas] = useState(() => sol.items.map(it => ({
    _id: it._id, articulo: it.articulo || '', descripcion: it.descripcion, unidadMedida: it.unidadMedida || '',
    cantidadSolicitada: it.cantidadSolicitada, cantidadDespachada: it.cantidadDespachada || 0, uso: it.uso || '',
    cantidadAprobada: it.cantidadAprobada ?? it.cantidadSolicitada, notaBodega: it.notaBodega || '',
  })))
  const opciones = articulos.map(a => ({ value: a._id, label: a.codigo ? `[${a.codigo}] ${a.nombre}` : a.nombre, sublabel: a.unidadMedida }))
  const setL = (i, patch) => setLineas(prev => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)))

  return createPortal(
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.5rem', width: '100%', maxWidth: 820, maxHeight: 'calc(100dvh - 2rem)', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
          <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '1.05rem', fontWeight: 700 }}>Revisar Solicitud No. {sol.folio}</h3>
          <button className="btn-ghost" onClick={onClose} style={{ padding: '.3rem .6rem' }}><X size={18} /></button>
        </div>
        <p style={{ fontSize: '.82rem', color: 'var(--muted)', marginBottom: '1rem' }}>
          {sol.departamentoNombre} · {sol.solicitante}. Ajusta lo que se va a entregar: pon 0 en lo que no hay y deja una nota.
          Lo que pidió el departamento queda guardado.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {lineas.map((l, i) => (
            <div key={l._id || i} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '.75rem', background: 'var(--card2)', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '.85rem' }}>
                  <b>{l.descripcion || 'Línea nueva'}</b>
                  {l._id && <span style={{ color: 'var(--muted)' }}> · pidieron {fmtCant(l.cantidadSolicitada)} {l.unidadMedida}</span>}
                  {l.uso && <div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>Uso: {l.uso}</div>}
                  {l.cantidadDespachada > 0 && <div style={{ fontSize: '.75rem', color: 'var(--verde)' }}>Ya salió: {fmtCant(l.cantidadDespachada)}</div>}
                </div>
                {!(l.cantidadDespachada > 0) && (
                  <button type="button" className="btn-ghost" style={{ padding: '.2rem .4rem' }} title="Quitar línea"
                    onClick={() => setLineas(prev => prev.filter((_, j) => j !== i))}><X size={15} /></button>
                )}
              </div>
              <div>
                <label className="lbl" style={{ fontSize: '.68rem' }}>Artículo del catálogo {!l.articulo && <span style={{ color: '#b45309' }}>(sin ligar)</span>}</label>
                <ComboboxBuscable options={opciones} value={l.articulo}
                  onChange={v => { const a = articulos.find(x => x._id === v); setL(i, { articulo: v, descripcion: a?.nombre || l.descripcion, unidadMedida: l.unidadMedida || a?.unidadMedida || '' }) }}
                  placeholder="Ligar con un artículo del catálogo..." />
              </div>
              <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 110 }}>
                  <label className="lbl" style={{ fontSize: '.68rem' }}>A entregar</label>
                  <input className="inp" type="number" min="0" step="0.01" value={l.cantidadAprobada}
                    onChange={e => setL(i, { cantidadAprobada: e.target.value })} />
                </div>
                <div style={{ flex: 1, minWidth: 90 }}>
                  <label className="lbl" style={{ fontSize: '.68rem' }}>U/M</label>
                  <input className="inp" value={l.unidadMedida} onChange={e => setL(i, { unidadMedida: e.target.value })} />
                </div>
                <div style={{ flex: 3, minWidth: 180 }}>
                  <label className="lbl" style={{ fontSize: '.68rem' }}>Nota de bodega</label>
                  <input className="inp" placeholder="Ej. No hay, solo hay 6, se sustituye por..." value={l.notaBodega} onChange={e => setL(i, { notaBodega: e.target.value })} />
                </div>
              </div>
            </div>
          ))}
          <button type="button" className="btn-secondary" style={{ alignSelf: 'flex-start' }}
            onClick={() => setLineas(prev => [...prev, { articulo: '', descripcion: '', unidadMedida: '', cantidadSolicitada: 0, cantidadDespachada: 0, uso: '', cantidadAprobada: '', notaBodega: 'Agregado por bodega' }])}>
            <Plus size={15} /> Agregar línea (sustituto)
          </button>
          <div style={{ display: 'flex', gap: '.75rem', marginTop: '.25rem' }}>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
            <button className="btn-primary" style={{ flex: 2, justifyContent: 'center' }} disabled={guardando}
              onClick={() => onGuardar(lineas.map(l => ({ ...l, cantidadAprobada: l.cantidadAprobada === '' ? 0 : Number(l.cantidadAprobada), cantidadSolicitada: l._id ? undefined : Number(l.cantidadAprobada) || 0 })))}>
              {guardando ? <span className="spinner" /> : <Save size={15} />} Guardar revisión
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function GestionSolicitudes({ onGenerarSalida, onCambio }) {
  const api = useApi()
  const { toast } = useToast()
  const [estado, setEstado] = useState('abiertas')
  const [desde, setDesde] = useState(haceDiasLocal(60))
  const [hasta, setHasta] = useState(hoyLocal())
  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(false)
  const [articulos, setArticulos] = useState([])
  const [revisando, setRevisando] = useState(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    api.get('/pases-salida/articulos').then(r => { if (r?.ok) setArticulos(r.data.filter(a => a.activo !== false)) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { buscar() }, [estado])

  async function buscar() {
    setCargando(true)
    try {
      const p = new URLSearchParams({ alcance: 'todas', desde, hasta })
      if (estado) p.set('estado', estado)
      const res = await api.get(`/solicitudes-bodega/solicitudes?${p}`)
      if (!res?.ok) return toast(res?.mensaje || 'Error', 'error')
      setLista(res.data)
    } finally { setCargando(false) }
  }

  async function guardarRevision(lineas) {
    setGuardando(true)
    try {
      const res = await api.put(`/solicitudes-bodega/solicitudes/${revisando._id}`, { items: lineas })
      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')
      toast(res.mensaje, 'ok')
      setRevisando(null)
      buscar(); onCambio?.()
    } finally { setGuardando(false) }
  }

  async function rechazar(sol) {
    const motivo = window.prompt(`Motivo del rechazo de la Solicitud No. ${sol.folio}:`)
    if (motivo === null) return
    const res = await api.put(`/solicitudes-bodega/solicitudes/${sol._id}/rechazar`, { motivo })
    if (!res?.ok) return toast(res?.mensaje || 'Error', 'error')
    toast(res.mensaje, 'ok')
    buscar(); onCambio?.()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="card">
        <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginBottom: '.85rem' }}>
          {FILTROS_ESTADO.map(([v, label]) => (
            <button key={label} type="button" onClick={() => setEstado(v)} className={estado === v ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize: '.78rem', padding: '.4rem .8rem' }}>{label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 140 }}><label className="lbl">Desde</label><input className="inp" type="date" value={desde} onChange={e => setDesde(e.target.value)} /></div>
          <div style={{ flex: 1, minWidth: 140 }}><label className="lbl">Hasta</label><input className="inp" type="date" value={hasta} onChange={e => setHasta(e.target.value)} /></div>
          <button className="btn-primary" onClick={buscar} disabled={cargando}>{cargando ? <span className="spinner" /> : <Search size={15} />} Buscar</button>
        </div>
      </div>

      {!cargando && !lista.length && <div className="card" style={{ textAlign: 'center', color: 'var(--muted)' }}>No hay solicitudes con ese filtro.</div>}
      {lista.map(sol => {
        const abierta = ['Pendiente', 'Revisada', 'Parcial'].includes(sol.estado)
        const hayPendiente = sol.items.some(it => pendienteDe(it) > 0)
        return (
          <SolicitudResumen key={sol._id} sol={sol} acciones={<>
            {abierta && <button className="btn-secondary" onClick={() => setRevisando(sol)}><ClipboardCheck size={15} /> Revisar / editar</button>}
            <button className="btn-secondary" onClick={() => abrirPDFSolicitud(api, toast, sol)}><Printer size={15} /> Imprimir</button>
            {abierta && hayPendiente && <button className="btn-primary" onClick={() => onGenerarSalida(sol)}><PackageCheck size={15} /> Generar salida</button>}
            {abierta && !sol.pases?.length && <button className="btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => rechazar(sol)}><Ban size={15} /> Rechazar</button>}
          </>} />
        )
      })}

      {revisando && (
        <ModalRevisar sol={revisando} articulos={articulos} guardando={guardando} onGuardar={guardarRevision} onClose={() => setRevisando(null)} />
      )}
    </div>
  )
}
