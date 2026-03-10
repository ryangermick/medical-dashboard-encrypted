import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { CheckCircle, AlertTriangle, X } from 'lucide-react'

const ToastContext = createContext()

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success', duration = 5000) => {
    const id = Date.now()
    setToasts(t => [...t, { id, message, type }])
    setTimeout(() => setToasts(t => t.filter(toast => toast.id !== id)), duration)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(t => t.filter(toast => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map(t => (
          <div key={t.id} className={`glass rounded-xl px-4 py-3 flex items-start gap-3 shadow-lg animate-slide-up border ${
            t.type === 'success' ? 'border-accent-green/20' : 'border-accent-red/20'
          }`}>
            {t.type === 'success' ? (
              <CheckCircle size={16} className="text-accent-green shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle size={16} className="text-accent-red shrink-0 mt-0.5" />
            )}
            <p className="text-sm text-text-primary flex-1">{t.message}</p>
            <button onClick={() => removeToast(t.id)} className="text-text-muted hover:text-text-primary">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
