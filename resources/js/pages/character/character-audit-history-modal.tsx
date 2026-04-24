import { Button } from '@/components/ui/button'
import { Modal, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Tooltip } from '@/components/ui/tooltip'
import { secondsToHourMinuteString } from '@/helper/secondsToHourMinuteString'
import { useTranslate } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Character, CharacterAuditEvent } from '@/types'
import { BookOpen, CircleHelp, Coins, Droplets, FlameKindling, Gauge, History, Info, Pencil, RefreshCcw, ShoppingBag, Trash } from 'lucide-react'

type CharacterAuditHistoryModalProps = {
  character: Character
  triggerClassName?: string
  showLabel?: boolean
  labelClassName?: string
}

const actionLabelKey = (action: string): string => {
  const labels: Record<string, string> = {
    'adventure.created': 'characters.auditActionAdventureCreated',
    'adventure.deleted': 'characters.auditActionAdventureDeleted',
    'adventure.legacy_created': 'characters.auditActionAdventureLegacyCreated',
    'adventure.updated': 'characters.auditActionAdventureUpdated',
    'avatar_mode.updated': 'characters.auditActionAvatarModeUpdated',
    'bubble_shop.legacy_spent': 'characters.auditActionBubbleShopLegacySpent',
    'bubble_shop.updated': 'characters.auditActionBubbleShopUpdated',
    'character.admin_notes_updated': 'characters.auditActionCharacterAdminNotesUpdated',
    'character.created': 'characters.auditActionCharacterCreated',
    'character.deleted': 'characters.auditActionCharacterDeleted',
    'character.avatar_updated': 'characters.auditActionCharacterAvatarUpdated',
    'character.classes_updated': 'characters.auditActionCharacterClassesUpdated',
    'character.external_link_updated': 'characters.auditActionCharacterExternalLinkUpdated',
    'character.faction_updated': 'characters.auditActionCharacterFactionUpdated',
    'character.filler_updated': 'characters.auditActionCharacterFillerUpdated',
    'character.guild_status_updated': 'characters.auditActionCharacterGuildStatusUpdated',
    'character.legacy_snapshot': 'characters.auditActionLegacySnapshot',
    'character.name_updated': 'characters.auditActionCharacterNameUpdated',
    'character.notes_updated': 'characters.auditActionCharacterNotesUpdated',
    'character.review_note_updated': 'characters.auditActionCharacterReviewNoteUpdated',
    'character.restored': 'characters.auditActionCharacterRestored',
    'character.start_tier_updated': 'characters.auditActionCharacterStartTierUpdated',
    'character.submitted': 'characters.auditActionCharacterSubmitted',
    'character.updated': 'characters.auditActionCharacterUpdated',
    'character.version_updated': 'characters.auditActionCharacterVersionUpdated',
    'downtime.created': 'characters.auditActionDowntimeCreated',
    'downtime.deleted': 'characters.auditActionDowntimeDeleted',
    'downtime.legacy_created': 'characters.auditActionDowntimeLegacyCreated',
    'downtime.updated': 'characters.auditActionDowntimeUpdated',
    'dm_bubbles.legacy_gained': 'characters.auditActionDmBubblesLegacyGained',
    'dm_bubbles.updated': 'characters.auditActionDmBubblesUpdated',
    'dm_coins.updated': 'characters.auditActionDmCoinsUpdated',
    'dm_rewards.updated': 'characters.auditActionDmRewardsUpdated',
    'bubble_shop.legacy_spend_updated': 'characters.auditActionBubbleShopLegacySpendUpdated',
    'level.legacy_anchor': 'characters.auditActionLevelLegacyAnchor',
    'level.set': 'characters.auditActionLevelSet',
    'level_curve.legacy_adjustment': 'characters.auditActionLevelCurveLegacyAdjustment',
    'level_curve.upgraded': 'characters.auditActionLevelCurveUpgraded',
    'manual_overrides.updated': 'characters.auditActionManualOverridesUpdated',
    'private_mode.updated': 'characters.auditActionPrivateModeUpdated',
    'progression.legacy_adjustment': 'characters.auditActionProgressionLegacyAdjustment',
    'tracking_mode.updated': 'characters.auditActionTrackingModeUpdated',
  }

  return labels[action] ?? action
}

const dmRewardActionForEvent = (event: CharacterAuditEvent): 'dm_bubbles.updated' | 'dm_coins.updated' | 'dm_rewards.updated' | null => {
  if (event.action !== 'character.updated') {
    return null
  }

  const changedFields = Array.isArray(event.metadata?.changed_fields) ? event.metadata.changed_fields.filter((field): field is string => typeof field === 'string') : []
  const hasChangedFields = changedFields.length > 0
  const hasDmBubbles = hasChangedFields ? changedFields.includes('dm_bubbles') : numericValue(event.delta, 'dm_bubbles') !== null && numericValue(event.delta, 'dm_bubbles') !== 0
  const hasDmCoins = hasChangedFields ? changedFields.includes('dm_coins') : numericValue(event.delta, 'dm_coins') !== null && numericValue(event.delta, 'dm_coins') !== 0

  if (hasChangedFields && changedFields.some((field) => field !== 'dm_bubbles' && field !== 'dm_coins')) {
    return null
  }

  if (hasDmBubbles && hasDmCoins) return 'dm_rewards.updated'
  if (hasDmBubbles) return 'dm_bubbles.updated'
  if (hasDmCoins) return 'dm_coins.updated'

  return null
}

const actionLabelKeyForEvent = (event: CharacterAuditEvent): string => actionLabelKey(dmRewardActionForEvent(event) ?? event.action)

const actionIcon = (event: CharacterAuditEvent) => {
  const action = dmRewardActionForEvent(event) ?? event.action

  if (action.startsWith('adventure.')) return <BookOpen size={14} />
  if (action.startsWith('downtime.')) return <FlameKindling size={14} />
  if (action.startsWith('bubble_shop.')) return <ShoppingBag size={14} />
  if (action.startsWith('dm_bubbles.')) return <Droplets size={14} />
  if (action.startsWith('dm_coins.') || action.startsWith('dm_rewards.')) return <Coins size={14} />
  if (action.startsWith('level_curve.')) return <RefreshCcw size={14} />
  if (action.startsWith('level.')) return <Gauge size={14} />
  if (action.includes('deleted')) return <Trash size={14} />
  if (action.includes('updated')) return <Pencil size={14} />

  return <History size={14} />
}

const formatDateTime = (value: string): string => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: '2-digit',
  }).format(date)
}

const numericValue = (record: Record<string, unknown> | null | undefined, key: string): number | null => {
  const value = record?.[key]

  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

const stringValue = (record: Record<string, unknown> | null | undefined, key: string): string => {
  const value = record?.[key]

  return typeof value === 'string' ? value : ''
}

const formatSigned = (value: number): string => (value > 0 ? `+${value}` : `${value}`)

function DeltaBadges({ event }: { event: CharacterAuditEvent }) {
  const t = useTranslate()
  const bubbles = numericValue(event.delta, 'bubbles')
  const bubbleShopSpend = numericValue(event.delta, 'bubble_shop_spend')
  const dmBubbles = numericValue(event.delta, 'dm_bubbles')
  const dmCoins = numericValue(event.delta, 'dm_coins')
  const downtimeSeconds = numericValue(event.delta, 'downtime_seconds')
  const durationSeconds = numericValue(event.delta, 'duration_seconds')
  const targetLevel = numericValue(event.delta, 'target_level')

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1">
      {bubbles !== null && bubbles !== 0 ? (
        <span className={cn('badge badge-sm gap-1', bubbles > 0 ? 'badge-success badge-soft' : 'badge-warning badge-soft')}>
          {formatSigned(bubbles)}
          <Droplets size={12} />
        </span>
      ) : null}
      {bubbleShopSpend !== null && bubbleShopSpend !== 0 ? (
        <span className="badge badge-warning badge-soft badge-sm">
          {t('characters.auditBubbleShopSpendDelta', { count: formatSigned(bubbleShopSpend) })}
        </span>
      ) : null}
      {dmBubbles !== null && dmBubbles !== 0 ? (
        <span className={cn('badge badge-sm gap-1', dmBubbles > 0 ? 'badge-success badge-soft' : 'badge-warning badge-soft')}>
          {t('characters.auditDmBubblesDelta', { count: formatSigned(dmBubbles) })}
          <Droplets size={12} />
        </span>
      ) : null}
      {dmCoins !== null && dmCoins !== 0 ? (
        <span className={cn('badge badge-sm gap-1', dmCoins > 0 ? 'badge-success badge-soft' : 'badge-warning badge-soft')}>
          {t('characters.auditDmCoinsDelta', { count: formatSigned(dmCoins) })}
          <Coins size={12} />
        </span>
      ) : null}
      {downtimeSeconds !== null && downtimeSeconds !== 0 ? (
        <span className={cn('badge badge-sm', downtimeSeconds > 0 ? 'badge-info badge-soft' : 'badge-warning badge-soft')}>
          {formatSigned(downtimeSeconds / 3600)}h
        </span>
      ) : null}
      {durationSeconds !== null && durationSeconds !== 0 ? (
        <span className="badge badge-ghost badge-sm">{secondsToHourMinuteString(Math.abs(durationSeconds))}</span>
      ) : null}
      {targetLevel !== null ? (
        <span className="badge badge-primary badge-soft badge-sm">{t('characters.auditTargetLevel', { level: targetLevel })}</span>
      ) : null}
    </div>
  )
}

function StateBadge({ event }: { event: CharacterAuditEvent }) {
  const t = useTranslate()
  const state = event.state_after
  const level = numericValue(state, 'level')
  const bubblesInLevel = numericValue(state, 'bubbles_in_level')
  const bubblesRequired = numericValue(state, 'bubbles_required_for_next_level')
  const availableBubbles = numericValue(state, 'available_bubbles')
  const bubbleShopSpend = numericValue(state, 'bubble_shop_spend')
  const downtimeTotal = numericValue(state, 'downtime_total_seconds')
  const realAdventures = numericValue(state, 'real_adventures_count')
  const tier = stringValue(state, 'tier').toUpperCase()

  if (!state) {
    return (
      <Tooltip
        content={
          <div className="space-y-1">
            <p>{t('characters.auditLegacyNoState')}</p>
            {event.metadata?.legacy_backfill ? <p>{t('characters.auditLegacyBackfillTooltip')}</p> : null}
          </div>
        }
        placement="left"
      >
        <span className="badge badge-warning badge-soft badge-sm shrink-0 gap-1">
          <CircleHelp size={11} />
          {event.metadata?.legacy_backfill ? t('characters.auditLegacy') : t('characters.auditNoStateBadge')}
        </span>
      </Tooltip>
    )
  }

  const stateLabel =
    level === null
      ? t('characters.auditStateBadgeUnknown')
      : t('characters.auditStateBadge', {
          level,
          current: bubblesInLevel ?? '-',
          max: bubblesRequired ?? '-',
        })

  return (
    <Tooltip
      placement="left"
      content={
        <div className="space-y-1">
          <p className="font-semibold">{t('characters.auditStateTooltipTitle')}</p>
          <p>{t('characters.auditStateLevel', { level: level ?? '-', tier: tier || '-' })}</p>
          <p>
            {t('characters.auditStateBubbles', {
              current: bubblesInLevel ?? '-',
              max: bubblesRequired ?? '-',
              total: availableBubbles ?? '-',
            })}
          </p>
          <p>{t('characters.auditStateBubbleShop', { count: bubbleShopSpend ?? '-' })}</p>
          <p>{t('characters.auditStateDowntime', { duration: downtimeTotal === null ? '-' : secondsToHourMinuteString(downtimeTotal) })}</p>
          <p>{t('characters.auditStateAdventures', { count: realAdventures ?? '-' })}</p>
        </div>
      }
    >
      <span className="badge badge-ghost badge-sm shrink-0">{stateLabel}</span>
    </Tooltip>
  )
}

function AuditEventRow({ event }: { event: CharacterAuditEvent }) {
  const t = useTranslate()
  const title = stringValue(event.metadata, 'title')
  const actionLabel = t(actionLabelKeyForEvent(event))

  return (
    <li className="border-base-200 hover:bg-base-200/35 border-b px-1.5 py-2 last:border-b-0">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className="text-base-content/50 w-28 shrink-0 tabular-nums">{formatDateTime(event.occurred_at)}</span>
        <span className="bg-base-200 text-base-content/70 flex h-6 w-6 shrink-0 items-center justify-center rounded-full">{actionIcon(event)}</span>
        <Tooltip
          content={
            <div className="space-y-1">
              <p className="font-semibold">{actionLabel}</p>
              {title ? <p>{title}</p> : null}
              {event.actor?.name ? <p>{event.actor.name}</p> : null}
            </div>
          }
          placement="top"
          wrapperClassName="min-w-0 flex-1"
        >
          <span className="block truncate text-sm font-medium">
            {actionLabel}
            {title ? <span className="text-base-content/55 font-normal"> · {title}</span> : null}
            {event.actor?.name ? <span className="text-base-content/45 font-normal"> · {event.actor.name}</span> : null}
          </span>
        </Tooltip>
        <DeltaBadges event={event} />
        <StateBadge event={event} />
        {event.metadata?.legacy_backfill && event.state_after ? (
          <Tooltip content={t('characters.auditLegacyBackfillTooltip')} placement="left">
            <span className="badge badge-warning badge-soft badge-sm shrink-0 gap-1">
              <Info size={11} />
              {t('characters.auditLegacy')}
            </span>
          </Tooltip>
        ) : null}
      </div>
    </li>
  )
}

export default function CharacterAuditHistoryModal({ character, triggerClassName, showLabel = false, labelClassName }: CharacterAuditHistoryModalProps) {
  const t = useTranslate()
  const events = (character.audit_events ?? []).filter((event) => !event.metadata?.hidden_from_history)

  return (
    <Modal wide>
      <ModalTrigger>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn('justify-center', triggerClassName)}
          aria-label={t('characters.auditHistoryOpen')}
          title={t('characters.auditHistoryOpen')}
        >
          <History size={14} />
          {showLabel ? <span className={labelClassName}>{t('characters.auditHistory')}</span> : null}
        </Button>
      </ModalTrigger>
      <ModalTitle>{t('characters.auditHistory')}</ModalTitle>
      <ModalContent>
        <div className="space-y-3">
          <p className="text-base-content/65 text-xs">{t('characters.auditHistoryIntro')}</p>
          {events.length > 0 ? (
            <ol className="border-base-200 bg-base-100 rounded-box max-h-[65vh] overflow-y-auto border">
              {events.map((event) => (
                <AuditEventRow key={event.id} event={event} />
              ))}
            </ol>
          ) : (
            <div className="border-base-200 bg-base-200/35 rounded-box border p-4 text-sm">{t('characters.auditHistoryEmpty')}</div>
          )}
        </div>
      </ModalContent>
    </Modal>
  )
}
