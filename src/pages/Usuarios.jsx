// src/pages/Usuarios.jsx
import { useState, useEffect } from 'react'
import { UserPlus, Pencil, KeyRound, UserX, Save, X } from 'lucide-react'
import { UserPlus, Pencil, KeyRound, UserX } from 'lucide-react'
import { useApi } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../context/AuthContext'

// ── Modal reutilizable ─────────────────────────────────
function Modal({ titulo, onClose, children }) {
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.75rem', width: '100%', maxWidth: 460, animation: 'fadeUp .25s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1rem', fontWeight: 700 }}>{titulo}</h3>
          <button className="btn-ghost" onClick={onClose} style={{ fontSize: '1.1rem', padding: '.3rem .6rem' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Badge de rol ───────────────────────────────────────
function BadgeRol({ rol }) {
  return (
    <span className={`badge ${rol === 'admin' ? 'badge-yellow' : 'badge-blue'}`}>
      {rol === 'admin' ? '⭑ Admin' : '◈ Supervisor'}
    </span>
  )
}

export default function Usuarios() {
  const api           = useApi()
  const { toast }     = useToast()
  const { usuario }   = useAuth()
  const esAdmin       = usuario?.rol === 'admin'

  const [usuarios, setUsuarios]       = useState([])
  const [cargando, setCargando]       = useState(true)
  const [guardando, setGuardando]     = useState(false)

  // Modales
  const [modalNuevo, setModalNuevo]       = useState(false)
  const [modalEditar, setModalEditar]     = useState(null)  // objeto usuario
  const [modalPass, setModalPass]         = useState(null)  // objeto usuario
  const [modalPerfil, setModalPerfil]     = useState(false) // mi perfil

  // Forms
  const [formNuevo, setFormNuevo] = useState({ nombre: '', email: '', password: '', rol: 'supervisor' })
  const [formEditar, setFormEditar] = useState({})
  const [formPass, setFormPass]   = useState({ passwordActual: '', passwordNuevo: '', confirmar: '' })

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    if (esAdmin) {
      const res = await api.get('/usuarios')
      if (res?.ok) setUsuarios(res.data)
    } else {
      // Supervisor solo ve su propio perfil
      const res = await api.get('/auth/yo')
      if (res?.ok) setUsuarios([res.usuario])
    }
    setCargando(false)
  }

  // ── Crear usuario ──────────────────────────────────
  async function crearUsuario() {
    const { nombre, email, password, rol } = formNuevo
    if (!nombre || !email || !password) return toast('Todos los campos son obligatorios', 'error')
    if (password.length < 6) return toast('La contraseña debe tener al menos 6 caracteres', 'error')
    setGuardando(true)
    try {
      const res = await api.post('/usuarios', { nombre, email, password, rol })
      if (!res?.ok) return toast(res?.mensaje || 'Error al crear', 'error')
      toast('✅ Usuario creado correctamente', 'ok')
      setModalNuevo(false)
      setFormNuevo({ nombre: '', email: '', password: '', rol: 'supervisor' })
      cargar()
    } finally { setGuardando(false) }
  }

  // ── Actualizar usuario ─────────────────────────────
  async function actualizarUsuario() {
    if (!formEditar.nombre || !formEditar.email) return toast('Nombre y email son obligatorios', 'error')
    setGuardando(true)
    try {
      const res = await api.put(`/usuarios/${modalEditar._id}`, formEditar)
      if (!res?.ok) return toast(res?.mensaje || 'Error al actualizar', 'error')
      toast('✅ Usuario actualizado', 'ok')
      setModalEditar(null)
      cargar()
    } finally { setGuardando(false) }
  }

  // ── Cambiar contraseña ─────────────────────────────
  async function cambiarPassword() {
    const { passwordActual, passwordNuevo, confirmar } = formPass
    if (!passwordNuevo) return toast('Ingresa la nueva contraseña', 'error')
    if (passwordNuevo.length < 6) return toast('Mínimo 6 caracteres', 'error')
    if (passwordNuevo !== confirmar) return toast('Las contraseñas no coinciden', 'error')
    const esPropio = modalPass._id === usuario?._id || modalPass._id === usuario?.id
    if (esPropio && !esAdmin && !passwordActual) return toast('Ingresa tu contraseña actual', 'error')
    setGuardando(true)
    try {
      const res = await api.put(`/usuarios/${modalPass._id}/password`, { passwordActual, passwordNuevo })
      if (!res?.ok) return toast(res?.mensaje || 'Error', 'error')
      toast('✅ Contraseña actualizada', 'ok')
      setModalPass(null)
      setFormPass({ passwordActual: '', passwordNuevo: '', confirmar: '' })
    } finally { setGuardando(false) }
  }

  // ── Desactivar usuario ─────────────────────────────
  async function desactivar(u) {
    if (!confirm(`¿Desactivar a ${u.nombre}? No podrá iniciar sesión.`)) return
    const res = await api.del(`/usuarios/${u._id}`)
    if (!res?.ok) return toast(res?.mensaje || 'Error', 'error')
    toast('Usuario desactivado', 'ok')
    cargar()
  }

  // ── Abrir editar ───────────────────────────────────
  function abrirEditar(u) {
    setFormEditar({ nombre: u.nombre, email: u.email, rol: u.rol, activo: u.activo })
    setModalEditar(u)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Título */}
      <div className="fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '.25rem' }}>Usuarios</h1>
          <p style={{ color: 'var(--muted)', fontSize: '.88rem' }}>
            {esAdmin ? 'Administra los accesos al sistema' : 'Tu perfil de acceso'}
          </p>
        </div>
        {esAdmin && (
          <button className="btn-primary" onClick={() => setModalNuevo(true)}>
            Nuevo Usuario
          </button>
        )}
      </div>

      {/* Mi perfil (acceso rápido) */}
      <div className="card fade-up" style={{ border: '1px solid rgba(34,197,94,.2)', background: 'rgba(34,197,94,.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'rgba(34,197,94,.15)',
            border: '2px solid rgba(34,197,94,.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.2rem', color: 'var(--verde)',
            flexShrink: 0
          }}>
            {usuario?.nombre?.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '.95rem' }}>{usuario?.nombre}</div>
            <div style={{ fontSize: '.82rem', color: 'var(--muted)', marginTop: '.15rem' }}>{usuario?.email}</div>
            <div style={{ marginTop: '.4rem' }}><BadgeRol rol={usuario?.rol} /></div>
          </div>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            <button className="btn-secondary" style={{ fontSize: '.82rem' }}
              onClick={() => abrirEditar(usuario)}>
              Editar perfil
            </button>
            <button className="btn-secondary" style={{ fontSize: '.82rem' }}
              onClick={() => { setModalPass(usuario); setFormPass({ passwordActual: '', passwordNuevo: '', confirmar: '' }) }}>
              Cambiar contraseña
            </button>
          </div>
        </div>
      </div>

      {/* Lista de usuarios (solo admin) */}
      {esAdmin && (
        <div className="card fade-up" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'Syne, sans-serif', fontSize: '.85rem', fontWeight: 600 }}>
              Todos los usuarios ({usuarios.length})
            </span>
          </div>

          {cargando ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}><span className="spinner" /></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Creado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map(u => (
                    <tr key={u._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: u.rol === 'admin' ? 'rgba(245,158,11,.15)' : 'rgba(59,130,246,.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '.85rem',
                            color: u.rol === 'admin' ? '#fbbf24' : '#60a5fa',
                            flexShrink: 0
                          }}>
                            {u.nombre?.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 500 }}>{u.nombre}</span>
                          {u._id === (usuario?._id || usuario?.id) && (
                            <span className="badge badge-green" style={{ fontSize: '.68rem' }}>Tú</span>
                          )}
                        </div>
                      </td>
                      <td style={{ color: 'var(--muted)', fontSize: '.85rem', fontFamily: 'DM Mono, monospace' }}>
                        {u.email}
                      </td>
                      <td><BadgeRol rol={u.rol} /></td>
                      <td>
                        <span className={`badge ${u.activo ? 'badge-green' : 'badge-red'}`}>
                          {u.activo ? '● Activo' : '○ Inactivo'}
                        </span>
                      </td>
                      <td style={{ fontSize: '.78rem', color: 'var(--muted)', fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap' }}>
                        {new Date(u.createdAt).toLocaleDateString('es-HN')}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '.4rem' }}>
                          <button className="btn-ghost" style={{ fontSize: '.78rem' }} onClick={() => abrirEditar(u)}>
                            ✎
                          </button>
                          <button className="btn-ghost" style={{ fontSize: '.78rem' }}
                            onClick={() => { setModalPass(u); setFormPass({ passwordActual: '', passwordNuevo: '', confirmar: '' }) }}>
                            🔑
                          </button>
                          {u._id !== (usuario?._id || usuario?.id) && u.activo && (
                            <button className="btn-ghost" style={{ fontSize: '.78rem', color: 'var(--danger)' }}
                              onClick={() => desactivar(u)}>
                              ✕
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══ MODAL: Nuevo usuario ══ */}
      {modalNuevo && (
        <Modal titulo="Nuevo Usuario" onClose={() => setModalNuevo(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="lbl">Nombre completo *</label>
              <input className="inp" placeholder="Juan García" value={formNuevo.nombre}
                onChange={e => setFormNuevo(p => ({ ...p, nombre: e.target.value }))} />
            </div>
            <div>
              <label className="lbl">Email *</label>
              <input className="inp" type="email" placeholder="juan@sinclair.com" value={formNuevo.email}
                onChange={e => setFormNuevo(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <label className="lbl">Contraseña * (mínimo 6 caracteres)</label>
              <input className="inp" type="password" placeholder="••••••••" value={formNuevo.password}
                onChange={e => setFormNuevo(p => ({ ...p, password: e.target.value }))} />
            </div>
            <div>
              <label className="lbl">Rol</label>
              <div style={{ display: 'flex', gap: '.5rem', marginTop: '.35rem' }}>
                {[['supervisor','◈ Supervisor'],['admin','⭑ Administrador']].map(([r, label]) => (
                  <button key={r} type="button"
                    onClick={() => setFormNuevo(p => ({ ...p, rol: r }))}
                    style={{
                      flex: 1, padding: '.55rem', borderRadius: 8,
                      border: formNuevo.rol === r ? '1px solid rgba(34,197,94,.4)' : '1px solid var(--border)',
                      background: formNuevo.rol === r ? 'rgba(34,197,94,.08)' : 'transparent',
                      color: formNuevo.rol === r ? 'var(--verde)' : 'var(--muted)',
                      fontFamily: 'Syne, sans-serif', fontSize: '.82rem', cursor: 'pointer', transition: 'all .18s'
                    }}>
                    {label}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '.73rem', color: 'var(--muted)', marginTop: '.4rem' }}>
                Supervisor puede registrar planilla. Admin puede crear usuarios y gestionar catálogos.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '.75rem', marginTop: '.5rem' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setModalNuevo(false)}>Cancelar</button>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={crearUsuario} disabled={guardando}>
                {guardando ? <span className="spinner" /> : <UserPlus size={15} />} Crear Usuario
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══ MODAL: Editar usuario ══ */}
      {modalEditar && (
        <Modal titulo={`Editar — ${modalEditar.nombre}`} onClose={() => setModalEditar(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="lbl">Nombre completo *</label>
              <input className="inp" value={formEditar.nombre}
                onChange={e => setFormEditar(p => ({ ...p, nombre: e.target.value }))} />
            </div>
            <div>
              <label className="lbl">Email *</label>
              <input className="inp" type="email" value={formEditar.email}
                onChange={e => setFormEditar(p => ({ ...p, email: e.target.value }))} />
            </div>
            {/* Solo admin puede cambiar rol y estado */}
            {esAdmin && modalEditar._id !== (usuario?._id || usuario?.id) && (
              <>
                <div>
                  <label className="lbl">Rol</label>
                  <div style={{ display: 'flex', gap: '.5rem', marginTop: '.35rem' }}>
                    {[['supervisor','◈ Supervisor'],['admin','⭑ Admin']].map(([r, label]) => (
                      <button key={r} type="button"
                        onClick={() => setFormEditar(p => ({ ...p, rol: r }))}
                        style={{
                          flex: 1, padding: '.5rem', borderRadius: 8,
                          border: formEditar.rol === r ? '1px solid rgba(34,197,94,.4)' : '1px solid var(--border)',
                          background: formEditar.rol === r ? 'rgba(34,197,94,.08)' : 'transparent',
                          color: formEditar.rol === r ? 'var(--verde)' : 'var(--muted)',
                          fontFamily: 'Syne, sans-serif', fontSize: '.82rem', cursor: 'pointer', transition: 'all .18s'
                        }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                  <label className="lbl" style={{ margin: 0 }}>Estado:</label>
                  <button type="button"
                    onClick={() => setFormEditar(p => ({ ...p, activo: !p.activo }))}
                    className={`badge ${formEditar.activo ? 'badge-green' : 'badge-red'}`}
                    style={{ cursor: 'pointer', border: 'none', padding: '.3rem .8rem' }}>
                    {formEditar.activo ? '● Activo' : '○ Inactivo'}
                  </button>
                </div>
              </>
            )}
            <div style={{ display: 'flex', gap: '.75rem', marginTop: '.5rem' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setModalEditar(null)}>Cancelar</button>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={actualizarUsuario} disabled={guardando}>
                {guardando ? <span className="spinner" /> : <Pencil size={15} />} Guardar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══ MODAL: Cambiar contraseña ══ */}
      {modalPass && (
        <Modal titulo={`Contraseña — ${modalPass.nombre}`} onClose={() => setModalPass(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Solo pedir contraseña actual si es el propio usuario y no es admin */}
            {(modalPass._id === (usuario?._id || usuario?.id)) && !esAdmin && (
              <div>
                <label className="lbl">Contraseña actual *</label>
                <input className="inp" type="password" placeholder="••••••••"
                  value={formPass.passwordActual}
                  onChange={e => setFormPass(p => ({ ...p, passwordActual: e.target.value }))} />
              </div>
            )}
            <div>
              <label className="lbl">Nueva contraseña *</label>
              <input className="inp" type="password" placeholder="Mínimo 6 caracteres"
                value={formPass.passwordNuevo}
                onChange={e => setFormPass(p => ({ ...p, passwordNuevo: e.target.value }))} />
            </div>
            <div>
              <label className="lbl">Confirmar nueva contraseña *</label>
              <input className="inp" type="password" placeholder="Repite la contraseña"
                value={formPass.confirmar}
                onChange={e => setFormPass(p => ({ ...p, confirmar: e.target.value }))} />
              {formPass.confirmar && formPass.passwordNuevo !== formPass.confirmar && (
                <p style={{ fontSize: '.75rem', color: 'var(--danger)', marginTop: '.3rem' }}>
                  ✕ Las contraseñas no coinciden
                </p>
              )}
              {formPass.confirmar && formPass.passwordNuevo === formPass.confirmar && formPass.passwordNuevo.length >= 6 && (
                <p style={{ fontSize: '.75rem', color: 'var(--verde)', marginTop: '.3rem' }}>
                  ✓ Las contraseñas coinciden
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '.75rem', marginTop: '.5rem' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setModalPass(null)}>Cancelar</button>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={cambiarPassword} disabled={guardando}>
                {guardando ? <span className="spinner" /> : <KeyRound size={15} />} Actualizar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
