import { Source } from '@/types'

type Translate = (key: string) => string

export const sourceKindKey = (kind: Source['kind']): string => {
  return kind === 'third_party' ? 'compendium.thirdPartySource' : 'compendium.officialSource'
}

export const sourceKindShortKey = (kind: Source['kind']): string => {
  return kind === 'third_party' ? 'compendium.thirdPartySourceShort' : 'compendium.officialSourceShort'
}

export const sourceKindBadgeClass = (kind: Source['kind']): string => {
  return kind === 'third_party'
    ? 'border-secondary/40 bg-secondary/10 text-secondary'
    : 'border-success/40 bg-success/10 text-success'
}

export const formatSourceKindLabel = (kind: Source['kind'], translate: Translate): string => {
  return translate(sourceKindKey(kind))
}

export const formatSourceKindShortLabel = (kind: Source['kind'], translate: Translate): string => {
  return translate(sourceKindShortKey(kind))
}

export const formatSourceOptionLabel = (source: Source, translate: Translate): string => {
  return `${source.shortcode} - ${source.name} · ${formatSourceKindLabel(source.kind, translate)}`
}
