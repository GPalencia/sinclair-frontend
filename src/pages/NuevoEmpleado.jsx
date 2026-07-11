// src/pages/NuevoEmpleado.jsx
import { useState } from 'react'
import { Save } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'

export default function NuevoEmpleado() {
  const api       = useApi()
  const { toast } = useToast()
  const navigate  = useNavigate()

  const [form, setForm] = useState({ nombres: '', apellidos: '', codigoEmpleado: '', FechaIngreso: '' })
  const [cargando, setCargando] = useState(false)

  function set(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  async function guardar() {
    if (!form.nombres.trim() || !form.apellidos.trim()) {
      return toast('Nombres y apellidos son obligatorios', 'error')
    }
    if (!form.codigoEmpleado.trim()) {
      return toast('El código Sodisa es obligatorio', 'error')
    }
    setCargando(true)
    try {
      const fd = new FormData()
      fd.append('nombres', form.nombres.trim())
      fd.append('apellidos', form.apellidos.trim())
      fd.append('codigoEmpleado', form.codigoEmpleado.trim().toUpperCase())
      fd.append('cargo', 'operario')
      if (form.FechaIngreso) fd.append('FechaIngreso', form.FechaIngreso)

      const res = await api.postForm('/personal', fd)
      if (!res?.ok) return toast(res?.mensaje || 'Error al guardar', 'error')

      toast('✅ Empleado registrado. Puedes asignar el Face ID desde la lista.', 'ok')
      navigate('/personal')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 520 }}>

      {/* Encabezado */}
      <div className="fade-up" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button className="btn-ghost" onClick={() => navigate('/personal')}>Volver</button>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Nuevo Empleado</h1>
          <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>
            Registro rápido — el Face ID se asigna después desde la lista
          </p>
        </div>
      </div>

      {/* Formulario */}
      <div className="card fade-up">
        <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '.9rem', color: 'var(--muted)',
          marginBottom: '1.25rem', letterSpacing: '.08em', textTransform: 'uppercase' }}>
          Datos del Empleado
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="lbl">Nombres *</label>
            <input
              className="inp"
              placeholder="Juan Carlos"
              value={form.nombres}
              onChange={e => set('nombres', e.target.value)}
            />
          </div>
          <div>
            <label className="lbl">Apellidos *</label>
            <input
              className="inp"
              placeholder="García Rodríguez"
              value={form.apellidos}
              onChange={e => set('apellidos', e.target.value)}
            />
          </div>
          <div>
            <label className="lbl">Código Sodisa *</label>
            <input
              className="inp"
              placeholder="FG002705"
              value={form.codigoEmpleado}
              onChange={e => set('codigoEmpleado', e.target.value.toUpperCase())}
              style={{ fontFamily: 'DM Mono, monospace', letterSpacing: '.05em' }}
            />
          </div>
          <div>
            <label className="lbl">Fecha de Ingreso</label>
            <input
              className="inp"
              type="date"
              value={form.FechaIngreso}
              onChange={e => set('FechaIngreso', e.target.value)}
            />
          </div>
        </div>

        {/* Nota informativa */}
        <div style={{ marginTop: '1.25rem', padding: '.75rem 1rem', background: 'var(--surface)',
          borderRadius: 8, fontSize: '.8rem', color: 'var(--muted)', lineHeight: 1.6,
          borderLeft: '3px solid var(--verde)' }}>
          <strong style={{ color: 'var(--text)' }}>ℹ️ Registro en lote</strong><br />
          Puedes registrar varios empleados con nombre y código Sodisa, y luego asignar
          el <strong>Face ID</strong> individualmente desde la lista de personal usando el
          botón <strong>🔍 Asignar Face ID</strong>.
        </div>
      </div>

      {/* Botones */}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button className="btn-secondary" onClick={() => navigate('/personal')}>Cancelar</button>
        <button className="btn-primary" onClick={guardar} disabled={cargando}>
          {cargando ? <span className="spinner" /> : <Save size={15} />} Registrar Empleado
        </button>
      </div>
    </div>
  )
}
