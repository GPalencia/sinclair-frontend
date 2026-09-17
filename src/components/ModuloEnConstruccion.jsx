// src/components/ModuloEnConstruccion.jsx
// Placeholder reutilizable para los módulos nuevos (Fitoprotección, Labores
// Culturales, Producción Finca, Estación Sinclair) mientras se conectan
// con sus datos reales (hoy viven en AppSheet).

export default function ModuloEnConstruccion({ icon: Icon, titulo, descripcion }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="fade-up">
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '.25rem' }}>{titulo}</h1>
        <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>{descripcion}</p>
      </div>

      <div className="card fade-up" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', gap: '1rem', padding: '3.5rem 1.5rem',
        border: '1.5px dashed var(--border2)', background: 'var(--card2)',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(22,163,74,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={28} color="var(--verde)" />
        </div>
        <div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: '1rem', marginBottom: '.35rem' }}>
            Módulo en construcción
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '.85rem', maxWidth: 420 }}>
            Este submenú ya está disponible en el Dashboard. El contenido se conectará próximamente.
          </p>
        </div>
      </div>
    </div>
  )
}
