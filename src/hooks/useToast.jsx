// src/hooks/useToast.js
import { createContext, useContext, useState, useCallback } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((msg, tipo = 'ok') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, msg, tipo }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  const iconos = { ok: CheckCircle2, error: XCircle, info: Info, warn: AlertTriangle }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.tipo}`}>
            {(() => { const I = iconos[t.tipo] || Info; return <I size={18} strokeWidth={2} style={{ flexShrink: 0 }} /> })()}
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
