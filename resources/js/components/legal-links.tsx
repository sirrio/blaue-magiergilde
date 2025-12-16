import { cn } from '@/lib/utils'
import { Link } from '@inertiajs/react'

export default function LegalLinks({ variant = 'fixed', className }: { variant?: 'fixed' | 'inline'; className?: string }) {
  return (
    <div
      className={cn(
        variant === 'fixed'
          ? 'fixed bottom-2 right-2 space-x-2 text-sm opacity-80'
          : 'flex items-center justify-center gap-4 text-sm opacity-70',
        className
      )}
      role="contentinfo"
    >
      <Link href={route('impressum')} className="link">
        Impressum
      </Link>
      <Link href={route('datenschutz')} className="link">
        Datenschutz
      </Link>
    </div>
  )
}
