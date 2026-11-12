// src/pages/SolicitudesBodega.jsx — Solicitudes a Bodega (lo usan los jefes de departamento, desde el teléfono)
// Nueva solicitud: departamento, quién solicita y los artículos (del catálogo o escritos a mano).
// Mis solicitudes: el estado de cada una (Pendiente / Revisada / Parcial / Despachada / Rechazada)
// y las Salidas de Bodega que se generaron. Bodega las atiende desde Salida de Bodega → Solicitudes.
import { useState, useEffect } from 'react'
import { ClipboardPen, Inbox, Pencil, Plus, Printer, Send, X, Ban } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../context/AuthContext'
import ComboboxBuscable from '../components/ComboboxBuscable'
import SolicitudResumen from '../components/SolicitudResumen'
import { abrirPDFSolicitud } from '../utils/solicitudesBodega'
import { fechaInput } from '../utils/fecha'

const ITEM_VACIO = { articulo: '', descripcion: '', manual: false, cantidadSolicitada: '', unidadMedida: '', uso: '' }
const KEY_DEP = 'solicitudes.ultimoDepartamento'
const leerDep = () => { try { return localStorage.getItem(KEY_DEP) || '' } catch { return '' } }
const guardarDep = (v) => { try { localStorage.setItem(KEY_DEP, v) } catch { /* sin almacenamiento */ } }

const formVacio = (usuario) => ({
  departamento: leerDep(), solicitante: usuario?.nombre || '', fechaRequerida: '', prioridad: 'Normal', destino: '', observaciones: '',
})

export default function SolicitudesBodega() {
  const api = useApi()
  const { toast } = useToast()
  const { usuario } = useAuth()

  const [tab, setTab] = useState('nueva') // 'nueva' | 'mias'
  const [departamentos, setDepartamentos] = useState([])
  const [articulos, setArticulos] = useState([])
  const [form, setForm] = useState(() => formVacio(usuario))
  const [items, setItems] = useState([{ ...ITEM_VACIO }])
  const [editandoId, setEditandoId] = useState(null) // editar una solicitud Pendiente
  const [guardando, setGuardando] = useState(false)
  const [mias, setMias] = useState([])
  const [cargandoMias, setCargandoMias] = useState(false)

  useEffect(() => {
    api.get('/solicitudes-bodega/departamentos').then(r => { if (r?.ok) setDepartamentos(r.data) })
    api.get('/pases-salida/articulos').then(r => { if (r?.ok) setArticulos(r.data.filter(a => a.activo !== false)) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { if (tab === 'mias') cargarMias() }, [tab])

  async function cargarMias() {
    setCargandoMias(true)
    try {
      const res = await api.get('/solicitudes-bodega/solicitudes?alcance=mias&limite=100')
      if (res?.ok) setMias(res.data)
    } finally { setCargandoMias(false) }
  }

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const setItem = (i, patch) => setItems(prev => prev.map((it, j) => (j === i ? { ...it, ...patch } : it)))
  const opcionesArticulos = articulos.map(a => ({ value: a._id, label: a.codigo ? `[${a.codigo}] ${a.nombre}` : a.nombre, sublabel: [a.unidadMedida, a.categoria].filter(Boolean).join(' · ') }))

  function elegirArticulo(i, id) {
    const art = articulos.find(a => a._id === id)
    setItem(i, { articulo: id, descripcion: art?.nombre || '', unidadMedida: items[i].unidadMedida || art?.unidadMedida || '' })
  }

  function limpiar() {
    setForm(formVacio(usuario)); setItems([{ ...ITEM_VACIO }]); setEditandoId(null)
  }

  function editar(sol) {
    setEditandoId(sol._id)
    setForm({
      departamento: sol.departamento?._id || sol.departamento, solicitante: sol.solicitante,
      fechaRequerida: sol.fechaRequerida ? fechaInput(sol.fechaRequerida) : '', prioridad: sol.prioridad,
      destino: sol.destino || '', observaciones: sol.observaciones || '',
    })
    setItems(sol.items.map(it => ({
      articulo: it.articulo || '', descripcion: it.descripcion, manual: !it.articulo,
      cantidadSolicitada: it.cantidadSolicitada, unidadMedida: it.unidadMedida || '', uso: it.uso || '',
    })))
    setTab('nueva')
  }

  async function enviar() {
    if (!form.departamento) return toast('Selecciona el departamento', 'error')
    if (!form.solicitante.trim()) return toast('Indica quién solicita', 'error')
    const validos = items.filter(i => (i.manual ? i.descripcion.trim() : i.articulo))
    if (!validos.length) return toast('Agrega al menos un artículo', 'error')
    if (validos.some(i => !(Number(i.cantidadSolicitada) > 0))) return toast('Cada artículo necesita una cantidad mayor a cero', 'error')

    setGuardando(true)
    try {
      const body = {
        ...form,
        items: validos.map(i => ({
          articulo: i.manual ? null : i.articulo, descripcion: i.descripcion,
          cantidadSolicitada: Number(i.cantidadSolicitada), unidadMedida: i.unidadMedida, uso: i.uso,
        })),
      }
      const res = editandoId
        ? await api.put(`/solicitudes-bodega/solicitudes/${editandoId}`, body)
        : await api.post('/solicitudes-bodega/solicitudes', body)
      if (!res?.ok) return toast(res?.mensaje || 'Error al enviar', 'error')
      guardarDep(form.departamento)
      toast(res.mensaje, 'ok')
      limpiar()
      setTab('mias')
    } finally { setGuardando(false) }
  }

  async function anular(sol) {
    if (!window.confirm(`¿Anular la Solicitud No. ${sol.folio}?`)) return
    const res = await api.put(`/solicitudes-bodega/solicitudes/${sol._id}/anular`, {})
    if (!res?.ok) return toast(res?.mensaje || 'Error', 'error')
    toast(res.mensaje, 'ok')
    cargarMias()
  }

  const TABS = [['nueva', editandoId ? 'Editar solicitud' : 'Nueva solicitud', ClipboardPen], ['mias', 'Mis solicitudes', Inbox]]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="fade-up">
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '.25rem' }}>Solicitudes a Bodega</h1>
        <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>Pide insumos, repuestos, herramientas o mobiliario a Bodega</p>
      </div>

      <div className="fade-up" style={{ display: 'flex', gap: '.5rem', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {TABS.map(([key, label, Icon]) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '.4rem', padding: '.65rem 1rem', border: 'none', background: 'none', cursor: 'pointer',
              fontFamily: 'Inter, sans-serif', fontSize: '.85rem', fontWeight: tab === key ? 700 : 400,
              color: tab === key ? 'var(--verde)' : 'var(--muted)',
              borderBottom: tab === key ? '2px solid var(--verde)' : '2px solid transparent', marginBottom: '-1px',
            }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'nueva' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 760 }}>
          {editandoId && (
            <div style={{ fontSize: '.82rem', background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, padding: '.6rem .85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.5rem' }}>
              <span>Editando una solicitud pendiente.</span>
              <button className="btn-ghost" style={{ padding: '.25rem .5rem' }} onClick={limpiar}><X size={15} /> Cancelar</button>
            </div>
          )}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label className="lbl">Departamento *</label>
              <select className="inp" value={form.departamento} onChange={e => set('departamento', e.target.value)}>
                <option value="">Selecciona...</option>
                {departamentos.map(d => <option key={d._id} value={d._id}>{d.nombre}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label className="lbl">Solicitado por *</label>
              <input className="inp" value={form.solicitante} onChange={e => set('solicitante', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label className="lbl">Lo necesito para</label>
              <input className="inp" type="date" value={form.fechaRequerida} onChange={e => set('fechaRequerida', e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label className="lbl">Prioridad</label>
              <div style={{ display: 'flex', gap: '.5rem' }}>
                {['Normal', 'Urgente'].map(p => (
                  <button key={p} type="button" onClick={() => set('prioridad', p)} className={form.prioridad === p ? 'btn-primary' : 'btn-secondary'}
                    style={{ flex: 1, justifyContent: 'center', ...(form.prioridad === p && p === 'Urgente' ? { background: '#dc2626', borderColor: '#dc2626' } : {}) }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="lbl">Destino / uso</label>
            <input className="inp" placeholder="Ej. Finca 7 de Mayo, lotes 4 y 5 / Taller / Oficina" value={form.destino} onChange={e => set('destino', e.target.value)} />
          </div>

          <div>
            <label className="lbl">Artículos *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              {items.map((it, i) => (
                <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '.75rem', display: 'flex', flexDirection: 'column', gap: '.55rem', background: 'var(--card2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--muted)' }}>Artículo {i + 1}</span>
                    {items.length > 1 && (
                      <button type="button" className="btn-ghost" style={{ padding: '.2rem .4rem' }} title="Quitar"
                        onClick={() => setItems(prev => prev.filter((_, j) => j !== i))}><X size={15} /></button>
                    )}
                  </div>
                  {it.manual ? (
                    <input className="inp" placeholder="Describe el artículo (marca, medida, modelo...)" value={it.descripcion}
                      onChange={e => setItem(i, { descripcion: e.target.value })} />
                  ) : (
                    <ComboboxBuscable options={opcionesArticulos} value={it.articulo} onChange={v => elegirArticulo(i, v)} placeholder="Busca en el catálogo de bodega..." />
                  )}
                  <button type="button" onClick={() => setItem(i, { manual: !it.manual, articulo: '', descripcion: '' })}
                    style={{ alignSelf: 'flex-start', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--verde)', fontSize: '.78rem', fontWeight: 600 }}>
                    {it.manual ? 'Buscar en el catálogo' : '¿No está en el catálogo? Escríbelo'}
                  </button>
                  <div style={{ display: 'flex', gap: '.5rem' }}>
                    <input className="inp" style={{ flex: 1, minWidth: 0 }} type="number" inputMode="decimal" min="0" step="0.01" placeholder="Cantidad"
                      value={it.cantidadSolicitada} onChange={e => setItem(i, { cantidadSolicitada: e.target.value })} />
                    <input className="inp" style={{ flex: 1, minWidth: 0 }} placeholder="U/M (kg, L, unidad...)"
                      value={it.unidadMedida} onChange={e => setItem(i, { unidadMedida: e.target.value })} />
                  </div>
                  <input className="inp" placeholder="Uso (opcional): lote, máquina, dosis..." value={it.uso} onChange={e => setItem(i, { uso: e.target.value })} />
                </div>
              ))}
            </div>
            <button type="button" className="btn-secondary" style={{ marginTop: '.6rem' }} onClick={() => setItems(prev => [...prev, { ...ITEM_VACIO }])}>
              <Plus size={15} /> Agregar artículo
            </button>
          </div>

          <div>
            <label className="lbl">Observaciones</label>
            <textarea className="inp" rows={2} value={form.observaciones} onChange={e => set('observaciones', e.target.value)} />
          </div>

          <button className="btn-primary" style={{ justifyContent: 'center', minHeight: 46 }} onClick={enviar} disabled={guardando}>
            {guardando ? <span className="spinner" /> : <Send size={16} />} {editandoId ? 'Guardar cambios' : 'Enviar a Bodega'}
          </button>
        </div>
      )}

      {tab === 'mias' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {cargandoMias && <div className="card" style={{ textAlign: 'center' }}><span className="spinner" /></div>}
          {!cargandoMias && !mias.length && <div className="card" style={{ textAlign: 'center', color: 'var(--muted)' }}>Todavía no has hecho solicitudes.</div>}
          {mias.map(sol => (
            <SolicitudResumen key={sol._id} sol={sol} acciones={<>
              <button className="btn-secondary" onClick={() => abrirPDFSolicitud(api, toast, sol)}><Printer size={15} /> Imprimir</button>
              {sol.estado === 'Pendiente' && <>
                <button className="btn-secondary" onClick={() => editar(sol)}><Pencil size={15} /> Editar</button>
                <button className="btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => anular(sol)}><Ban size={15} /> Anular</button>
              </>}
            </>} />
          ))}
        </div>
      )}
    </div>
  )
}
