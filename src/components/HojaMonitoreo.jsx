// src/components/HojaMonitoreo.jsx
// Hoja RC-026 "Monitoreo de Plagas y Enfermedades" en pantalla: las 10 muestras
// de cada plaga (conteos) y de cada enfermedad (check), con total y promedio en
// vivo, igual que el papel. Al guardar se calcula el nivel de frecuencia de cada
// plaga (el resumen que ya usaba el Análisis de Plagas) y se conserva el detalle
// de las muestras. Cada hoja se puede abrir como PDF con el formato del papel.
import { useState, useEffect, useMemo } from 'react'
import { Check, ChevronDown, ChevronUp, FileText, Save, Search, Trash2 } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../context/AuthContext'
import ComboboxBuscable from './ComboboxBuscable'
import { fechaCorta, hoyLocal, haceDiasLocal } from '../utils/fecha'

const N = 10                        // muestras por hoja
const LLAVE_PLAGUERO   = 'sinclair_hoja_plaguero'
const LLAVE_SUPERVISOR = 'sinclair_hoja_supervisor'

const vacia = (esEnf) => Array(N).fill(esEnf ? false : '')
const redondea = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d
const fmtNum = (n) => String(redondea(n, 2))

function leer(llave) { try { return localStorage.getItem(llave) || '' } catch { return '' } }
function guardarLocal(llave, v) { try { localStorage.setItem(llave, v) } catch { /* sin almacenamiento */ } }

export default function HojaMonitoreo({ lotesSembrados, plagas, onGuardada }) {
  const api        = useApi()
  const { toast }  = useToast()
  const { usuario } = useAuth()

  const [vista, setVista] = useState('nueva') // 'nueva' | 'guardadas'

  // ── Hoja nueva ──
  const [lote, setLote]               = useState('')
  const [fecha, setFecha]             = useState(hoyLocal())
  const [plaguero, setPlaguero]       = useState(() => leer(LLAVE_PLAGUERO))
  const [supervisor, setSupervisor]   = useState(() => leer(LLAVE_SUPERVISOR))
  const [plantas, setPlantas]         = useState('5')
  const [observaciones, setObs]       = useState('')
  const [lecturas, setLecturas]       = useState({})      // { [plagaId]: array de 10 }
  const [abiertas, setAbiertas]       = useState({})      // celular: filas desplegadas
  const [guardando, setGuardando]     = useState(false)
  const [ultima, setUltima]           = useState(null)    // { id, lote } de la última hoja guardada

  // ── Hojas guardadas ──
  const [desde, setDesde]     = useState(haceDiasLocal(30))
  const [hasta, setHasta]     = useState(hoyLocal())
  const [filtroLote, setFiltroLote] = useState('')
  const [hojas, setHojas]     = useState([])
  const [cargando, setCargando] = useState(false)
  const [buscado, setBuscado] = useState(false)

  useEffect(() => { if (vista === 'guardadas' && !buscado) buscar() }, [vista])

  const activas      = useMemo(() => plagas.filter(p => p.activo !== false), [plagas])
  const listaPlagas  = useMemo(() => activas.filter(p => p.tipoPlaga !== 'enfermedad'), [activas])
  const listaEnf     = useMemo(() => activas.filter(p => p.tipoPlaga === 'enfermedad'), [activas])
  const opcionesLotes = useMemo(() => lotesSembrados.map(l => ({ value: l._id, label: l.loteSembrado, sublabel: l.cultivo })), [lotesSembrados])

  const plantasNum = Number(plantas) > 0 ? Number(plantas) : 5

  // ── Cálculos de una fila ──
  function resumenDe(p) {
    const v = lecturas[p._id]
    if (!v) return { total: 0 }
    if (p.tipoPlaga === 'enfermedad') {
      const total = v.filter(Boolean).length
      return { total, incidencia: total * 10 }
    }
    const total = v.reduce((s, x) => s + (Number(x) || 0), 0)
    return { total, promedio: total / (N * plantasNum) }
  }

  const conDatos = useMemo(() => {
    let pl = 0, en = 0
    for (const p of listaPlagas) if (resumenDe(p).total > 0) pl++
    for (const p of listaEnf)    if (resumenDe(p).total > 0) en++
    return { pl, en }
  }, [lecturas, listaPlagas, listaEnf, plantasNum])

  function setCelda(id, i, valor, esEnf) {
    setLecturas(prev => {
      const fila = [...(prev[id] || vacia(esEnf))]
      fila[i] = valor
      return { ...prev, [id]: fila }
    })
  }

  function alternarFila(id) { setAbiertas(prev => ({ ...prev, [id]: !prev[id] })) }

  function cambiarPlaguero(v) { setPlaguero(v); guardarLocal(LLAVE_PLAGUERO, v) }
  function cambiarSupervisor(v) { setSupervisor(v); guardarLocal(LLAVE_SUPERVISOR, v) }

  async function abrirPDF(id) {
    // La pestaña se abre ANTES de pedir el PDF para que el bloqueador de ventanas no la descarte
    const ventana = window.open('', '_blank')
    try {
      const blob = await api.requestBlob(`/fitoproteccion/hojas/${id}/pdf`)
      const url = URL.createObjectURL(blob)
      if (ventana) ventana.location.href = url
      else window.location.href = url
    } catch {
      ventana?.close()
      toast('No se pudo abrir el PDF', 'error')
    }
  }

  async function guardar(reemplazar = false) {
    if (!lote)  return toast('Selecciona el lote sembrado', 'error')
    if (!fecha) return toast('Indica la fecha', 'error')

    const payload = {
      loteSembrado: lote, fecha, monitor: plaguero, supervisor, observaciones,
      plantasPorMuestra: plantasNum, reemplazar,
      lecturas: activas
        .filter(p => resumenDe(p).total > 0)
        .map(p => ({ plaga: p._id, muestras: lecturas[p._id] })),
    }

    setGuardando(true)
    try {
      const res = await api.post('/fitoproteccion/hojas', payload)
      if (res?.existe) {
        if (window.confirm(res.mensaje)) return guardar(true)
        return
      }
      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')
      toast(res.mensaje, 'ok')
      setUltima({ id: res.data._id, lote: lotesSembrados.find(l => l._id === lote)?.loteSembrado || '' })
      setLote(''); setLecturas({}); setAbiertas({}); setObs('')
      setBuscado(false)
      onGuardada?.()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setGuardando(false)
    }
  }

  async function buscar() {
    setCargando(true)
    setBuscado(false)
    try {
      const params = new URLSearchParams({ desde, hasta, limite: 150 })
      if (filtroLote) params.set('lote', filtroLote)
      const res = await api.get(`/fitoproteccion/hojas?${params.toString()}`)
      if (!res?.ok) return toast(res?.mensaje || 'Error', 'error')
      setHojas(res.data)
      setBuscado(true)
      if (!res.data.length) toast('Sin hojas en ese período', 'info')
    } finally {
      setCargando(false)
    }
  }

  async function eliminar(h) {
    if (!window.confirm(`¿Eliminar la hoja de ${h.loteSembrado?.loteSembrado} del ${fechaCorta(h.fecha)}? Se borran también sus lecturas del historial y del análisis.`)) return
    const res = await api.del(`/fitoproteccion/hojas/${h._id}`)
    if (!res?.ok) return toast(res?.mensaje || 'Error al eliminar', 'error')
    toast('✅ Hoja eliminada', 'ok')
    buscar()
  }

  // ── Filas ──
  function filaPlaga(p) {
    const v = lecturas[p._id] || vacia(false)
    const r = resumenDe(p)
    const abierta = !!abiertas[p._id]
    return (
      <div key={p._id} className="hm-fila" data-open={abierta} data-datos={r.total > 0}>
        <button type="button" className="hm-nombre" onClick={() => alternarFila(p._id)}>
          <span>{p.nombre}</span>
          <span className="hm-movil">
            {r.total > 0 && <b className="hm-pildora">Total {r.total} · Prom {fmtNum(r.promedio)}</b>}
            {abierta ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </span>
        </button>
        <div className="hm-celdas hm-cols-plaga">
          {v.map((x, i) => (
            <input key={i} className="inp hm-celda" inputMode="numeric" aria-label={`${p.nombre} muestra ${i + 1}`}
              placeholder={String(i + 1)} value={x}
              onChange={e => setCelda(p._id, i, e.target.value.replace(/\D/g, '').slice(0, 3), false)} />
          ))}
        </div>
        <div className="hm-res">{r.total > 0 ? r.total : ''}</div>
        <div className="hm-res">{r.total > 0 ? fmtNum(r.promedio) : ''}</div>
      </div>
    )
  }

  function filaEnfermedad(p) {
    const v = lecturas[p._id] || vacia(true)
    const r = resumenDe(p)
    const abierta = !!abiertas[p._id]
    return (
      <div key={p._id} className="hm-fila" data-open={abierta} data-datos={r.total > 0}>
        <button type="button" className="hm-nombre" onClick={() => alternarFila(p._id)}>
          <span>{p.nombre}</span>
          <span className="hm-movil">
            {r.total > 0 && <b className="hm-pildora hm-pildora-enf">{r.total}/{N} muestras</b>}
            {abierta ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </span>
        </button>
        <div className="hm-celdas hm-cols-enf">
          {v.map((x, i) => (
            <button key={i} type="button" className="hm-check" data-on={x} aria-pressed={x}
              aria-label={`${p.nombre} muestra ${i + 1}`}
              onClick={() => setCelda(p._id, i, !x, true)}>
              {x ? <Check size={18} strokeWidth={3} /> : <span className="hm-num">{i + 1}</span>}
            </button>
          ))}
        </div>
        <div className="hm-res">{r.total > 0 ? `${r.total}/${N}` : ''}</div>
        <div className="hm-res">{r.total > 0 ? `${r.incidencia}%` : ''}</div>
      </div>
    )
  }

  const cabeceraCols = (titulo, tot, prom) => (
    <div className="hm-cab">
      <div className="hm-cab-titulo">{titulo}</div>
      {Array.from({ length: N }, (_, i) => <div key={i} className="hm-cab-n">{i + 1}</div>)}
      <div className="hm-cab-n">{tot}</div>
      <div className="hm-cab-n">{prom}</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <style>{ESTILOS}</style>

      {/* Selector Nueva / Guardadas */}
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
        {[['nueva', 'Nueva hoja'], ['guardadas', 'Hojas guardadas']].map(([k, label]) => (
          <button key={k} type="button" onClick={() => setVista(k)}
            className={vista === k ? 'btn-primary' : 'btn-secondary'}>{label}</button>
        ))}
      </div>

      {/* ───────── NUEVA HOJA ───────── */}
      {vista === 'nueva' && (
        <>
          {ultima && (
            <div className="card" style={{ borderColor: '#86efac', background: '#f0fdf4', display: 'flex', gap: '.75rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, color: '#15803d' }}>✅ Hoja de {ultima.lote} guardada</span>
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <button className="btn-secondary" onClick={() => abrirPDF(ultima.id)}><FileText size={15} /> Ver PDF</button>
                <button className="btn-ghost" onClick={() => setUltima(null)}>Cerrar</button>
              </div>
            </div>
          )}

          <div className="card fade-up">
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 2, minWidth: 220 }}>
                <label className="lbl">Lote sembrado *</label>
                <ComboboxBuscable options={opcionesLotes} value={lote} onChange={setLote} placeholder="Busca por finca o lote..." />
              </div>
              <div style={{ flex: 1, minWidth: 150 }}>
                <label className="lbl">Fecha</label>
                <input className="inp" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label className="lbl">Nombre del plaguero</label>
                <input className="inp" value={plaguero} onChange={e => cambiarPlaguero(e.target.value)} placeholder={usuario?.nombre || ''} />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label className="lbl">Supervisor BPA</label>
                <input className="inp" value={supervisor} onChange={e => cambiarSupervisor(e.target.value)} />
              </div>
              <div style={{ flex: '0 0 150px', minWidth: 130 }}>
                <label className="lbl">Plantas por muestra</label>
                <input className="inp" inputMode="numeric" value={plantas}
                  onChange={e => setPlantas(e.target.value.replace(/\D/g, '').slice(0, 2))} />
              </div>
            </div>
          </div>

          <div className="card fade-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '.5rem', marginBottom: '.75rem' }}>
              <div style={{ fontSize: '.78rem', color: 'var(--muted)' }}>
                Escribe solo lo que encontraste: lo que dejes en blanco no se guarda.
                Promedio = total ÷ ({N} muestras × {plantasNum} plantas).
              </div>
              <div style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--verde-dark)' }}>
                Con datos: {conDatos.pl} plaga{conDatos.pl === 1 ? '' : 's'} · {conDatos.en} enfermedad{conDatos.en === 1 ? '' : 'es'}
              </div>
            </div>

            {!activas.length ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--muted)' }}>
                El catálogo de plagas y enfermedades está vacío. Cárgalo con <b>seedPlagasMonitoreo.js</b> o desde Catálogos.
              </div>
            ) : (
              <>
                {cabeceraCols('PLAGAS', 'TOTAL', 'PROM.')}
                {listaPlagas.map(filaPlaga)}

                <div style={{ height: '1rem' }} />
                {cabeceraCols('ENFERMEDADES', 'MUESTRAS', 'INCID.')}
                {listaEnf.map(filaEnfermedad)}
              </>
            )}

            <div style={{ marginTop: '1.25rem' }}>
              <label className="lbl">Observaciones</label>
              <textarea className="inp" rows={3} value={observaciones} onChange={e => setObs(e.target.value)}
                placeholder="Ej. exceso de malezas, agua estancada, lorito verde: 0.08..." style={{ resize: 'vertical' }} />
            </div>

            <button className="btn-primary" style={{ justifyContent: 'center', width: '100%', marginTop: '1rem', minHeight: 48 }}
              onClick={() => guardar(false)} disabled={guardando}>
              {guardando ? <span className="spinner" /> : <Save size={16} />} Guardar hoja
            </button>
          </div>
        </>
      )}

      {/* ───────── HOJAS GUARDADAS ───────── */}
      {vista === 'guardadas' && (
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
              <div style={{ flex: 2, minWidth: 200 }}>
                <label className="lbl">Lote</label>
                <select className="inp" value={filtroLote} onChange={e => setFiltroLote(e.target.value)}>
                  <option value="">Todos</option>
                  {lotesSembrados.map(l => <option key={l._id} value={l._id}>{l.loteSembrado}</option>)}
                </select>
              </div>
              <button className="btn-primary" onClick={buscar} disabled={cargando}>
                {cargando ? <span className="spinner" /> : <Search size={15} />} Buscar
              </button>
            </div>
          </div>

          {buscado && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
              <div style={{ fontSize: '.85rem', fontWeight: 600 }}>{hojas.length} hoja{hojas.length === 1 ? '' : 's'}</div>
              {hojas.map(h => (
                <div key={h._id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700 }}>{h.loteSembrado?.loteSembrado || '—'}
                        <span style={{ fontWeight: 500, color: 'var(--muted)', fontSize: '.85rem' }}> · {h.loteSembrado?.cultivo}</span>
                      </div>
                      <div style={{ fontSize: '.8rem', color: 'var(--muted)', fontFamily: 'DM Mono, monospace' }}>
                        {fechaCorta(h.fecha)}{h.monitor ? ` · ${h.monitor}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '.4rem' }}>
                      <button className="btn-secondary" onClick={() => abrirPDF(h._id)}><FileText size={15} /> PDF</button>
                      {usuario?.rol === 'admin' && (
                        <button className="btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => eliminar(h)} title="Eliminar hoja"><Trash2 size={15} /></button>
                      )}
                    </div>
                  </div>
                  {h.lecturas?.length ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem' }}>
                      {h.lecturas.map(l => (
                        <span key={l.plagaId} className={`badge ${l.tipo === 'enfermedad' ? 'badge-gray' : 'badge-yellow'}`}>
                          {l.plaga}: {l.tipo === 'enfermedad' ? `${l.total}/${N}` : fmtNum(l.promedio)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '.82rem', color: 'var(--muted)' }}>Sin plagas ni enfermedades detectadas</div>
                  )}
                  {h.observaciones && <div style={{ fontSize: '.82rem', color: 'var(--text2)' }}>{h.observaciones}</div>}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

const ESTILOS = `
/* Escritorio / tablet: tabla igual al papel — nombre | 10 muestras | total | promedio */
.hm-cab, .hm-fila { display: grid; grid-template-columns: minmax(130px, 1.5fr) repeat(10, minmax(0, 1fr)) 58px 66px; gap: 4px; align-items: center; }
.hm-cab { background: #f1f5f9; border-radius: 8px; padding: .4rem .3rem; font-size: .7rem; font-weight: 800; color: #475569; letter-spacing: .04em; margin-bottom: .2rem; }
.hm-cab-titulo { padding-left: .4rem; }
.hm-cab-n { text-align: center; }
.hm-fila { padding: 3px .3rem; border-bottom: 1px solid var(--border); }
.hm-fila[data-datos="true"] { background: #f0fdf4; }
.hm-nombre { background: none; border: none; text-align: left; font-family: Inter, sans-serif; font-size: .83rem; font-weight: 600; color: var(--text); padding: .35rem .2rem; cursor: default; display: flex; justify-content: space-between; gap: .5rem; }
.hm-movil { display: none; }
.hm-celdas { display: contents; }
.hm-celda { text-align: center; padding: .35rem 0 !important; min-height: 34px; }
.hm-check { height: 34px; border: 1.5px solid var(--border); border-radius: 8px; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #fff; padding: 0; }
.hm-check[data-on="true"] { background: var(--verde); border-color: var(--verde); }
.hm-num { color: #94a3b8; font-size: .72rem; font-family: 'DM Mono', monospace; }
.hm-res { text-align: center; font-family: 'DM Mono', monospace; font-weight: 800; font-size: .85rem; color: var(--verde-dark); }

/* Celular: cada plaga es una tarjeta que se despliega (5 muestras por fila) */
@media (max-width: 899px) {
  .hm-cab { display: none; }
  .hm-fila { display: block; border: 1px solid var(--border); border-radius: 10px; padding: 0; margin-bottom: .45rem; overflow: hidden; }
  .hm-nombre { width: 100%; min-height: 50px; align-items: center; padding: .5rem .8rem; font-size: .92rem; cursor: pointer; }
  .hm-movil { display: flex; align-items: center; gap: .5rem; color: var(--muted); }
  .hm-pildora { background: #dcfce7; color: #15803d; border-radius: 999px; padding: .15rem .6rem; font-size: .72rem; white-space: nowrap; }
  .hm-pildora-enf { background: #ede9fe; color: #6d28d9; }
  .hm-fila .hm-res { display: none; }
  .hm-celdas { display: none; }
  .hm-fila[data-open="true"] .hm-celdas { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; padding: .2rem .8rem .8rem; }
  .hm-celda { min-height: 46px; font-size: 18px !important; font-weight: 700; }
  .hm-check { height: 46px; }
}
`
