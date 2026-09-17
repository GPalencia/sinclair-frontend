// src/pages/EstacionSinclair.jsx
import { useState, useEffect } from 'react'
import { ClipboardList, FileDown, Fuel, Layers, Save, Search } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import CatalogosEstacion from '../components/CatalogosEstacion'
import EntradasDiesel from '../components/EntradasDiesel'
import ComboboxBuscable from '../components/ComboboxBuscable'
import { exportarExcel } from '../utils/exportExcel'

function hoy() { return new Date().toISOString().split('T')[0] }

const FORM_VACIO = {
  maquinaria: '', fecha: hoy(), numeroRequisicion: '', lecturaActual: '',
  cantidadDieselGalones: '', encargadoBomba: '', ruta: '',
}

const SIN_MEDIDOR = ['Ninguno', 'Ninguno (temporal)']

const COLOR_ALERTA = {
  'Bajo rendimiento':     'badge-red',
  'Normal':                'badge-green',
  'N/A - sin medidor aun': 'badge-gray',
}

export default function EstacionSinclair() {
  const api        = useApi()
  const { toast }  = useToast()

  const [tab, setTab] = useState('registrar') // 'registrar' | 'historial' | 'entradas' | 'maquinaria'

  const [maquinas, setMaquinas]       = useState([])
  const [cargandoMaq, setCM]          = useState(true)
  const [rutas, setRutas]             = useState([])
  const [inventario, setInventario]   = useState(null)

  const [form, setForm]               = useState(FORM_VACIO)
  const [guardando, setGuardando]     = useState(false)

  const [desde, setDesde]             = useState(hoy())
  const [hasta, setHasta]             = useState(hoy())
  const [maquinaFiltro, setMaquinaFiltro] = useState('')
  const [despachos, setDespachos]     = useState([])
  const [cargandoHist, setCH]         = useState(false)
  const [buscado, setBuscado]         = useState(false)

  useEffect(() => { cargarMaquinas(); cargarRutas(); cargarInventario() }, [])
  useEffect(() => { if (tab === 'historial' && !buscado) buscarHistorial() }, [tab])

  async function cargarMaquinas() {
    setCM(true)
    try {
      const res = await api.get('/estacion-sinclair/maquinaria')
      if (res?.ok) setMaquinas(res.data)
    } finally {
      setCM(false)
    }
  }

  async function cargarRutas() {
    const res = await api.get('/estacion-sinclair/rutas')
    if (res?.ok) setRutas(res.data)
  }

  async function cargarInventario() {
    const res = await api.get('/estacion-sinclair/inventario')
    if (res?.ok) setInventario(res.data)
  }

  function set(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  const maquinaSel = maquinas.find(m => m._id === form.maquinaria)
  const requiereLectura = maquinaSel && !SIN_MEDIDOR.includes(maquinaSel.tipoMedidor)
  const opcionesMaquinas = maquinas.map(m => ({ value: m._id, label: `${m.codigo} — ${m.unidadDestino}`, sublabel: m.tipo }))

  async function guardar() {
    if (!form.maquinaria)                return toast('Selecciona la máquina', 'error')
    if (!form.cantidadDieselGalones)     return toast('La cantidad de diesel es obligatoria', 'error')
    setGuardando(true)
    try {
      const res = await api.post('/estacion-sinclair/despachos', {
        maquinaria: form.maquinaria,
        fecha: form.fecha,
        numeroRequisicion: form.numeroRequisicion,
        lecturaActual: form.lecturaActual === '' ? null : Number(form.lecturaActual),
        cantidadDieselGalones: Number(form.cantidadDieselGalones),
        encargadoBomba: form.encargadoBomba,
        ruta: form.ruta,
      })
      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')
      toast('✅ Despacho registrado', 'ok')
      setForm(prev => ({ ...FORM_VACIO, fecha: prev.fecha, encargadoBomba: prev.encargadoBomba }))
      setBuscado(false)
      cargarInventario()
    } finally {
      setGuardando(false)
    }
  }

  async function buscarHistorial() {
    setCH(true)
    setBuscado(false)
    try {
      const params = new URLSearchParams({ desde, hasta, limite: 300 })
      if (maquinaFiltro) params.set('maquinaria', maquinaFiltro)
      const res = await api.get(`/estacion-sinclair/despachos?${params.toString()}`)
      if (!res?.ok) return toast(res?.mensaje || 'Error', 'error')
      setDespachos(res.data)
      setBuscado(true)
      if (!res.data.length) toast('Sin despachos en ese período', 'info')
    } finally {
      setCH(false)
    }
  }

  function exportarHistorial() {
    const filas = despachos.map(d => ({
      Fecha: new Date(d.fecha).toLocaleDateString('es-HN'),
      Máquina: `${d.maquinaria?.codigo ?? ''} — ${d.maquinaria?.unidadDestino ?? ''}`,
      Galones: d.cantidadDieselGalones ?? '',
      'Precio/Gal': d.calculado?.precioGalon ?? '',
      Total: d.calculado?.total ?? '',
      Lectura: d.lecturaActual ?? '',
      Recorrido: d.calculado?.recorrido ?? '',
      Rendimiento: d.calculado?.rendimiento ?? '',
      Alerta: d.calculado?.alerta ?? '',
    }))
    exportarExcel(filas, `Historial_Diesel_${desde}_a_${hasta}`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Título */}
      <div className="fade-up">
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '.25rem' }}>Estación Sinclair</h1>
        <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>Control de despachos de diesel por máquina</p>
      </div>

      {/* Inventario */}
      {inventario && (
        <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
          <div className="card">
            <div style={{ fontSize: '.75rem', color: 'var(--muted)', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '.05em' }}>Entradas totales</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'DM Mono, monospace', marginTop: '.3rem' }}>{inventario.totalEntradasGalones} gal</div>
          </div>
          <div className="card">
            <div style={{ fontSize: '.75rem', color: 'var(--muted)', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '.05em' }}>Despachos totales</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'DM Mono, monospace', marginTop: '.3rem' }}>{inventario.totalDespachosGalones} gal</div>
          </div>
          <div className="card">
            <div style={{ fontSize: '.75rem', color: 'var(--muted)', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '.05em' }}>Existencia actual</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'DM Mono, monospace', marginTop: '.3rem', color: 'var(--verde)' }}>{inventario.existenciaActualGalones} gal</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="fade-up" style={{ display: 'flex', gap: '.5rem', borderBottom: '1px solid var(--border)' }}>
        {[['registrar', 'Registrar Despacho', ClipboardList], ['historial', 'Historial', Search], ['entradas', 'Entradas', Fuel], ['catalogos', 'Catálogos', Layers]].map(([key, label, Icon]) => (
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
          {cargandoMaq ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}><span className="spinner" /></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 560 }}>
              <div>
                <label className="lbl">Máquina *</label>
                <ComboboxBuscable
                  options={opcionesMaquinas}
                  value={form.maquinaria}
                  onChange={v => set('maquinaria', v)}
                  placeholder="Busca por código o nombre..."
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label className="lbl">Fecha</label>
                  <input className="inp" type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label className="lbl">Número de requisición</label>
                  <input className="inp" value={form.numeroRequisicion} onChange={e => set('numeroRequisicion', e.target.value)} />
                </div>
              </div>

              {requiereLectura && (
                <div>
                  <label className="lbl">Lectura actual ({maquinaSel.tipoMedidor})</label>
                  <input className="inp" type="number" step="0.01" min="0" value={form.lecturaActual}
                    onChange={e => set('lecturaActual', e.target.value)} />
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label className="lbl">Cantidad de diesel (galones) *</label>
                  <input className="inp" type="number" step="0.01" min="0" value={form.cantidadDieselGalones}
                    onChange={e => set('cantidadDieselGalones', e.target.value)} />
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label className="lbl">Encargado de bomba</label>
                  <input className="inp" value={form.encargadoBomba} onChange={e => set('encargadoBomba', e.target.value)} />
                </div>
              </div>

              <div>
                <label className="lbl">Ruta</label>
                <select className="inp" value={form.ruta} onChange={e => set('ruta', e.target.value)}>
                  <option value="">Selecciona...</option>
                  {rutas.map(r => (
                    <option key={r._id} value={r.nombre}>{r.nombre}</option>
                  ))}
                </select>
              </div>

              <button className="btn-primary" style={{ justifyContent: 'center', marginTop: '.5rem' }}
                onClick={guardar} disabled={guardando}>
                {guardando ? <span className="spinner" /> : <Save size={15} />} Guardar Despacho
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
                <label className="lbl">Máquina</label>
                <ComboboxBuscable
                  options={[{ value: '', label: 'Todas' }, ...opcionesMaquinas]}
                  value={maquinaFiltro}
                  onChange={setMaquinaFiltro}
                  placeholder="Busca por código o nombre..."
                />
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
                  {despachos.length} despachos encontrados
                </span>
                <button className="btn-secondary" onClick={exportarHistorial} disabled={!despachos.length}>
                  <FileDown size={15} /> Exportar Excel
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Fecha</th><th>Máquina</th><th>Galones</th><th>Precio/Gal</th><th>Total</th>
                      <th>Lectura</th><th>Recorrido</th><th>Rendimiento</th><th>Alerta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {despachos.map(d => (
                      <tr key={d._id}>
                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.8rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                          {new Date(d.fecha).toLocaleDateString('es-HN')}
                        </td>
                        <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                          {d.maquinaria?.codigo} — {d.maquinaria?.unidadDestino}
                        </td>
                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>{d.cantidadDieselGalones}</td>
                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>{d.calculado?.precioGalon ?? '—'}</td>
                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem', color: 'var(--verde)', fontWeight: 600 }}>{d.calculado?.total ?? '—'}</td>
                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>{d.lecturaActual ?? '—'}</td>
                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>{d.calculado?.recorrido ?? '—'}</td>
                        <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.82rem' }}>{d.calculado?.rendimiento ?? '—'}</td>
                        <td>
                          <span className={`badge ${COLOR_ALERTA[d.calculado?.alerta] || 'badge-gray'}`}>
                            {d.calculado?.alerta}
                          </span>
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

      {/* ── Entradas ── */}
      {tab === 'entradas' && (
        <EntradasDiesel onCambio={cargarInventario} />
      )}

      {/* ── Maquinaria ── */}
      {tab === 'catalogos' && (
        <CatalogosEstacion onCambioMaquinaria={cargarMaquinas} onCambioRutas={cargarRutas} />
      )}
    </div>
  )
}
