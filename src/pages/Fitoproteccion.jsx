// src/pages/Fitoproteccion.jsx
import { Sprout } from 'lucide-react'
import ModuloEnConstruccion from '../components/ModuloEnConstruccion'

export default function Fitoproteccion() {
  return (
    <ModuloEnConstruccion
      icon={Sprout}
      titulo="Fitoprotección"
      descripcion="Registro de aplicaciones fitosanitarias por lote"
    />
  )
}
