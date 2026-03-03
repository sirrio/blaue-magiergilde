import { useTranslate } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Link } from '@inertiajs/react'

export default function LegalLinks({ variant = 'fixed', className }: { variant?: 'fixed' | 'inline'; className?: string }) {
  const t = useTranslate()
  const linkClasses =
    variant === 'inline'
      ? 'text-white/70 hover:text-white underline underline-offset-4 transition-colors'
      : 'link link-hover'

  return (
    <div
        className={cn(
          variant === 'fixed'
          ? 'fixed bottom-2 right-2 flex items-center gap-2 text-sm opacity-80'
          : 'flex items-center justify-center gap-4 text-sm opacity-70',
        className
      )}
      role="contentinfo"
    >
      <Link href={route('impressum')} className={linkClasses}>
        {t('legal.imprint')}
      </Link>
      <Link href={route('datenschutz')} className={linkClasses}>
        {t('legal.privacy')}
      </Link>
    </div>
  )
}
