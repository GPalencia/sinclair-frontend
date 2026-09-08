// src/pages/LaboresCulturales.jsx
import { Shovel } from 'lucide-react'
import ModuloEnConstruccion from '../components/ModuloEnConstruccion'

export default function LaboresCulturales() {
  return (
    <ModuloEnConstruccion
      icon={Shovel}
      titulo="Labores Culturales"
      descripcion="Siembras y labores de campo (despelilla y otras) por lote"
    />
  )
}
