export const DEFAULT_LINE_TEMPLATE = '{item_link}{spell_part}{legacy_part}: {item_cost}'

export const LINE_TEMPLATE_VARIABLES = [
  '{item_link}',
  '{spell_part}',
  '{legacy_part}',
  '{item_cost}',
  '{item_name}',
  '{notes}',
  '{spell_link}',
  '{spell_name}',
  '{spell_legacy_link}',
  '{source_label}',
  '{source_shortcode}',
] as const

export type LineTemplateVariable = (typeof LINE_TEMPLATE_VARIABLES)[number]

export interface RenderDiscordLineOpts {
  /** Raw item name without notes */
  itemName: string
  itemUrl: string
  itemCost: string
  /** Notes appended to item name (e.g. variant name). Included in {item_name} and {item_link}, also available as {notes}. */
  notes?: string
  spellId: number | null
  spellName: string
  spellUrl: string
  spellLegacyUrl: string
  sourceKind?: string | null
  sourceShortcode?: string | null
}

export function renderDiscordLine(template: string | null, opts: RenderDiscordLineOpts): string {
  const tpl = template?.trim() || DEFAULT_LINE_TEMPLATE
  const { itemUrl, itemCost, spellId, spellName, spellUrl, spellLegacyUrl, sourceKind } = opts

  const notes = opts.notes?.trim() ?? ''
  const fullItemName = notes ? `${opts.itemName} - ${notes}` : opts.itemName
  const itemLink = itemUrl ? `[${fullItemName}](<${itemUrl}>)` : fullItemName

  let spellLink = ''
  let spellPart = ''
  let spellLegacyLink = ''
  let legacyPart = ''

  if (spellId && spellName) {
    const primaryUrl = spellUrl || spellLegacyUrl
    spellLink = primaryUrl ? `[${spellName}](<${primaryUrl}>)` : spellName
    spellPart = ` - ${spellLink}`
    if (spellLegacyUrl && spellLegacyUrl !== primaryUrl) {
      spellLegacyLink = `[Legacy](<${spellLegacyUrl}>)`
      legacyPart = ` - ${spellLegacyLink}`
    }
  }

  const sk = sourceKind ?? ''
  const sourceLabel = sk === 'official' ? 'Official' : sk === 'partnered' ? 'Partnered' : ''
  const sourceShortcode = opts.sourceShortcode ?? ''

  return tpl
    .replaceAll('{item_link}', itemLink)
    .replaceAll('{item_name}', fullItemName)
    .replaceAll('{item_cost}', itemCost)
    .replaceAll('{notes}', notes)
    .replaceAll('{spell_link}', spellLink)
    .replaceAll('{spell_name}', spellName)
    .replaceAll('{spell_legacy_link}', spellLegacyLink)
    .replaceAll('{spell_part}', spellPart)
    .replaceAll('{legacy_part}', legacyPart)
    .replaceAll('{source_label}', sourceLabel)
    .replaceAll('{source_shortcode}', sourceShortcode)
}
