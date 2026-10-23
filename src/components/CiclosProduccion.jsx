// src/components/CiclosProduccion.jsx
// Resumen por ciclo de cosecha: cada lote puede tener varios ciclos (cada uno
// con su fecha de calentamiento). Sirve para comparar un ciclo contra el anterior.
import { useState, useEffect, useMemo } from 'react'
import { FileDown, Search } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { exportarExcel } from '../utils/exportExcel'
import { fechaCorta } from '../utils/fecha'

const fmt = (n) => (n == null ? '—' : n.toLocaleString('es-HN', { maximumFractionDigits: 2 }))

export default function CiclosProduccion({ fincas }) {
  const api = useApi()
  const { toast } = useToast()
  const [finca, setFinca] = useState('')
  const [soloConVarios, setSoloConVarios] = useState(false)
  const [ciclos, setCiclos] = useState([])
  const [cargando, setCargando] = useState(false)

  useEffect(() => { buscar() }, [])

  async function buscar() {
    setCargando(true)
    try {
      const res = await api.get(`/produccion-finca/ciclos${finca ? `?finca=${encodeURIComponent(finca)}` : ''}`)
      if (!res?.ok) return toast(res?.mensaje || 'Error', 'error')
      setCiclos(res.data)
    } finally { setCargando(false) }
  }

  const visibles = useMemo(() => (soloConVarios ? ciclos.filter(c => c.ciclo?.de > 1) : ciclos), [ciclos, soloConVarios])

  function exportar() {
    exportarExcel(visibles.map(c => ({
      Finca: c.finca, Lote: c.lote, Ciclo: c.ciclo ? `${c.ciclo.n} de ${c.ciclo.de}` : '',
      Estado: c.activo ? 'Activo' : 'Cerrado', Variedad: c.variedad || '', 'Área (Mz)': c.area ?? '',
      'Fecha Calentamiento': fechaCorta(c.fechaCalentamiento), 'Fecha Cierre': c.fechaCierre ? fechaCorta(c.fechaCierre) : '',
      'Primer Registro': c.primerRegistro ? fechaCorta(c.primerRegistro) : '', 'Último Registro': c.ultimoRegistro ? fechaCorta(c.ultimoRegistro) : '',
      'Días Cosechando': c.diasCosechando ?? '', Registros: c.registros,
      'Cestas (total)': c.cestas, 'Kilos (promedio)': c.kilosPromedio ?? '', 'Rend. (promedio)': c.rendPromedio ?? '',
      'Cestas/Jornal (promedio)': c.cestasPorPersonaPromedio ?? '',
    })), 'Ciclos_Produccion')
  }

  return (
    <>
      <div className="card fade-up">
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label className="lbl">Finca</label>
            <select className="inp" value={finca} onChange={e => setFinca(e.target.value)}>
              <option value="">Todas</option>
              {fincas.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.85rem', paddingBottom: '.7rem' }}>
            <input type="checkbox" checked={soloConVarios} onChange={e => setSoloConVarios(e.target.checked)} />
            Solo lotes con más de un ciclo
          </label>
          <button className="btn-primary" onClick={buscar} disabled={cargando}>
            {cargando ? <span className="spinner" /> : <Search size={15} />} Ver ciclos
          </button>
        </div>
      </div>

      <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.75rem' }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '.85rem', fontWeight: 600 }}>{visibles.length} ciclos</span>
          <button className="btn-secondary" onClick={exportar} disabled={!visibles.length}><FileDown size={15} /> Exportar Excel</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Finca / Lote</th><th>Ciclo</th><th>Calentamiento</th><th>Cierre</th><th>Días</th><th>Registros</th>
                <th>Cestas<div style={{ fontSize: '.6rem', fontWeight: 500 }}>TOTAL</div></th>
                <th>Kilos<div style={{ fontSize: '.6rem', fontWeight: 500 }}>PROM.</div></th>
                <th>Rend.<div style={{ fontSize: '.6rem', fontWeight: 500 }}>PROM.</div></th>
                <th>Cestas/Jornal<div style={{ fontSize: '.6rem', fontWeight: 500 }}>PROM.</div></th>
              </tr>
            </thead>
            <tbody>
              {visibles.map(c => (
                <tr key={c._id} style={c.activo ? undefined : { opacity: .85 }}>
                  <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {c.finca} — {c.lote}
                    <div style={{ fontSize: '.72rem', color: 'var(--muted)', fontWeight: 400 }}>{c.variedad || 's/variedad'}{c.area ? ` · ${c.area} Mz` : ''}</div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span className={`badge ${c.activo ? 'badge-green' : 'badge-gray'}`}>{c.activo ? '● Activo' : 'Cerrado'}</span>
                    {c.ciclo?.de > 1 && <div style={{ fontSize: '.7rem', color: 'var(--muted)', marginTop: '.2rem' }}>ciclo {c.ciclo.n} de {c.ciclo.de}</div>}
                  </td>
                  <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.8rem' }}>{fechaCorta(c.fechaCalentamiento)}</td>
                  <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '.8rem', color: 'var(--muted)' }}>{c.fechaCierre ? fechaCorta(c.fechaCierre) : '—'}</td>
                  <td style={{ textAlign: 'center' }}>{c.diasCosechando ?? '—'}</td>
                  <td style={{ textAlign: 'center' }}>{c.registros}</td>
                  <td style={{ fontFamily: 'DM Mono, monospace', fontWeight: 700, color: 'var(--verde)' }}>{fmt(c.cestas)}</td>
                  <td style={{ fontFamily: 'DM Mono, monospace' }}>{fmt(c.kilosPromedio)}</td>
                  <td style={{ fontFamily: 'DM Mono, monospace' }}>{fmt(c.rendPromedio)}</td>
                  <td style={{ fontFamily: 'DM Mono, monospace' }}>{fmt(c.cestasPorPersonaPromedio)}</td>
                </tr>
              ))}
              {!visibles.length && <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--muted)', padding: '1.5rem' }}>{cargando ? 'Cargando...' : 'Sin ciclos'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
