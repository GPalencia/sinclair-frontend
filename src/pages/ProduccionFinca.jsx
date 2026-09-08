// src/pages/ProduccionFinca.jsx
import { Warehouse } from 'lucide-react'
import ModuloEnConstruccion from '../components/ModuloEnConstruccion'

export default function ProduccionFinca() {
  return (
    <ModuloEnConstruccion
      icon={Warehouse}
      titulo="Producción Finca"
      descripcion="Cosecha y rendimiento por finca y lote"
    />
  )
}
