import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ListRow } from '@/components/ui/list'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { TextArea } from '@/components/ui/text-area'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { PageProps, Source, Spell } from '@/types'
import { useForm, usePage, router } from '@inertiajs/react'
import { ChevronDown, Copy, Pencil, Scale, Shield, Trash, XCircle } from 'lucide-react'
import { type MouseEvent } from 'react'

const schoolColors: Record<string, string> = {
  abjuration: 'text-spell-abjuration',
  conjuration: 'text-spell-conjuration',
  divination: 'text-spell-divination',
  enchantment: 'text-spell-enchantment',
  evocation: 'text-spell-evocation',
  illusion: 'text-spell-illusion',
  necromancy: 'text-spell-necromancy',
  transmutation: 'text-spell-transmutation',
}

const getSpellSchoolTextColor = (school: string): string => {
  return schoolColors[school] || ''
}

const copyToClipboard = (text: string, message = 'Copied to clipboard.') => {
  navigator.clipboard.writeText(text).then(() => {
    toast.show(message, 'info')
  })
}

const closeMenu = (event: MouseEvent<HTMLElement>) => {
  const details = event.currentTarget.closest('details')
  if (details) {
    details.removeAttribute('open')
  }
}

export default function SpellRow({ spell, sources = [] }: { spell: Spell; sources?: Source[] }) {
  const formData = {
    id: spell.id,
    name: spell.name,
    url: spell.url || '',
    legacy_url: spell.legacy_url || '',
    spell_school: spell.spell_school || '',
    spell_level: spell.spell_level,
    source_id: spell.source_id ?? '',
    guild_enabled: spell.guild_enabled ?? true,
    ruling_changed: spell.ruling_changed ?? false,
    ruling_note: spell.ruling_note ?? '',
  }
  const { data, setData, post } = useForm(formData)
  const { errors } = usePage<PageProps>().props
  const textColor = getSpellSchoolTextColor(spell.spell_school || '')
  const hasRulingChange = Boolean(spell.ruling_changed)
  const rulingNote = spell.ruling_note?.trim()
  const rulingLabel = hasRulingChange
    ? (rulingNote ? `Ruling: ${rulingNote}` : 'Ruling change')
    : 'No ruling change'
  const isGuildEnabled = spell.guild_enabled ?? true

  const handleRulingToggle = (enabled: boolean) => {
    setData('ruling_changed', enabled)
    if (!enabled) {
      setData('ruling_note', '')
    }
  }

  const handleFormSubmit = () => {
    post(route('admin.spells.update', { spell, _method: 'put' }), {
      preserveState: 'errors',
      preserveScroll: true,
    })
  }

  const dndBeyondLink = `https://www.dndbeyond.com/spells?filter-search=${spell.name}&filter-partnered-content=t`
  const hasCurrentUrl = Boolean(spell.url)
  const hasLegacyUrl = Boolean(spell.legacy_url)
  const primaryLink = hasCurrentUrl ? spell.url : (hasLegacyUrl ? spell.legacy_url : '')

  const handleDeleteSpell = () => {
    if (!window.confirm(`Delete spell "${spell.name}"?`)) return

    router.delete(route('admin.spells.destroy', { spell }), {
      preserveScroll: true,
      onError: () => {
        toast.show('Spell could not be deleted.', 'error')
      },
    })
  }

  return (
    <ListRow>
      <div>
        <svg className={cn('icon h-6 w-6 fill-current', textColor)}>
          <use xlinkHref={`/images/spell-schools.svg#${spell.spell_school}`}></use>
        </svg>
      </div>
      <div className={cn(textColor, 'text-xs sm:text-sm')}>
        {primaryLink ? (
          <a
            href={primaryLink}
            target="_blank"
            rel="noreferrer"
            className="link link-hover font-medium"
            title={hasCurrentUrl ? 'Open current link' : 'Open legacy link'}
          >
            {spell.name}
          </a>
        ) : (
          <span>{spell.name}</span>
        )}{' '}
        <span className={'text-xs font-light italic'}>(Level {spell.spell_level})</span>
        {spell.source?.shortcode ? (
          <span className="ml-2 rounded-full border border-base-300 px-2 py-0.5 text-[9px] uppercase text-base-content/70">
            {spell.source.shortcode}
          </span>
        ) : null}
        {hasCurrentUrl ? (
          <a
            href={spell.url || ''}
            target="_blank"
            rel="noreferrer"
            className="ml-2 rounded-full border border-info/40 bg-info/10 px-2 py-0.5 text-[9px] uppercase text-info hover:border-info/60"
            title="Open current link"
          >
            Current
          </a>
        ) : null}
        {hasLegacyUrl ? (
          <a
            href={spell.legacy_url || ''}
            target="_blank"
            rel="noreferrer"
            className="ml-2 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[9px] uppercase text-warning hover:border-warning/60"
            title="Open legacy link"
          >
            Legacy
          </a>
        ) : null}
      </div>
      <div className="flex items-center justify-center text-xs">
        {isGuildEnabled ? (
          <Shield className="h-4 w-4 text-success" aria-label="Allowed in guild" />
        ) : (
          <span
            className="relative inline-flex h-4 w-4 items-center justify-center"
            title="Not allowed in guild"
            aria-label="Not allowed in guild"
          >
            <Shield className="h-4 w-4 text-base-content/40" />
            <span className="absolute h-0.5 w-5 rotate-45 bg-error"></span>
          </span>
        )}
      </div>
      <div className="flex items-center justify-center text-xs" title={rulingLabel} aria-label={rulingLabel}>
        <Scale className={cn('h-4 w-4', hasRulingChange ? 'text-warning' : 'text-base-content/40')} />
      </div>
      <div className="flex items-center gap-1">
        <details className="dropdown dropdown-end">
          <summary className="btn btn-xs btn-ghost btn-square" aria-label="Spell link options" title="Spell link options">
            <Copy size={14} />
            <ChevronDown size={12} className="-ml-1 text-base-content/60" />
          </summary>
          <ul className="menu dropdown-content z-[1] mt-2 w-60 rounded-box border border-base-200 bg-base-100 p-1 shadow">
            <li>
              <button
                type="button"
                disabled={!hasCurrentUrl}
                onClick={(event) => {
                  if (!hasCurrentUrl) return
                  copyToClipboard(`:PHB24: [${spell.name}](<${spell.url}>)`, 'Current spell link copied in Discord format.')
                  closeMenu(event)
                }}
              >
                <span className="flex items-center gap-2">
                  {hasCurrentUrl ? <Copy size={14} /> : <XCircle size={14} />}
                  Copy current (Discord)
                </span>
              </button>
            </li>
            <li>
              <button
                type="button"
                disabled={!hasLegacyUrl}
                onClick={(event) => {
                  if (!hasLegacyUrl) return
                  copyToClipboard(`:PHB14: [${spell.name}](<${spell.legacy_url}>)`, 'Legacy spell link copied in Discord format.')
                  closeMenu(event)
                }}
              >
                <span className="flex items-center gap-2">
                  {hasLegacyUrl ? <Copy size={14} /> : <XCircle size={14} />}
                  Copy legacy (Discord)
                </span>
              </button>
            </li>
          </ul>
        </details>
        <span className="mx-1 h-4 border-l border-base-200" aria-hidden="true" />
        <Modal>
          <ModalTrigger>
            <Button size="xs" variant="ghost" modifier="square" title="Edit spell" aria-label="Edit spell">
              <Pencil size={14} />
            </Button>
          </ModalTrigger>
          <ModalTitle>
            <div className="flex items-center">
              Update Spell
              <div className="tooltip tooltip-right w-16" data-tip="Search on D&D Beyond">
                <a href={dndBeyondLink} target="_blank" rel="noreferrer" className="ml-4 flex items-center">
                  <img src="/images/dnd-beyond-logo.svg" className="absolute" alt="dnd-beyond-link" />
                </a>
              </div>
            </div>
          </ModalTitle>
          <ModalContent>
            <div className="space-y-4">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-base-content/60">Basic</p>
                <Input errors={errors.name} placeholder="Fireball" value={data.name} onChange={(e) => setData('name', e.target.value)}>
                  Name
                </Input>
                <Input errors={errors.url} placeholder="https://..." type="url" value={data.url} onChange={(e) => setData('url', e.target.value)}>
                  URL
                </Input>
                <Input
                  errors={errors.legacy_url}
                  placeholder="https://..."
                  type="url"
                  value={data.legacy_url}
                  onChange={(e) => setData('legacy_url', e.target.value)}
                >
                  Legacy URL
                </Input>
                <Select
                  errors={errors.source_id}
                  value={data.source_id}
                  onChange={(e) => setData('source_id', e.target.value ? Number(e.target.value) : '')}
                >
                  <SelectLabel>Source</SelectLabel>
                  <SelectOptions>
                    <option value="">No source</option>
                    {sources.map((source) => (
                      <option key={source.id} value={source.id}>
                        {source.shortcode} - {source.name}
                      </option>
                    ))}
                  </SelectOptions>
                </Select>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-base-content/60">Classification</p>
                <Input
                  errors={errors.spell_level}
                  placeholder="3"
                  type="number"
                  value={data.spell_level}
                  onChange={(e) => setData('spell_level', Number(e.target.value))}
                >
                  Spell Level
                </Input>
                <Select
                  errors={errors.spell_school}
                  value={data.spell_school}
                  onChange={(e) => setData('spell_school', e.target.value as Spell['spell_school'])}
                >
                  <SelectLabel>School</SelectLabel>
                  <SelectOptions>
                    <option value="abjuration">Abjuration</option>
                    <option value="conjuration">Conjuration</option>
                    <option value="divination">Divination</option>
                    <option value="enchantment">Enchantment</option>
                    <option value="evocation">Evocation</option>
                    <option value="illusion">Illusion</option>
                    <option value="necromancy">Necromancy</option>
                    <option value="transmutation">Transmutation</option>
                  </SelectOptions>
                </Select>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-base-content/60">Options</p>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    checked={Boolean(data.guild_enabled)}
                    onChange={(e) => setData('guild_enabled', e.target.checked)}
                  />
                  <span className="inline-flex items-center gap-2">
                    <Shield className="h-4 w-4 text-base-content/70" />
                    Allowed in guild
                  </span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    checked={Boolean(data.ruling_changed)}
                    onChange={(e) => handleRulingToggle(e.target.checked)}
                  />
                  <span className="inline-flex items-center gap-2">
                    <Scale className={cn('h-4 w-4', data.ruling_changed ? 'text-warning' : 'text-base-content/70')} />
                    Ruling changed
                  </span>
                </label>
                {data.ruling_changed ? (
                  <TextArea
                    value={data.ruling_note}
                    onChange={(e) => setData('ruling_note', e.target.value)}
                    placeholder="Describe the ruling change..."
                  >
                    Ruling note
                  </TextArea>
                ) : null}
              </div>
            </div>
          </ModalContent>
          <ModalAction onClick={handleFormSubmit}>Save</ModalAction>
        </Modal>
        <Button
          size="xs"
          variant="ghost"
          modifier="square"
          color="error"
          title="Delete spell"
          aria-label="Delete spell"
          onClick={handleDeleteSpell}
        >
          <Trash size={14} />
        </Button>
      </div>
    </ListRow>
  )
}
