// src/pages/PasesSalida.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, FileDown, FileText, Layers, Plus, Save, Search, Tablet, Trash2, X } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../context/AuthContext'
import CatalogosPases from '../components/CatalogosPases'
import ComboboxBuscable from '../components/ComboboxBuscable'
import { exportarExcel } from '../utils/exportExcel'
import { fechaCorta, hoyLocal, haceDiasLocal } from '../utils/fecha'

const ITEM_VACIO = { articulo: '', cantidad: '', unidadMedida: '' }
const FORM_VACIO = {
  bodega: '', fecha: hoyLocal(), destino: '', autorizadoPara: '', transporte: '', placa: '',
  tipoMovimiento: '', entregadoPor: '', llevaConforme: '', autorizadoPor: '',
}

const COLOR_ESTADO = { 'Autorizado': 'badge-yellow', 'Despachado': 'badge-green' }

export default function PasesSalida() {
  const api        = useApi()
  const { toast }  = useToast()
  const { usuario } = useAuth()
  const navigate   = useNavigate()

  const [tab, setTab] = useState('registrar') // 'registrar' | 'historial' | 'catalogos'

  // Catálogos
  const [bodegas, setBodegas]     = useState([])
  const [articulos, setArticulos] = useState([])
  const [tiposMov, setTiposMov]   = useState([])
  const [cargandoCat, setCC]      = useState(true)

  // Formulario de registro
  const [form, setForm]           = useState(FORM_VACIO)
  const [items, setItems]         = useState([{ ...ITEM_VACIO }])
  const [guardando, setGuardando] = useState(false)

  // Historial
  const [desde, setDesde]           = useState(haceDiasLocal(7))
  const [hasta, setHasta]           = useState(hoyLocal())
  const [bodegaFiltro, setBodegaFiltro] = useState('')
  const [pases, setPases]           = useState([])
  const [cargandoHist, setCH]       = useState(false)
  const [buscado, setBuscado]       = useState(false)

  useEffect(() => { cargarCatalogos() }, [])
  useEffect(() => { if (tab === 'historial' && !buscado) buscarHistorial() }, [tab])

  async function cargarCatalogos() {
    setCC(true)
    try {
      const [resB, resA, resT] = await Promise.all([
        api.get('/pases-salida/bodegas'),
        api.get('/pases-salida/articulos'),
        api.get('/pases-salida/tipos-movimiento'),
      ])
      if (resB?.ok) setBodegas(resB.data)
      if (resA?.ok) setArticulos(resA.data)
      if (resT?.ok) setTiposMov(resT.data)
    } finally {
      setCC(false)
    }
  }

  function set(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  const opcionesArticulos = articulos.map(a => ({
    value: a._id,
    label: a.codigo ? `[${a.codigo}] ${a.nombre}` : a.nombre,
    sublabel: a.unidadMedida,
  }))

  function setItem(i, campo, valor) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [campo]: valor } : it))
  }

  function elegirArticulo(i, articuloId) {
    const art = articulos.find(a => a._id === articuloId)
    setItems(prev => prev.map((it, idx) => idx === i
      ? { ...it, articulo: articuloId, unidadMedida: it.unidadMedida || art?.unidadMedida || '' }
      : it))
  }

  function agregarItem() {
    setItems(prev => [...prev, { ...ITEM_VACIO }])
  }

  function quitarItem(i) {
    setItems(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev)
  }

  async function abrirPDF(pase) {
    try {
      const blob = await api.requestBlob(`/pases-salida/pases/${pase._id}/pdf`)
      window.open(URL.createObjectURL(blob), '_blank')
    } catch {
      toast('No se pudo abrir el PDF', 'error')
    }
  }

  async function guardar() {
    if (!form.bodega)          return toast('Selecciona la bodega', 'error')
    if (!form.autorizadoPara)  return toast('Indica a quién se autoriza el traslado', 'error')
    if (!form.tipoMovimiento)  return toast('Selecciona el tipo de movimiento', 'error')
    const itemsValidos = items.filter(i => i.articulo && i.cantidad !== '')
    if (!itemsValidos.length)  return toast('Agrega al menos un artículo con cantidad', 'error')

    setGuardando(true)
    try {
      const res = await api.post('/pases-salida/pases', {
        ...form,
        items: itemsValidos.map(i => ({ articulo: i.articulo, cantidad: Number(i.cantidad), unidadMedida: i.unidadMedida })),
      })
      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')
      toast(`✅ ${res.mensaje}`, 'ok')
      setForm(prev => ({ ...FORM_VACIO, bodega: prev.bodega }))
      setItems([{ ...ITEM_VACIO }])
      setBuscado(false)
      abrirPDF(res.data)
    } finally {
      setGuardando(false)
    }
  }

  async function buscarHistorial() {
    setCH(true)
    setBuscado(false)
    try {
      const params = new URLSearchParams({ desde, hasta, limite: 300 })
      if (bodegaFiltro) params.set('bodega', bodegaFiltro)
      const res = await api.get(`/pases-salida/pases?${params.toString()}`)
      if (!res?.ok) return toast(res?.mensaje || 'Error', 'error')
      setPases(res.data)
      setBuscado(true)
      if (!res.data.length) toast('Sin pases en ese período', 'info')
    } finally {
      setCH(false)
    }
  }

  async function eliminarPase(p) {
    if (!window.confirm(`¿Eliminar el Pase #${p.folio}? Esta acción no se puede deshacer.`)) return
    const res = await api.del(`/pases-salida/pases/${p._id}`)
    if (!res?.ok) return toast(res?.mensaje || 'Error al eliminar', 'error')
    toast('✅ Pase eliminado', 'ok')
    buscarHistorial()
  }

  function exportarHistorial() {
    const filas = pases.map(p => ({
      Folio: p.folio,
      Fecha: fechaCorta(p.fecha),
      Bodega: p.bodega?.nombre ?? '',
      Destino: p.destino || '',
      'Autorizado Para': p.autorizadoPara,
      'Tipo de Movimiento': p.tipoMovimiento,
      Artículos: p.items?.map(i => `${i.cantidad} ${i.unidadMedida} ${i.nombre}`).join('; '),
      Estado: p.estado,
    }))
    exportarExcel(filas, `Historial_Pases_${desde}_a_${hasta}`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      <div className="fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '.25rem' }}>Pases de Salida</h1>
          <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>Traslado de insumos, equipos y herramientas entre bodegas</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/pases-salida/tablet')}>
          <Tablet size={16} /> Modo Tablet
        </button>
      </div>

      <div className="fade-up" style={{ display: 'flex', gap: '.5rem', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {[['registrar', 'Registrar Pase', ClipboardList], ['historial', 'Historial', Search], ['catalogos', 'Catálogos', Layers]].map(([key, label, Icon]) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '.4rem',
              padding: '.65rem 1rem', border: 'none', background: 'none', cursor: 'pointer',
              fontFamily: 'Inter, sans-serif', fontSize: '.85rem', fontWeight: tab === key ? 700 : 400,
              color: tab === key ? 'var(--verde)' : 'var(--muted)',
              borderBottom: tab === key ? '2px solid var(--verde)' : '2px solid transparent',
              marginBottom: '-1px', transition: 'all .15s',
            }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* ── Registrar ── */}
      {tab === 'registrar' && (
        <div className="card fade-up">
          {cargandoCat ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}><span className="spinner" /></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 700 }}>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label className="lbl">Bodega *</label>
                  <select className="inp" value={form.bodega} onChange={e => set('bodega', e.target.value)}>
                    <option value="">Selecciona...</option>
                    {bodegas.map(b => (
                      <option key={b._id} value={b._id}>{b.nombre}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label className="lbl">Fecha</label>
                  <input className="inp" type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <label className="lbl">Destino</label>
                  <input className="inp" value={form.destino} onChange={e => set('destino', e.target.value)} />
                </div>
              </div>

              <div>
                <label className="lbl">Se autoriza el traslado al señor(a) *</label>
                <input className="inp" value={form.autorizadoPara} onChange={e => set('autorizadoPara', e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label className="lbl">Transporte</label>
                  <input className="inp" value={form.transporte} onChange={e => set('transporte', e.target.value)} />
                </div>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label className="lbl">Placa</label>
                  <input className="inp" value={form.placa} onChange={e => set('placa', e.target.value)} />
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <label className="lbl">Tipo de movimiento *</label>
                  <select className="inp" value={form.tipoMovimiento} onChange={e => set('tipoMovimiento', e.target.value)}>
                    <option value="">Selecciona...</option>
                    {tiposMov.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Artículos */}
              <div>
                <label className="lbl">Artículos *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                  {items.map((it, i) => (
                    <div key={i} style={{ display: 'flex', gap: '.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div style={{ flex: 3, minWidth: 220 }}>
                        <ComboboxBuscable
                          options={opcionesArticulos}
                          value={it.articulo}
                          onChange={v => elegirArticulo(i, v)}
                          placeholder="Busca el artículo..."
                        />
                      </div>
                      <input className="inp" style={{ flex: 1, minWidth: 90 }} type="number" min="0" step="0.01"
                        placeholder="Cant." value={it.cantidad} onChange={e => setItem(i, 'cantidad', e.target.value)} />
                      <input className="inp" style={{ flex: 1, minWidth: 100 }} placeholder="U/M"
                        value={it.unidadMedida} onChange={e => setItem(i, 'unidadMedida', e.target.value)} />
                      <button className="btn-ghost" style={{ padding: '.6rem' }} onClick={() => quitarItem(i)} title="Quitar">
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <button className="btn-secondary" style={{ marginTop: '.6rem' }} onClick={agregarItem}>
                  <Plus size={15} /> Agregar artículo
                </button>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <label className="lbl">Entregado por</label>
                  <input className="inp" value={form.entregadoPor} onChange={e => set('entregadoPor', e.target.value)} />
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <label className="lbl">Lleva conforme</label>
                  <input className="inp" value={form.llevaConforme} onChange={e => set('llevaConforme', e.target.value)} />
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <label className="lbl">Autorizado por</label>
                  <input className="inp" value={form.autorizadoPor} onChange={e => set('autorizadoPor', e.target.value)} />
                </div>
              </div>

              <button className="btn-primary" style={{ justifyContent: 'center', marginTop: '.5rem' }}
                onClick={guardar} disabled={guardando}>
                {guardando ? <span className="spinner" /> : <Save size={15} />} Guardar y ver PDF
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Historial ── */}
      {tab === 'historial' && (
        <>
          <div className="card fade-up">
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label className="lbl">Desde</label>
                <input className="inp" type="date" value={desde} onChange={e => setDesde(e.target.value)} />
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label className="lbl">Hasta</label>
                <input className="inp" type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label className="lbl">Bodega</label>
                <select className="inp" value={bodegaFiltro} onChange={e => setBodegaFiltro(e.target.value)}>
                  <option value="">Todas</option>
                  {bodegas.map(b => (
                    <option key={b._id} value={b._id}>{b.nombre}</option>
                  ))}
                </select>
              </div>
              <button className="btn-primary" onClick={buscarHistorial} disabled={cargandoHist}>
                {cargandoHist ? <span className="spinner" /> : <Search size={15} />} Buscar
              </button>
            </div>
          </div>

          {buscado && (
            <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.75rem' }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '.85rem', fontWeight: 600 }}>
                  {pases.length} pases encontrados
                </span>
                <button className="btn-secondary" onClick={exportarHistorial} disabled={!pases.length}>
                  <FileDown size={15} /> Exportar Excel
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Folio</th><th>Fecha</th><th>Bodega</th><th>Autorizado Para</th>
                      <th>Tipo</th><th>Artículos</th><th>Estado</th>
                      <th style={{ position: 'sticky', right: 0, background: 'var(--card2)', boxShadow: '-4px 0 6px -4px rgba(0,0,0,.15)' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pases.map(p => (
                      <tr key={p._id}>
                        <td style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, color: 'var(--verde-dark)' }}>#{p.folio}</td>
                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.8rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                          {fechaCorta(p.fecha)}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{p.bodega?.nombre}</td>
                        <td>{p.autorizadoPara}</td>
                        <td style={{ fontSize: '.82rem' }}>{p.tipoMovimiento}</td>
                        <td style={{ fontSize: '.8rem', color: 'var(--muted)', maxWidth: 220 }}>
                          {p.items?.map(i => `${i.cantidad} ${i.nombre}`).join(', ')}
                        </td>
                        <td>
                          <span className={`badge ${COLOR_ESTADO[p.estado] || 'badge-gray'}`}>{p.estado}</span>
                        </td>
                        <td style={{ position: 'sticky', right: 0, background: 'var(--card)', boxShadow: '-4px 0 6px -4px rgba(0,0,0,.15)' }}>
                          <div style={{ display: 'flex', gap: '.25rem' }}>
                            <button className="btn-ghost" style={{ padding: '.35rem .6rem' }} onClick={() => abrirPDF(p)} title="Ver PDF">
                              <FileText size={14} />
                            </button>
                            {usuario?.rol === 'admin' && (
                              <button className="btn-ghost" style={{ padding: '.35rem .6rem', color: 'var(--danger)' }} onClick={() => eliminarPase(p)} title="Eliminar">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Catálogos ── */}
      {tab === 'catalogos' && (
        <CatalogosPases onCambioBodegas={cargarCatalogos} onCambioArticulos={cargarCatalogos} />
      )}
    </div>
  )
}
