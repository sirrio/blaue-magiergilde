import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

export type ToastVariant = 'info' | 'warning' | 'success' | 'error'

interface ToastContextValue {
  show: (message: ReactNode, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue>({ show: () => {} })

export const useToast = () => useContext(ToastContext)

export const toast: ToastContextValue = { show: () => {} }

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState<ReactNode>(null)
  const [variant, setVariant] = useState<ToastVariant>('info')

  const show = (newMessage: ReactNode, newVariant: ToastVariant = 'info') => {
    setMessage(newMessage)
    setVariant(newVariant)
    setVisible(true)
  }

  useEffect(() => {
    toast.show = show
    return () => { toast.show = () => {} }
  }, [show])

  useEffect(() => {
    if (!visible) return
    const timeout = setTimeout(() => setVisible(false), 3000)
    return () => clearTimeout(timeout)
  }, [visible])

  const getIcon = () => {
    switch (variant) {
      case 'info':
        return <Info size={14} />
      case 'warning':
        return <AlertTriangle size={14} />
      case 'success':
        return <CheckCircle size={14} />
      case 'error':
        return <XCircle size={14} />
    }
  }

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {visible && (
        <div className={cn('toast z-50')}>
          <div className={cn('alert', `alert-${variant}`, 'flex items-center')}>
            {getIcon()}
            <span className={'font-semibold'}>{message}</span>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}
