import LogoBt from '@/components/logo-bt'
import LogoEt from '@/components/logo-et'
import LogoFiller from '@/components/logo-filler'
import LogoHt from '@/components/logo-ht'
import LogoLt from '@/components/logo-lt'

interface LogoTierProps {
  tier: string
  width?: number
}

export default function LogoTier({ tier, width }: LogoTierProps) {
  switch (tier) {
    case 'filler':
      return LogoFiller({ width })
    case 'bt':
      return LogoBt({ width })
    case 'lt':
      return LogoLt({ width })
    case 'ht':
      return LogoHt({ width })
    case 'et':
      return LogoEt({ width })
    default:
      return null
  }
}
