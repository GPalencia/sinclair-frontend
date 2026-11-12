// src/components/SolicitudResumen.jsx
// Tarjeta de una Solicitud a Bodega: encabezado, estado y líneas con
// Pedido / A entregar / Despachado. La usan el jefe (Mis solicitudes) y Bodega.
import { COLOR_ESTADO_SOLICITUD, cantidadObjetivo, fmtCant } from '../utils/solicitudesBodega'
import { fechaCorta } from '../utils/fecha'

export default function SolicitudResumen({ sol, acciones }) {
  const revisada = sol.items.some(i => i.cantidadAprobada != null || i.notaBodega)
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', borderLeft: sol.prioridad === 'Urgente' ? '4px solid #dc2626' : undefined }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>
            Solicitud No. {sol.folio}
            {sol.prioridad === 'Urgente' && <span className="badge badge-red" style={{ marginLeft: '.5rem' }}>Urgente</span>}
          </div>
          <div style={{ fontSize: '.82rem', color: 'var(--muted)', marginTop: '.15rem' }}>
            {sol.departamentoNombre || sol.departamento?.nombre} · {sol.solicitante} · {fechaCorta(sol.fecha)}

          </div>
          {sol.destino && <div style={{ fontSize: '.8rem', color: 'var(--text2)', marginTop: '.15rem' }}>Destino general: {sol.destino}</div>}
        </div>
        <span className={`badge ${COLOR_ESTADO_SOLICITUD[sol.estado] || 'badge-gray'}`}>{sol.estado}</span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="tbl" style={{ fontSize: '.82rem' }}>
          <thead>
            <tr><th>C. Costo</th><th>Artículo</th><th>U/M</th><th style={{ textAlign: 'right' }}>Pedido</th>
              {revisada && <th style={{ textAlign: 'right' }}>A entregar</th>}
              <th style={{ textAlign: 'right' }}>Despachado</th><th>Uso / nota</th></tr>
          </thead>
          <tbody>
            {sol.items.map(it => {
              const objetivo = cantidadObjetivo(it)
              const cambio = it.cantidadAprobada != null && it.cantidadAprobada !== it.cantidadSolicitada
              return (
                <tr key={it._id}>
                  <td style={{ fontSize: '.75rem', whiteSpace: 'nowrap' }} title={it.centroCostoNombre}>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600 }}>{it.centroCostoCodigo || '—'}</span>
                    {it.centroCostoNombre && <div style={{ color: 'var(--muted)', maxWidth: 160, whiteSpace: 'normal' }}>{it.centroCostoNombre}</div>}
                  </td>
                  <td style={{ fontWeight: 500 }}>
                    {it.descripcion}
                    {!it.articulo && <div style={{ fontSize: '.68rem', color: 'var(--muted2)' }}>fuera de catálogo</div>}
                  </td>
                  <td>{it.unidadMedida || '—'}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'DM Mono, monospace' }}>{fmtCant(it.cantidadSolicitada)}</td>
                  {revisada && (
                    <td style={{ textAlign: 'right', fontFamily: 'DM Mono, monospace', fontWeight: 600, color: cambio ? '#b45309' : undefined }}>
                      {fmtCant(objetivo)}
                    </td>
                  )}
                  <td style={{ textAlign: 'right', fontFamily: 'DM Mono, monospace', color: (it.cantidadDespachada || 0) >= objetivo && objetivo > 0 ? 'var(--verde)' : undefined }}>
                    {fmtCant(it.cantidadDespachada || 0)}
                  </td>
                  <td style={{ fontSize: '.78rem', color: 'var(--text2)' }}>
                    {it.uso || ''}
                    {it.notaBodega && <div style={{ color: '#b45309' }}>Bodega: {it.notaBodega}</div>}
                    {!it.uso && !it.notaBodega && '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {sol.observaciones && <div style={{ fontSize: '.8rem', color: 'var(--text2)' }}>Observaciones: {sol.observaciones}</div>}
      {sol.estado === 'Rechazada' && <div style={{ fontSize: '.82rem', color: '#b91c1c', fontWeight: 600 }}>Rechazada: {sol.motivoRechazo}</div>}
      {sol.pases?.length > 0 && (
        <div style={{ fontSize: '.8rem', color: 'var(--text2)' }}>
          Salidas de Bodega: {sol.pases.map(p => `No. ${p.folio}${p.bodega?.nombre ? ` (${p.bodega.nombre})` : ''}`).join(', ')}
        </div>
      )}
      {(sol.revisadoPor || sol.registradoPor) && (
        <div style={{ fontSize: '.7rem', color: 'var(--muted2)' }}>
          {sol.registradoPor?.nombre && <>Creada por {sol.registradoPor.nombre}</>}
          {sol.revisadoPor?.nombre && <> · revisada por {sol.revisadoPor.nombre}{sol.fechaRevision ? ` el ${new Date(sol.fechaRevision).toLocaleDateString('es-HN')}` : ''}</>}
        </div>
      )}
      {acciones && <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>{acciones}</div>}
    </div>
  )
}
