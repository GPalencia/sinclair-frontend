// src/pages/EstacionSinclair.jsx
import { Radio } from 'lucide-react'
import ModuloEnConstruccion from '../components/ModuloEnConstruccion'

export default function EstacionSinclair() {
  return (
    <ModuloEnConstruccion
      icon={Radio}
      titulo="Estación Sinclair"
      descripcion="Datos de la estación (hoy en AppSheet)"
    />
  )
}
