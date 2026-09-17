// src/config/modulos.js
//
// Fuente única de verdad para los módulos/submenús del Dashboard.
// - key: valor guardado en Usuario.modulos (backend)
// - Se usa para armar el sidebar (Layout.jsx), proteger rutas (App.jsx)
//   y pintar el editor de permisos (Usuarios.jsx).
//
// "planillas" es un grupo con sub-rutas (las páginas de registro de campo
// que ya existían). El resto son módulos de una sola página, por ahora
// placeholders "en construcción" hasta que se conecten con AppSheet.

export const MODULOS = [
  {
    key: 'planillas',
    label: 'Planillas',
    icon: 'ClipboardList',
    to: '/registro', // ruta por defecto al hacer click en el grupo
    submenu: [
      { to: '/registro',  label: 'Registro'   },
      { to: '/personal',  label: 'Personal'   },
      { to: '/historial', label: 'Historial'  },
      { to: '/catalogos', label: 'Catálogos'  },
    ],
  },
  {
    key: 'fitoproteccion',
    label: 'Fitoprotección',
    icon: 'Sprout',
    to: '/fitoproteccion',
  },
  {
    key: 'laboresCulturales',
    label: 'Labores Culturales',
    icon: 'Shovel',
    to: '/labores-culturales',
  },
  {
    key: 'produccionFinca',
    label: 'Producción Finca',
    icon: 'Warehouse',
    to: '/produccion-finca',
  },
  {
    key: 'estacionSinclair',
    label: 'Estación Sinclair',
    icon: 'Fuel',
    to: '/estacion-sinclair',
  },
]

// Devuelve true si el usuario puede ver el módulo con esa key.
// Admin siempre ve todo; supervisor depende de usuario.modulos.
export function puedeVerModulo(usuario, key) {
  if (!usuario) return false
  if (usuario.rol === 'admin') return true
  return Array.isArray(usuario.modulos) && usuario.modulos.includes(key)
}
