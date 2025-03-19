import React, { ReactNode, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

type ToastVariant = 'info' | 'warning' | 'success' | 'error'


const Toast: React.FC & {
  show: (message: ReactNode, variant?: ToastVariant) => void
} = () => {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState<ReactNode>(null)
  const [variant, setVariant] = useState<ToastVariant>('info')

  useEffect(() => {
    if (!visible) return
    const timeout = setTimeout(() => setVisible(false), 3000)
    return () => clearTimeout(timeout)
  }, [visible])

  Toast.show = (newMessage: ReactNode, newVariant: ToastVariant = 'info') => {
    setMessage(newMessage)
    setVariant(newVariant)
    setVisible(true)
  }

  if (!visible) return null

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
    <div className={cn('toast z-50')}>
      <div className={cn('alert', `alert-${variant}`, 'flex items-center')}>
        {getIcon()}
        <span className={'font-semibold'}>{message}</span>
      </div>
    </div>
  )
}

Toast.show = () => {
} // Default empty function to avoid undefined issues when used immediately

export default Toast
