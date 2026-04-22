import { ActionMenu } from '@/components/ui/action-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Progress } from '@/components/ui/progress'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { FrontendErrorBoundary } from '@/components/error-boundary'
import { reportFrontendError } from '@/lib/frontend-error-reporting'
import DiscordChannelPickerModal from '@/components/discord-channel-picker-modal'
import { cn } from '@/lib/utils'
import AppLayout from '@/layouts/app-layout'
import { formatSourceKindLabel, sourceKindBadgeClass } from '@/helper/sourceDisplay'
import { useTranslate } from '@/lib/i18n'
import {
  CompendiumImportRun,
  DiscordBackupChannel,
  DiscordBackupStats,
  DiscordBackupStatus,
  DiscordBotSettings,
  MundaneItemVariant,
  PageProps,
  Source,
} from '@/types'
import { Head, router, useForm, usePage } from '@inertiajs/react'
import { Settings as SettingsIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const getCsrfToken = () => {
  if (typeof document === 'undefined') return ''
  const meta = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null
  return meta?.content ?? ''
}

type LegacyCharacterApprovalImportPreview = {
  preview_token: string
  filename: string
  summary: {
    total_rows: number
    new_rows: number
    updated_rows: number
    unchanged_rows: number
    invalid_rows: number
  }
  row_samples: Array<{
    line: number
    action: 'new' | 'updated' | 'unchanged'
    payload: {
      discord_name?: string | null
      player_name?: string | null
      room?: string | null
      tier: string
      character_name: string
      external_link: string
      dndbeyond_character_id: number
    }
    changes?: Record<string, { from: string | number | boolean | null; to: string | number | boolean | null }>
  }>
  error_samples: Array<{ line?: number; message?: string }>
}

type LevelProgressionVersionSummary = {
  id: number
  is_active: boolean
  created_at?: string | null
  changed_levels_count: number
  change_samples: Array<{
    level: number
    delta: number
  }>
}

type LevelProgressionUpdateReport = {
  new_version_id: number
  backfill: {
    pseudo_adventures_backfilled: number
    characters_affected: number
  }
  characters_pending_upgrade: number
}

const buildLevelProgressionStepValues = (entries: Array<{ level: number; required_bubbles: number }>) => {
  return entries.map((entry, index) => {
    const nextEntry = entries[index + 1]

    if (!nextEntry) {
      return null
    }

    return Math.max(0, Number(nextEntry.required_bubbles) - Number(entry.required_bubbles))
  })
}

const buildLevelProgressionEntriesFromSteps = (steps: Array<number | null>) => {
  let runningTotal = 0

  return Array.from({ length: 20 }, (_, index) => {
    const level = index + 1

    if (level === 1) {
      return { level, required_bubbles: 0 }
    }

    const previousStep = steps[index - 1]
    runningTotal += Math.max(0, Number.isFinite(Number(previousStep)) ? Number(previousStep) : 0)

    return { level, required_bubbles: runningTotal }
  })
}

const buildCompendiumOverrideConfirmMessage = (
  entityType: 'items' | 'spells' | 'sources',
  deletedRows: number
) => {
  const noun = entityType === 'items' ? 'items' : entityType === 'spells' ? 'spells' : 'sources'

  return [
    'Override mode is active.',
    '',
    `${deletedRows} existing ${noun} ${deletedRows === 1 ? 'entry is' : 'entries are'} missing from this CSV and ${deletedRows === 1 ? 'will' : 'will'} be removed.`,
    '',
    'Apply import?',
  ].join('\n')
}

const getCompendiumPreviewTitle = (
  entityType: 'items' | 'spells' | 'sources',
  payload: Record<string, string | number | boolean | null>,
  sourceLabel?: string
) => {
  if (entityType === 'items') {
    const details = [payload.type, payload.rarity, sourceLabel].filter(Boolean).join(' · ')
    return {
      title: String(payload.name ?? 'Unnamed item'),
      details,
    }
  }

  if (entityType === 'spells') {
    const details = [`Level ${payload.spell_level ?? '-'}`, payload.spell_school, sourceLabel].filter(Boolean).join(' · ')
    return {
      title: String(payload.name ?? 'Unnamed spell'),
      details,
    }
  }

  return {
    title: String(payload.shortcode ?? 'Unknown source'),
    details: [payload.name, payload.kind].filter(Boolean).join(' · '),
  }
}

const getCompendiumActionBadgeClass = (action: 'new' | 'updated' | 'unchanged' | 'deleted' | 'invalid') => {
  if (action === 'new') {
    return 'border-success/40 bg-success/10 text-success'
  }

  if (action === 'updated') {
    return 'border-warning/40 bg-warning/10 text-warning'
  }

  if (action === 'deleted') {
    return 'border-error/40 bg-error/10 text-error'
  }

  if (action === 'invalid') {
    return 'border-error/40 bg-error/10 text-error'
  }

  return 'border-base-200 bg-base-200/40 text-base-content/70'
}

const getCompendiumChangeLabel = (field: string) => {
  const labels: Record<string, string> = {
    source_id: 'Source',
    mundane_variant_ids: 'Mundane variants',
    default_spell_roll_enabled: 'Default spell roll',
    default_spell_levels: 'Default spell levels',
    default_spell_schools: 'Default spell schools',
    guild_enabled: 'Guild enabled',
    shop_enabled: 'Shop enabled',
    ruling_changed: 'Ruling changed',
    ruling_note: 'Ruling note',
    extra_cost_note: 'Extra cost note',
    legacy_url: 'Legacy URL',
    spell_level: 'Spell level',
    spell_school: 'Spell school',
  }

  return labels[field] ?? field.replaceAll('_', ' ')
}

function ThrowOnRender(): never {
  throw new Error('[test] Error boundary preview — triggered manually from admin settings.')
}

function TestErrorBoundaryButton() {
  const [show, setShow] = useState(false)
  return show ? (
    <FrontendErrorBoundary>
      <ThrowOnRender />
    </FrontendErrorBoundary>
  ) : (
    <Button size="sm" variant="outline" onClick={() => setShow(true)}>
      Preview error boundary
    </Button>
  )
}

export default function Settings({
  discordBackup,
  discordBotSettings,
  sources,
  mundaneVariants,
  compendiumImportRuns,
  legacyCharacterApprovalStats,
  levelProgression,
  levelProgressionVersions,
  levelProgressionUpdateReport,
}: {
  discordBackup: DiscordBackupStats
  discordBotSettings: DiscordBotSettings
  sources: Source[]
  mundaneVariants: MundaneItemVariant[]
  compendiumImportRuns: CompendiumImportRun[]
  legacyCharacterApprovalStats: {
    total_rows: number
    last_imported_at?: string | null
  }
  levelProgression: Array<{
    level: number
    required_bubbles: number
  }>
  levelProgressionVersions: LevelProgressionVersionSummary[]
  levelProgressionUpdateReport?: LevelProgressionUpdateReport | null
}) {
  const t = useTranslate()
  const { errors: pageErrors, botChannelOverride } = usePage<PageProps>().props
  const backupForm = useForm({})
  const deleteForm = useForm({})
  const selectionForm = useForm({
    guilds: [] as { guild_id: string; channel_ids: string[] }[],
  })
  const botSettingsForm = useForm({
    character_approval_channel_id: discordBotSettings.character_approval_channel_id ?? '',
    character_approval_channel_name: discordBotSettings.character_approval_channel_name ?? '',
    character_approval_channel_guild_id: discordBotSettings.character_approval_channel_guild_id ?? '',
    character_retirement_channel_id: discordBotSettings.character_retirement_channel_id ?? '',
    character_retirement_channel_name: discordBotSettings.character_retirement_channel_name ?? '',
    character_retirement_channel_guild_id: discordBotSettings.character_retirement_channel_guild_id ?? '',
    support_ticket_channel_id: discordBotSettings.support_ticket_channel_id ?? '',
    support_ticket_channel_name: discordBotSettings.support_ticket_channel_name ?? '',
    support_ticket_channel_guild_id: discordBotSettings.support_ticket_channel_guild_id ?? '',
  })
  const discordLinePostForm = useForm({
    channel_id: '',
    channel_name: '',
    channel_guild_id: '',
    lines: '',
  })
  const createSourceForm = useForm({
    name: '',
    shortcode: '',
    kind: 'partnered' as Source['kind'],
  })
  const levelProgressionForm = useForm({
    entries: levelProgression.map((entry) => ({
      level: Number(entry.level),
      required_bubbles: Number(entry.required_bubbles),
    })),
  })
  const sourceEditForm = useForm({
    id: 0,
    name: '',
    shortcode: '',
    kind: 'partnered' as Source['kind'],
  })
  const [selectedByGuild, setSelectedByGuild] = useState<Record<string, string[]>>(
    discordBackup.selected_channels ?? {}
  )
  const [syncingChannelId, setSyncingChannelId] = useState<string | null>(null)
  const [backupStatus, setBackupStatus] = useState<DiscordBackupStatus | null>(null)
  const statusIntervalRef = useRef<number | null>(null)
  const fetchBackupStatusRef = useRef<(showToast: boolean) => Promise<void>>(async () => {})
  const levelProgressionSyncKeyRef = useRef<string>('')
  const sourceEditSyncKeyRef = useRef<string>('')
  const [editingSource, setEditingSource] = useState<Source | null>(null)
  const [isSourceManagerOpen, setIsSourceManagerOpen] = useState(false)
  const [importEntityType, setImportEntityType] = useState<'items' | 'spells' | 'sources'>('items')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importOverrideMissing, setImportOverrideMissing] = useState(false)
  const [showNewPreviewRows, setShowNewPreviewRows] = useState(true)
  const [showUpdatedPreviewRows, setShowUpdatedPreviewRows] = useState(true)
  const [showUnchangedPreviewRows, setShowUnchangedPreviewRows] = useState(false)
  const [showDeletedPreviewRows, setShowDeletedPreviewRows] = useState(true)
  const [showInvalidPreviewRows, setShowInvalidPreviewRows] = useState(true)
  const [importPreviewSearch, setImportPreviewSearch] = useState('')
  const [importBusy, setImportBusy] = useState(false)
  const [applyBusy, setApplyBusy] = useState(false)
  const [importPreview, setImportPreview] = useState<{
    preview_token: string
    entity_type: 'items' | 'spells' | 'sources'
    override_missing: boolean
    filename: string
    summary: {
      total_rows: number
      new_rows: number
      updated_rows: number
      deleted_rows: number
      unchanged_rows: number
      invalid_rows: number
    }
    row_samples: Array<{
      line?: number | null
      action: 'new' | 'updated' | 'unchanged' | 'deleted'
      payload: Record<string, string | number | boolean | null>
      source_shortcode?: string
      existing_id?: number | null
      changes?: Record<
        string,
        {
          from: string | number | boolean | null | string[] | number[]
          to: string | number | boolean | null | string[] | number[]
        }
      >
    }>
    error_samples: Array<{ line?: number; message?: string }>
  } | null>(null)
  const [legacyImportFile, setLegacyImportFile] = useState<File | null>(null)
  const [legacyImportBusy, setLegacyImportBusy] = useState(false)
  const [legacyApplyBusy, setLegacyApplyBusy] = useState(false)
  const [legacyImportPreview, setLegacyImportPreview] = useState<LegacyCharacterApprovalImportPreview | null>(null)
  const levelProgressionStepValues = useMemo(
    () => buildLevelProgressionStepValues(levelProgressionForm.data.entries),
    [levelProgressionForm.data.entries]
  )
  const levelProgressionColumns = useMemo(
    () => [
      levelProgressionForm.data.entries.slice(0, 10),
      levelProgressionForm.data.entries.slice(10, 20),
    ],
    [levelProgressionForm.data.entries]
  )
  const formattedLevelProgressionVersionTimestamp = useCallback((value?: string | null) => {
    if (!value) {
      return 'Unknown time'
    }

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return value
    }

    return new Intl.DateTimeFormat('de-DE', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date)
  }, [])

  useEffect(() => {
    const syncKey = JSON.stringify(levelProgression)

    if (levelProgressionSyncKeyRef.current === syncKey) {
      return
    }

    levelProgressionSyncKeyRef.current = syncKey

    levelProgressionForm.setData('entries', levelProgression.map((entry) => ({
      level: Number(entry.level),
      required_bubbles: Number(entry.required_bubbles),
    })))
  }, [levelProgression, levelProgressionForm])

  fetchBackupStatusRef.current = async (showToast: boolean) => {
    const csrfToken = getCsrfToken()
    if (!csrfToken) {
      if (showToast) toast.show('Missing CSRF token.', 'error')
      return
    }

    try {
      const response = await fetch(route('admin.settings.backup.status'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify({}),
      })

      const payload = await response.json()
      if (!response.ok) {
        if (showToast) {
          toast.show(String(payload?.error ?? 'Status could not be loaded.'), 'error')
        }
        return
      }

      const configured = payload?.configured
      if (configured === false) {
        setBackupStatus(null)
        return
      }

      const status = payload?.status ?? null
      if (!status || typeof status !== 'object') {
        setBackupStatus(null)
        return
      }
      setBackupStatus(status as DiscordBackupStatus)
    } catch {
      if (showToast) {
        toast.show('Status could not be loaded.', 'error')
      }
    }
  }

  useEffect(() => {
    setSelectedByGuild(discordBackup.selected_channels ?? {})
  }, [discordBackup.selected_channels])

  useEffect(() => {
    void fetchBackupStatusRef.current(false)

    return () => {
      if (statusIntervalRef.current !== null) {
        window.clearInterval(statusIntervalRef.current)
        statusIntervalRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!backupStatus?.running) {
      if (statusIntervalRef.current !== null) {
        window.clearInterval(statusIntervalRef.current)
        statusIntervalRef.current = null
      }
      return
    }

    if (statusIntervalRef.current !== null) return

    statusIntervalRef.current = window.setInterval(() => {
      void fetchBackupStatusRef.current(false)
    }, 5000)

    return () => {
      if (statusIntervalRef.current !== null) {
        window.clearInterval(statusIntervalRef.current)
        statusIntervalRef.current = null
      }
    }
  }, [backupStatus?.running])

  const selectedChannelDetails = useMemo(
    () => discordBackup.selected_channels_details ?? {},
    [discordBackup.selected_channels_details]
  )

  const mergedChannelGroups = useMemo(() => {
    const merged: Record<string, DiscordBackupChannel[]> = {}
    const guildIds = new Set<string>([
      ...Object.keys(selectedChannelDetails),
      ...Object.keys(selectedByGuild),
    ])

    guildIds.forEach((guildId) => {
      const channelMap = new Map<string, DiscordBackupChannel>()
      ;(selectedChannelDetails[guildId] ?? []).forEach((channel) => {
        if (!channelMap.has(channel.id)) {
          channelMap.set(channel.id, channel)
        }
      })
      ;(selectedByGuild[guildId] ?? []).forEach((channelId) => {
        if (!channelMap.has(channelId)) {
          channelMap.set(channelId, {
            id: channelId,
            guild_id: guildId,
            name: channelId,
            type: 'GuildText',
            parent_id: null,
            is_thread: false,
          })
        }
      })
      merged[guildId] = Array.from(channelMap.values())
    })

    return merged
  }, [selectedChannelDetails, selectedByGuild])

  const isChannelSelected = (guildId: string, channelId: string) =>
    (selectedByGuild[guildId] ?? []).includes(channelId)

  const toggleChannel = (guildId: string, channelId: string) => {
    setSelectedByGuild((current) => {
      const existing = new Set(current[guildId] ?? [])
      if (existing.has(channelId)) {
        existing.delete(channelId)
      } else {
        existing.add(channelId)
      }
      return { ...current, [guildId]: Array.from(existing) }
    })
  }

  const handleSaveSelection = () => {
    const guilds = Object.entries(selectedByGuild).map(([guild_id, channel_ids]) => ({
      guild_id,
      channel_ids,
    }))

    selectionForm.transform(() => ({ guilds }))
    selectionForm.patch(route('admin.settings.backup.channels.update'), {
      preserveScroll: true,
      onSuccess: () => {
        toast.show('Backup channels saved.', 'info')
      },
      onError: () => {
        toast.show('Backup channels could not be saved.', 'error')
      },
    })
  }

  const handleAddChannels = useCallback(
    (
      selection:
        | { guild_id: string; channel_ids: string[] }[]
        | DiscordBackupChannel
        | null
    ) => {
      if (!selection) return

      const normalized = Array.isArray(selection)
        ? selection
        : [{ guild_id: selection.guild_id, channel_ids: [selection.id] }]

      setSelectedByGuild((current) => {
        const next = { ...current }
        normalized.forEach((entry) => {
          const existing = new Set(next[entry.guild_id] ?? [])
          entry.channel_ids.forEach((id) => existing.add(id))
          next[entry.guild_id] = Array.from(existing)
        })
        return next
      })

      toast.show('Channels added.', 'info')
    },
    [],
  )

  const handleBackupStart = () => {
    backupForm.post(route('admin.settings.backup.store'), {
      preserveScroll: true,
      onSuccess: () => {
        toast.show('Discord backup started.', 'info')
        void fetchBackupStatusRef.current(false)
      },
      onError: (formErrors) => {
        const message = formErrors?.discord_backup ? String(formErrors.discord_backup) : ''
        if (message.toLowerCase().includes('backup already running')) {
          toast.show('Backup already running.', 'info')
          void fetchBackupStatusRef.current(false)
          return
        }

        toast.show('Discord backup could not be started.', 'error')
        void fetchBackupStatusRef.current(false)
      },
    })
  }

  const handleBackupDelete = () => {
    if (!window.confirm('Delete Discord backup?')) {
      return
    }

    deleteForm.delete(route('admin.settings.backup.destroy'), {
      preserveScroll: true,
      onSuccess: () => {
        toast.show('Discord backup deleted.', 'info')
      },
      onError: () => {
        toast.show('Discord backup could not be deleted.', 'error')
      },
    })
  }

  const lastSyncedLabel = backupStatus?.running
    ? backupStatus?.started_at
      ? `Running since ${new Date(backupStatus.started_at).toLocaleString()}`
      : 'Backup running...'
    : backupStatus?.finished_at
      ? new Date(backupStatus.finished_at).toLocaleString()
      : discordBackup.last_synced_at
        ? new Date(discordBackup.last_synced_at).toLocaleString()
        : 'Never'

  const backupProgressMax = backupStatus?.total_channels ?? 0
  const backupProgressValue = backupStatus?.processed_channels ?? 0
  const backupProgressLabel =
    backupProgressMax > 0
      ? `${backupProgressValue}/${backupProgressMax} Channels`
      : backupStatus?.running
        ? 'Backup running...'
        : 'No active backup'
  const isBackupRunning = backupStatus?.running ?? false

  const formatTimestamp = useCallback((value?: string | null) => {
    if (!value) return 'Never'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return 'Never'
    return parsed.toLocaleString()
  }, [])

  const handleChannelSync = useCallback(
    async (channel: DiscordBackupChannel) => {
      if (syncingChannelId) return
      const csrfToken = getCsrfToken()
      if (!csrfToken) {
        toast.show('Missing CSRF token.', 'error')
        return
      }

      setSyncingChannelId(channel.id)

      try {
        const response = await fetch(route('admin.settings.backup.channels.sync', channel.id), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRF-TOKEN': csrfToken,
          },
          credentials: 'same-origin',
          body: JSON.stringify({}),
        })

        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          if (response.status === 429 && payload?.retry_after_ms) {
            const seconds = Math.max(1, Math.ceil(Number(payload.retry_after_ms) / 1000))
            toast.show(`Wait ${seconds}s before syncing again.`, 'info')
            return
          }

          toast.show(String(payload?.error ?? 'Channel sync failed.'), 'error')
          return
        }

        toast.show('Channel sync started.', 'info')
        void fetchBackupStatusRef.current(false)
        router.reload({ only: ['discordBackup'] })
      } catch {
        toast.show('Channel sync failed.', 'error')
      } finally {
        setSyncingChannelId(null)
      }
    },
    [syncingChannelId],
  )

  const selectedChannelsFlat = useMemo(() => {
    const selected = new Map<string, DiscordBackupChannel>()
    const lookup = new Map<string, DiscordBackupChannel>()

    Object.values(mergedChannelGroups).forEach((channels) => {
      channels.forEach((channel) => {
        lookup.set(channel.id, channel)
      })
    })

    Object.entries(selectedByGuild).forEach(([guildId, channelIds]) => {
      channelIds.forEach((channelId) => {
        if (selected.has(channelId)) return
        const channel = lookup.get(channelId)
        selected.set(channelId, channel ?? {
          id: channelId,
          guild_id: guildId,
          name: channelId,
          type: 'GuildText',
          parent_id: null,
          is_thread: false,
        })
      })
    })

    return Array.from(selected.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [mergedChannelGroups, selectedByGuild])
  const hasBackupSelection = selectedChannelsFlat.length > 0

  const handleBotSettingsSave = () => {
    botSettingsForm.patch(route('admin.settings.bot.update'), {
      preserveScroll: true,
      onSuccess: () => {
        toast.show('Bot settings saved.', 'info')
      },
      onError: () => {
        toast.show('Bot settings could not be saved.', 'error')
      },
    })
  }

  const updateLevelProgressionEntry = (index: number, value: string) => {
    const nextValue = Number(value)
    const nextSteps = [...levelProgressionStepValues]
    nextSteps[index] = Math.max(1, Number.isFinite(nextValue) ? Math.floor(nextValue) : 1)

    levelProgressionForm.setData('entries', buildLevelProgressionEntriesFromSteps(nextSteps))
  }

  const handleLevelProgressionSave = () => {
    levelProgressionForm.patch(route('admin.settings.level-progression.update'), {
      preserveScroll: true,
      onSuccess: () => {
        toast.show('Level progression saved.', 'info')
      },
      onError: () => {
        toast.show('Level progression could not be saved.', 'error')
      },
    })
  }

  useEffect(() => {
    if (!editingSource) {
      sourceEditSyncKeyRef.current = ''
      return
    }

    const syncKey = JSON.stringify({
      id: editingSource.id,
      name: editingSource.name,
      shortcode: editingSource.shortcode,
      kind: editingSource.kind,
    })

    if (sourceEditSyncKeyRef.current === syncKey) {
      return
    }

    sourceEditSyncKeyRef.current = syncKey

    sourceEditForm.setData({
      id: editingSource.id,
      name: editingSource.name,
      shortcode: editingSource.shortcode,
      kind: editingSource.kind,
    })
  }, [editingSource, sourceEditForm])

  const handleSourceCreate = () => {
    createSourceForm.post(route('admin.settings.sources.store'), {
      preserveScroll: true,
      onSuccess: () => {
        createSourceForm.reset()
        toast.show('Source created.', 'info')
      },
      onError: () => {
        toast.show('Source could not be created.', 'error')
      },
    })
  }

  const handleSourceUpdate = () => {
    sourceEditForm.patch(route('admin.settings.sources.update', sourceEditForm.data.id), {
      preserveScroll: true,
      onSuccess: () => {
        setEditingSource(null)
        sourceEditForm.reset()
        toast.show('Source updated.', 'info')
      },
      onError: () => {
        toast.show('Source could not be updated.', 'error')
      },
    })
  }

  const handleSourceDelete = (source: Source) => {
    if (!window.confirm(`Delete source ${source.shortcode}?`)) {
      return
    }

    router.delete(route('admin.settings.sources.destroy', source.id), {
      preserveScroll: true,
      onSuccess: () => {
        if (editingSource?.id === source.id) {
          setEditingSource(null)
          sourceEditForm.reset()
        }
        toast.show('Source deleted.', 'info')
      },
      onError: () => {
        toast.show('Source could not be deleted.', 'error')
      },
    })
  }

  const handleCloseSourceManager = () => {
    setIsSourceManagerOpen(false)
    setEditingSource(null)
    sourceEditForm.reset()
  }

  const handlePreviewImport = useCallback(async () => {
    if (!importFile) {
      toast.show('Select a CSV file first.', 'error')
      return
    }

    const csrfToken = getCsrfToken()
    if (!csrfToken) {
      toast.show('Missing CSRF token.', 'error')
      return
    }

    const formData = new FormData()
    formData.append('entity_type', importEntityType)
    formData.append('file', importFile)
    formData.append('override_missing', importOverrideMissing ? '1' : '0')

    setImportBusy(true)
    try {
      const response = await fetch(route('admin.settings.compendium.preview'), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'same-origin',
        body: formData,
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.show(String(payload?.message ?? 'Preview failed.'), 'error')
        return
      }

      setImportPreview(payload)
      setShowNewPreviewRows(true)
      setShowUpdatedPreviewRows(true)
      setShowUnchangedPreviewRows(false)
      setShowDeletedPreviewRows(true)
      setShowInvalidPreviewRows(true)
      setImportPreviewSearch('')
      toast.show('Preview ready.', 'info')
    } catch {
      toast.show('Preview failed.', 'error')
    } finally {
      setImportBusy(false)
    }
  }, [importEntityType, importFile, importOverrideMissing])

  const handleApplyImport = useCallback(async () => {
    if (!importPreview?.preview_token) {
      toast.show('Run preview first.', 'error')
      return
    }

    if (importPreview.override_missing) {
      const confirmed = window.confirm(
        buildCompendiumOverrideConfirmMessage(importPreview.entity_type, importPreview.summary.deleted_rows)
      )

      if (!confirmed) {
        return
      }
    }

    const csrfToken = getCsrfToken()
    if (!csrfToken) {
      toast.show('Missing CSRF token.', 'error')
      return
    }

    setApplyBusy(true)
    try {
      const response = await fetch(route('admin.settings.compendium.apply'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify({ preview_token: importPreview.preview_token }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.show(String(payload?.message ?? 'Import apply failed.'), 'error')
        return
      }

      setImportPreview(null)
      setImportFile(null)
      toast.show('Import applied.', 'info')
      router.reload({ only: ['compendiumImportRuns'] })
    } catch {
      toast.show('Import apply failed.', 'error')
    } finally {
      setApplyBusy(false)
    }
  }, [importPreview])

  const handlePreviewLegacyImport = useCallback(async () => {
    if (!legacyImportFile) {
      toast.show('Select the legacy CSV file first.', 'error')
      return
    }

    const csrfToken = getCsrfToken()
    if (!csrfToken) {
      toast.show('Missing CSRF token.', 'error')
      return
    }

    const formData = new FormData()
    formData.append('file', legacyImportFile)

    setLegacyImportBusy(true)
    try {
      const response = await fetch(route('admin.settings.legacy-character-approvals.preview'), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'same-origin',
        body: formData,
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.show(String(payload?.message ?? 'Legacy preview failed.'), 'error')
        return
      }

      setLegacyImportPreview(payload as LegacyCharacterApprovalImportPreview)
      toast.show('Legacy preview ready.', 'info')
    } catch {
      toast.show('Legacy preview failed.', 'error')
    } finally {
      setLegacyImportBusy(false)
    }
  }, [legacyImportFile])

  const handleApplyLegacyImport = useCallback(async () => {
    if (!legacyImportPreview?.preview_token) {
      toast.show('Run the legacy preview first.', 'error')
      return
    }

    const csrfToken = getCsrfToken()
    if (!csrfToken) {
      toast.show('Missing CSRF token.', 'error')
      return
    }

    setLegacyApplyBusy(true)
    try {
      const response = await fetch(route('admin.settings.legacy-character-approvals.apply'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify({ preview_token: legacyImportPreview.preview_token }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.show(String(payload?.message ?? 'Legacy import apply failed.'), 'error')
        return
      }

      setLegacyImportPreview(null)
      setLegacyImportFile(null)
      toast.show('Legacy approvals imported.', 'info')
      router.reload({ only: ['legacyCharacterApprovalStats'] })
    } catch {
      toast.show('Legacy import apply failed.', 'error')
    } finally {
      setLegacyApplyBusy(false)
    }
  }, [legacyImportPreview])

  const sourceById = useMemo(() => {
    return Object.fromEntries(sources.map((source) => [source.id, `${source.shortcode} - ${source.name}`]))
  }, [sources])
  const sourceShortcodeById = useMemo(() => {
    return Object.fromEntries(sources.map((source) => [source.id, source.shortcode]))
  }, [sources])
  const mundaneVariantSlugById = useMemo(() => {
    return Object.fromEntries(mundaneVariants.map((variant) => [variant.id, variant.slug]))
  }, [mundaneVariants])
  const sourceCounts = useMemo(() => {
    const official = sources.filter((source) => source.kind === 'official').length

    return {
      total: sources.length,
      official,
      thirdParty: sources.length - official,
    }
  }, [sources])
  const filteredImportPreviewRows = useMemo(() => {
    if (!importPreview) {
      return []
    }

    const previewRows = [
      ...importPreview.row_samples,
      ...importPreview.error_samples.map((error) => ({
        line: error.line ?? null,
        action: 'invalid' as const,
        message: error.message ?? 'Invalid row',
      })),
    ]

    return previewRows
      .filter((sample) => {
        if (sample.action === 'invalid') {
          return showInvalidPreviewRows
        }

        if (sample.action === 'new') {
          return showNewPreviewRows
        }

        if (sample.action === 'updated') {
          return showUpdatedPreviewRows
        }

        if (sample.action === 'deleted') {
          return showDeletedPreviewRows
        }

        return showUnchangedPreviewRows
      })
      .sort((left, right) => {
        const leftLine = typeof left.line === 'number' ? left.line : Number.POSITIVE_INFINITY
        const rightLine = typeof right.line === 'number' ? right.line : Number.POSITIVE_INFINITY

        if (leftLine !== rightLine) {
          return leftLine - rightLine
        }

        if (left.action === right.action) {
          return 0
        }

        if (left.action === 'invalid') {
          return -1
        }

        if (right.action === 'invalid') {
          return 1
        }

        return 0
      })
  }, [
    importPreview,
    showDeletedPreviewRows,
    showInvalidPreviewRows,
    showNewPreviewRows,
    showUpdatedPreviewRows,
    showUnchangedPreviewRows,
  ])

  const formatCompendiumChangeValue = useCallback((
    field: string,
    value: string | number | boolean | null | string[] | number[] | undefined
  ) => {
    if (field === 'source_id') {
      const sourceId = typeof value === 'number' ? value : Number(value)

      if (Number.isFinite(sourceId) && sourceShortcodeById[sourceId]) {
        return sourceShortcodeById[sourceId]
      }

      return 'none'
    }

    if (field === 'mundane_variant_ids') {
      const ids = Array.isArray(value) ? value : []
      const slugs = ids
        .map((entry) => {
          const variantId = typeof entry === 'number' ? entry : Number(entry)
          return Number.isFinite(variantId) ? mundaneVariantSlugById[variantId] : null
        })
        .filter((entry): entry is string => Boolean(entry))

      return slugs.length > 0 ? slugs.join(', ') : 'none'
    }

    if (field === 'default_spell_levels' || field === 'default_spell_schools') {
      if (!Array.isArray(value) || value.length === 0) {
        return 'none'
      }

      return value.join(', ')
    }

    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : 'none'
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false'
    }

    if (value === null || value === undefined || value === '') {
      return 'none'
    }

    return String(value)
  }, [mundaneVariantSlugById, sourceShortcodeById])

  const searchedImportPreviewRows = useMemo(() => {
    const searchTerm = importPreviewSearch.trim().toLowerCase()

    if (searchTerm === '' || !importPreview) {
      return filteredImportPreviewRows
    }

    return filteredImportPreviewRows.filter((sample) => {
      if (sample.action === 'invalid') {
        const invalidHaystack = [
          typeof sample.line === 'number' ? `line ${sample.line}` : '',
          sample.message ?? '',
        ]
          .join(' ')
          .toLowerCase()

        return invalidHaystack.includes(searchTerm)
      }

      const sourceId = typeof sample.payload?.source_id === 'number'
        ? sample.payload.source_id
        : Number(sample.payload?.source_id)
      const sourceLabel = Number.isFinite(sourceId) && sourceById[sourceId]
        ? sourceById[sourceId]
        : sample.source_shortcode
      const previewLabel = getCompendiumPreviewTitle(importPreview.entity_type, sample.payload, sourceLabel)
      const previewChanges = sample.changes ? Object.entries(sample.changes) : []
      const changeHaystack = previewChanges
        .flatMap(([field, change]) => ([
          getCompendiumChangeLabel(field),
          formatCompendiumChangeValue(field, change.from),
          formatCompendiumChangeValue(field, change.to),
        ]))
        .join(' ')

      const searchableText = [
        typeof sample.line === 'number' ? `line ${sample.line}` : '',
        sample.action,
        previewLabel.title,
        previewLabel.details,
        sourceLabel,
        changeHaystack,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return searchableText.includes(searchTerm)
    })
  }, [
    filteredImportPreviewRows,
    formatCompendiumChangeValue,
    importPreview,
    importPreviewSearch,
    sourceById,
  ])

  const approvalChannelLabel = useMemo(() => {
    if (botSettingsForm.data.character_approval_channel_name) {
      return botSettingsForm.data.character_approval_channel_name
    }
    if (botSettingsForm.data.character_approval_channel_id) {
      return botSettingsForm.data.character_approval_channel_id
    }
    return 'Not configured'
  }, [
    botSettingsForm.data.character_approval_channel_id,
    botSettingsForm.data.character_approval_channel_name,
  ])

  const supportTicketChannelLabel = useMemo(() => {
    if (botSettingsForm.data.support_ticket_channel_name) {
      return botSettingsForm.data.support_ticket_channel_name
    }
    if (botSettingsForm.data.support_ticket_channel_id) {
      return botSettingsForm.data.support_ticket_channel_id
    }
    return 'Not configured'
  }, [
    botSettingsForm.data.support_ticket_channel_id,
    botSettingsForm.data.support_ticket_channel_name,
  ])

  const retirementChannelLabel = useMemo(() => {
    if (botSettingsForm.data.character_retirement_channel_name) {
      return botSettingsForm.data.character_retirement_channel_name
    }
    if (botSettingsForm.data.character_retirement_channel_id) {
      return botSettingsForm.data.character_retirement_channel_id
    }
    return 'Not configured'
  }, [
    botSettingsForm.data.character_retirement_channel_id,
    botSettingsForm.data.character_retirement_channel_name,
  ])

  const discordLinePostTargetLabel = useMemo(() => {
    if (discordLinePostForm.data.channel_name) {
      return discordLinePostForm.data.channel_name
    }
    if (discordLinePostForm.data.channel_id) {
      return discordLinePostForm.data.channel_id
    }
    return 'Not selected'
  }, [discordLinePostForm.data.channel_id, discordLinePostForm.data.channel_name])

  const discordLinePostCount = useMemo(() => {
    return discordLinePostForm.data.lines
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .length
  }, [discordLinePostForm.data.lines])

  const discordLinePostRequestError = discordLinePostForm.errors['discord_line_post' as keyof typeof discordLinePostForm.errors]

  type BotChannelSelection =
    | DiscordBackupChannel
    | null
    | { guild_id: string; channel_ids: string[] }[]

  const handleApprovalChannelSelect = useCallback(
    (selection: BotChannelSelection) => {
      if (!selection || Array.isArray(selection)) return
      botSettingsForm.setData('character_approval_channel_id', selection.id)
      botSettingsForm.setData('character_approval_channel_name', selection.name)
      botSettingsForm.setData('character_approval_channel_guild_id', selection.guild_id)
    },
    [botSettingsForm],
  )

  const handleApprovalChannelClear = useCallback(() => {
    botSettingsForm.setData('character_approval_channel_id', '')
    botSettingsForm.setData('character_approval_channel_name', '')
    botSettingsForm.setData('character_approval_channel_guild_id', '')
  }, [botSettingsForm])

  const handleSupportTicketChannelSelect = useCallback(
    (selection: BotChannelSelection) => {
      if (!selection || Array.isArray(selection)) return
      botSettingsForm.setData('support_ticket_channel_id', selection.id)
      botSettingsForm.setData('support_ticket_channel_name', selection.name)
      botSettingsForm.setData('support_ticket_channel_guild_id', selection.guild_id)
    },
    [botSettingsForm],
  )

  const handleSupportTicketChannelClear = useCallback(() => {
    botSettingsForm.setData('support_ticket_channel_id', '')
    botSettingsForm.setData('support_ticket_channel_name', '')
    botSettingsForm.setData('support_ticket_channel_guild_id', '')
  }, [botSettingsForm])

  const handleRetirementChannelSelect = useCallback(
    (selection: BotChannelSelection) => {
      if (!selection || Array.isArray(selection)) return
      botSettingsForm.setData('character_retirement_channel_id', selection.id)
      botSettingsForm.setData('character_retirement_channel_name', selection.name)
      botSettingsForm.setData('character_retirement_channel_guild_id', selection.guild_id)
    },
    [botSettingsForm],
  )

  const handleRetirementChannelClear = useCallback(() => {
    botSettingsForm.setData('character_retirement_channel_id', '')
    botSettingsForm.setData('character_retirement_channel_name', '')
    botSettingsForm.setData('character_retirement_channel_guild_id', '')
  }, [botSettingsForm])

  const handleDiscordLinePostTargetSelect = useCallback(
    (selection: BotChannelSelection) => {
      if (!selection || Array.isArray(selection)) return
      discordLinePostForm.setData('channel_id', selection.id)
      discordLinePostForm.setData('channel_name', selection.name)
      discordLinePostForm.setData('channel_guild_id', selection.guild_id)
    },
    [discordLinePostForm],
  )

  const handleDiscordLinePostTargetClear = useCallback(() => {
    discordLinePostForm.setData('channel_id', '')
    discordLinePostForm.setData('channel_name', '')
    discordLinePostForm.setData('channel_guild_id', '')
  }, [discordLinePostForm])

  const handleDiscordLinePost = useCallback(() => {
    discordLinePostForm.post(route('admin.settings.discord.line-post'), {
      preserveScroll: true,
      onSuccess: () => {
        toast.show(
          `${discordLinePostCount} ${discordLinePostCount === 1 ? 'line' : 'lines'} posted to Discord.`,
          'info'
        )
        discordLinePostForm.setData('lines', '')
        discordLinePostForm.clearErrors()
      },
      onError: (errors) => {
        const requestError = errors['discord_line_post' as keyof typeof errors]
        const message = String(requestError ?? errors.lines ?? errors.channel_id ?? 'Lines could not be posted.')
        toast.show(message, 'error')
      },
    })
  }, [discordLinePostCount, discordLinePostForm])

  return (
    <AppLayout>
      <Head title="Settings" />
      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-6">
        <section className="flex flex-col gap-2 border-b pb-4">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-base-content/70">
            Manage Discord settings for the guild.
          </p>
        </section>
        <div className="rounded-box bg-base-100 shadow-md p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/60">
                <span className="rounded-full border border-base-200 px-2 py-1">Channels: {discordBackup.channels}</span>
                <span className="rounded-full border border-base-200 px-2 py-1">Messages: {discordBackup.messages}</span>
                <span className="rounded-full border border-base-200 px-2 py-1">
                  Attachments: {discordBackup.attachments}
                </span>
                <span className="rounded-full border border-base-200 px-2 py-1">
                  Selected: {selectedChannelsFlat.length}
                </span>
                <span className="rounded-full border border-base-200 px-2 py-1">
                  Last backup: {lastSyncedLabel}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleBackupStart}
                disabled={backupForm.processing || isBackupRunning || !hasBackupSelection}
              >
                Start backup
              </Button>
              <ActionMenu
                items={[
                  {
                    label: 'Open handbook',
                    onSelect: () => router.get(route('handbook.index')),
                  },
                  {
                    label: 'Delete backup',
                    onSelect: handleBackupDelete,
                    tone: 'error',
                  },
                ]}
              />
              <Modal>
                <ModalTrigger>
                  <Button size="sm" variant="outline" modifier="square" aria-label="Configure backup">
                    <SettingsIcon size={16} />
                  </Button>
                </ModalTrigger>
                <ModalTitle>{t('compendium.backupSettings')}</ModalTitle>
                <ModalContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{t('compendium.selectedChannels')}</p>
                      <DiscordChannelPickerModal
                        title={t('compendium.addBackupChannels')}
                        description={t('compendium.backupChannelsDescription')}
                        confirmLabel={t('compendium.addChannels')}
                        channelsRouteName="admin.settings.backup.channels.refresh"
                        excludedByGuild={selectedByGuild}
                        onConfirm={handleAddChannels}
                      >
                        {t('compendium.addChannels')}
                      </DiscordChannelPickerModal>
                    </div>
                    {selectedChannelsFlat.length === 0 ? (
                      <p className="text-xs text-base-content/70">{t('compendium.noChannelsSelected')}</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {selectedChannelsFlat.map((channel) => (
                          <div key={channel.id} className="flex items-center gap-2 text-sm">
                            <label className="flex flex-1 items-center gap-2">
                              <input
                                type="checkbox"
                                className="checkbox checkbox-xs"
                                checked={isChannelSelected(channel.guild_id, channel.id)}
                                onChange={() => toggleChannel(channel.guild_id, channel.id)}
                              />
                              <span className="truncate">{channel.name}</span>
                            </label>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-base-content/60">
                                {formatTimestamp(channel.last_synced_at)}
                              </span>
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => void handleChannelSync(channel)}
                                disabled={isBackupRunning || syncingChannelId === channel.id}
                              >
                                {syncingChannelId === channel.id ? t('compendium.syncing') : t('compendium.sync')}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" onClick={handleSaveSelection} disabled={selectionForm.processing}>
                        {t('compendium.saveSelection')}
                      </Button>
                    </div>
                  </div>
                </ModalContent>
              </Modal>
            </div>
          </div>
          {backupStatus ? (
            <div className="mt-4 rounded-box border border-base-200 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-base-content/70">
                  {backupStatus.running ? 'Backup running' : 'Backup status'}
                </span>
                <span className="font-semibold">{backupProgressLabel}</span>
              </div>
              <div className="mt-2">
                <Progress
                  className="progress-info"
                  value={backupProgressValue}
                  max={backupProgressMax > 0 ? backupProgressMax : 1}
                />
              </div>
              {backupStatus.running && backupStatus.current_channel ? (
                <p className="mt-2 text-[11px] text-base-content/60">
                  Current: {backupStatus.current_channel.name}
                </p>
              ) : null}
            </div>
          ) : null}
          {pageErrors?.discord_backup &&
          !String(pageErrors.discord_backup).toLowerCase().includes('backup already running') ? (
            <p className="mt-2 text-xs text-error">{pageErrors.discord_backup}</p>
          ) : null}
          {!hasBackupSelection ? (
            <div className="mt-3 rounded-box border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
              Select at least one channel before starting a backup.
            </div>
          ) : null}
        </div>
        <div className="rounded-box bg-base-100 shadow-md p-3">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Compendium sources</h2>
            <p className="text-xs text-base-content/60">
              Manage source books used by items and spells.
            </p>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-base-200 px-3 py-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-base-200 px-2 py-1">
                Total: {sourceCounts.total}
              </span>
              <span className="rounded-full border border-success/30 px-2 py-1 text-success">
                WotC: {sourceCounts.official}
              </span>
              <span className="rounded-full border border-warning/30 px-2 py-1 text-warning">
                3rd party: {sourceCounts.thirdParty}
              </span>
            </div>
            <Button size="sm" variant="outline" onClick={() => setIsSourceManagerOpen(true)}>
              Manage sources
            </Button>
          </div>
          <Modal wide isOpen={isSourceManagerOpen} onClose={handleCloseSourceManager}>
            <ModalTitle>Compendium sources</ModalTitle>
            <ModalContent>
              <div className="space-y-4">
                <p className="text-xs text-base-content/60">
                  Manage source books used by items and spells.
                </p>
                <div className="grid gap-3 lg:grid-cols-[1fr_180px_220px_auto] lg:items-end">
                  <Input
                    value={editingSource ? sourceEditForm.data.name : createSourceForm.data.name}
                    onChange={(event) => {
                      if (editingSource) {
                        sourceEditForm.setData('name', event.target.value)
                      } else {
                        createSourceForm.setData('name', event.target.value)
                      }
                    }}
                    errors={editingSource ? sourceEditForm.errors.name : createSourceForm.errors.name}
                    placeholder="Player's Handbook"
                  >
                    {t('compendium.sourceName')}
                  </Input>
                  <Input
                    value={editingSource ? sourceEditForm.data.shortcode : createSourceForm.data.shortcode}
                    onChange={(event) => {
                      if (editingSource) {
                        sourceEditForm.setData('shortcode', event.target.value)
                      } else {
                        createSourceForm.setData('shortcode', event.target.value)
                      }
                    }}
                    errors={editingSource ? sourceEditForm.errors.shortcode : createSourceForm.errors.shortcode}
                    placeholder="PHB"
                  >
                    {t('compendium.shortcode')}
                  </Input>
                  <Select
                    value={editingSource ? sourceEditForm.data.kind : createSourceForm.data.kind}
                    onChange={(event) => {
                      if (editingSource) {
                        sourceEditForm.setData('kind', event.target.value as Source['kind'])
                      } else {
                        createSourceForm.setData('kind', event.target.value as Source['kind'])
                      }
                    }}
                    errors={editingSource ? sourceEditForm.errors.kind : createSourceForm.errors.kind}
                  >
                    <SelectLabel>{t('compendium.sourceKind')}</SelectLabel>
                    <SelectOptions>
                      <option value="official">{t('compendium.officialSource')}</option>
                      <option value="partnered">{t('compendium.thirdPartySource')}</option>
                    </SelectOptions>
                  </Select>
                  <div className="flex items-center justify-end gap-2">
                    {editingSource ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingSource(null)
                          sourceEditForm.reset()
                        }}
                      >
                        Cancel
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={editingSource ? handleSourceUpdate : handleSourceCreate}
                      disabled={editingSource ? sourceEditForm.processing : createSourceForm.processing}
                    >
                      {editingSource ? t('compendium.saveSource') : t('compendium.addSource')}
                    </Button>
                  </div>
                </div>
                <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
                  {sources.length === 0 ? (
                    <p className="text-xs text-base-content/60">{t('compendium.noSourcesConfigured')}</p>
                  ) : (
                    sources.map((source) => (
                      <div
                        key={source.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-base-200 px-3 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="rounded-full border border-base-300 px-2 py-0.5 text-[10px] uppercase text-base-content/70">
                            {source.shortcode}
                          </span>
                          <span
                            className={cn(
                              'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                              sourceKindBadgeClass(source.kind)
                            )}
                          >
                            {formatSourceKindLabel(source.kind, t)}
                          </span>
                          <span className="truncate text-sm">{source.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="xs" variant="ghost" onClick={() => setEditingSource(source)}>
                            {t('common.edit')}
                          </Button>
                          <Button size="xs" variant="ghost" className="text-error" onClick={() => handleSourceDelete(source)}>
                            {t('common.delete')}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </ModalContent>
          </Modal>
        </div>
        <div className="rounded-box bg-base-100 shadow-md p-3">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Compendium import</h2>
            <p className="text-xs text-base-content/60">
              Upload a CSV, review a compact preview, then apply the import.
            </p>
          </div>
          <div className="mt-3 space-y-3">
            <div className="grid gap-3 lg:grid-cols-[180px_auto] lg:items-end lg:justify-between">
              <label className="form-control">
                <span className="label text-xs">Entity</span>
                <select
                  className="select select-sm w-full"
                  value={importEntityType}
                  onChange={(event) => setImportEntityType(event.target.value as 'items' | 'spells' | 'sources')}
                >
                  <option value="items">Items</option>
                  <option value="spells">Spells</option>
                  <option value="sources">Sources</option>
                </select>
              </label>
              <div className="flex items-end justify-end">
                <Button
                  as="a"
                  size="sm"
                  variant="outline"
                  href={route('admin.settings.compendium.export', { entity_type: importEntityType })}
                >
                  Export {importEntityType}
                </Button>
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
              <label className="form-control">
                <span className="label text-xs">CSV file</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="file-input file-input-bordered file-input-sm w-full"
                  onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                />
              </label>
              <div className="flex items-end justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => void handlePreviewImport()} disabled={importBusy}>
                  {importBusy ? 'Previewing...' : 'Preview import'}
                </Button>
              </div>
            </div>
            <label className="flex items-start gap-3 rounded-lg border border-base-200 px-3 py-2">
              <input
                type="checkbox"
                className="checkbox checkbox-xs mt-0.5"
                checked={importOverrideMissing}
                onChange={(event) => setImportOverrideMissing(event.target.checked)}
              />
              <span className="space-y-1">
                <span className="block text-xs font-semibold text-base-content">Override missing rows</span>
                <span className="block text-xs text-base-content/60">
                  Delete existing {importEntityType} entries not present in this CSV.
                </span>
              </span>
            </label>
          </div>
          {importPreview ? (
            <div className="mt-4 space-y-3 rounded-lg border border-base-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-base-content">Preview</p>
                  <p className="text-xs text-base-content/60">
                    {importPreview.filename} · {importPreview.entity_type}
                  </p>
                </div>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleApplyImport()}
                    disabled={applyBusy || (importPreview.override_missing && importPreview.summary.invalid_rows > 0)}
                  >
                    {applyBusy ? 'Applying...' : 'Apply import'}
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-base-200 px-2 py-1">Rows: {importPreview.summary.total_rows}</span>
                {importPreview.override_missing ? (
                  <span className="rounded-full border border-error/40 px-2 py-1 text-error">Deleted on apply: {importPreview.summary.deleted_rows}</span>
                ) : null}
                <span className="rounded-full border border-base-200 px-2 py-1">Visible: {searchedImportPreviewRows.length}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-base-content/60">Show:</span>
                <label className="flex items-center gap-2 rounded-full border border-success/30 px-2 py-1 text-success">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    checked={showNewPreviewRows}
                    onChange={(event) => setShowNewPreviewRows(event.target.checked)}
                  />
                  New: {importPreview.summary.new_rows}
                </label>
                <label className="flex items-center gap-2 rounded-full border border-warning/30 px-2 py-1 text-warning">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    checked={showUpdatedPreviewRows}
                    onChange={(event) => setShowUpdatedPreviewRows(event.target.checked)}
                  />
                  Updated: {importPreview.summary.updated_rows}
                </label>
                <label className="flex items-center gap-2 rounded-full border border-base-200 px-2 py-1 text-base-content/70">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    checked={showUnchangedPreviewRows}
                    onChange={(event) => setShowUnchangedPreviewRows(event.target.checked)}
                  />
                  Unchanged: {importPreview.summary.unchanged_rows}
                </label>
                {importPreview.override_missing ? (
                  <label className="flex items-center gap-2 rounded-full border border-error/40 px-2 py-1 text-error">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-xs"
                      checked={showDeletedPreviewRows}
                      onChange={(event) => setShowDeletedPreviewRows(event.target.checked)}
                    />
                    Deleted: {importPreview.summary.deleted_rows}
                  </label>
                ) : null}
                <label className="flex items-center gap-2 rounded-full border border-error/40 px-2 py-1 text-error">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    checked={showInvalidPreviewRows}
                    onChange={(event) => setShowInvalidPreviewRows(event.target.checked)}
                  />
                  Invalid: {importPreview.summary.invalid_rows}
                </label>
              </div>
              {importPreview.override_missing ? (
                <p className="text-xs text-warning">
                  Override mode is active. Existing {importPreview.entity_type} entries missing from this import will be removed on apply.
                </p>
              ) : null}
              <div className="max-w-md">
                <Input
                  value={importPreviewSearch}
                  onChange={(event) => setImportPreviewSearch(event.target.value)}
                  placeholder="Search preview rows"
                >
                  Filter rows
                </Input>
              </div>
              <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
                {searchedImportPreviewRows.map((sample, index) => {
                  if (sample.action === 'invalid') {
                    return (
                      <div
                        key={`invalid-${sample.line ?? index}-${index}`}
                        className="rounded-lg border border-error/30 bg-error/5 px-3 py-2"
                      >
                        <div className="flex flex-wrap items-start gap-2">
                          <span className="text-xs font-semibold text-base-content/70">
                            {typeof sample.line === 'number' ? `Line ${sample.line}` : 'Unknown line'}
                          </span>
                          <span
                            className={cn(
                              'rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                              getCompendiumActionBadgeClass(sample.action)
                            )}
                          >
                            {sample.action}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-error">{sample.message}</p>
                      </div>
                    )
                  }

                  const sourceId = typeof sample.payload?.source_id === 'number'
                    ? sample.payload.source_id
                    : Number(sample.payload?.source_id)
                  const sourceLabel = Number.isFinite(sourceId) && sourceById[sourceId]
                    ? sourceById[sourceId]
                    : sample.source_shortcode
                  const previewLabel = getCompendiumPreviewTitle(importPreview.entity_type, sample.payload, sourceLabel)
                  const previewChanges = sample.changes ? Object.entries(sample.changes) : []

                  return (
                    <div
                      key={`${sample.action}-${sample.existing_id ?? 'none'}-${sample.line ?? 'none'}-${index}`}
                      className="rounded-lg border border-base-200 bg-base-100 px-3 py-2"
                    >
                      <div className="space-y-2">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-base-content/70">
                              {typeof sample.line === 'number' ? `Line ${sample.line}` : 'Delete'}
                            </span>
                            <span
                              className={cn(
                                'rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                                getCompendiumActionBadgeClass(sample.action)
                              )}
                            >
                              {sample.action}
                            </span>
                            <p className="min-w-0 flex-1 text-sm font-semibold text-base-content">{previewLabel.title}</p>
                          </div>
                          {previewLabel.details ? (
                            <p className="text-xs text-base-content/60">{previewLabel.details}</p>
                          ) : null}
                        </div>
                        {previewChanges.length > 0 ? (
                          <div className="space-y-0.5 rounded-md bg-base-200/40 px-2.5 py-2 text-xs">
                            {previewChanges.map(([field, change]) => (
                              <div
                                key={field}
                                className="grid gap-x-2 gap-y-0.5 text-base-content/70 sm:grid-cols-[auto_max-content_auto_minmax(0,1fr)] sm:items-start"
                              >
                                <span className="font-semibold text-base-content">{getCompendiumChangeLabel(field)}:</span>
                                <span className="max-w-[18rem] break-all">{formatCompendiumChangeValue(field, change.from)}</span>
                                <span aria-hidden="true" className="hidden text-base-content/50 sm:block">→</span>
                                <span className="break-all font-medium text-base-content">{formatCompendiumChangeValue(field, change.to)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className={cn('pt-0.5 text-xs', sample.action === 'deleted' ? 'text-error' : 'text-base-content/50')}>
                            {sample.action === 'deleted' ? 'Missing from import. Will be removed on apply.' : 'No field changes'}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
                {searchedImportPreviewRows.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-base-300 px-3 py-6 text-center text-sm text-base-content/60">
                    No preview rows match the current filter.
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-base-content/70">Recent imports</p>
            {compendiumImportRuns.length === 0 ? (
              <p className="text-xs text-base-content/60">No imports yet.</p>
            ) : (
              <div className="max-h-72 overflow-auto">
                <table className="table table-xs">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Type</th>
                      <th>File</th>
                      <th>Total</th>
                      <th>New</th>
                      <th>Updated</th>
                      <th>Deleted</th>
                      <th>Unchanged</th>
                      <th>Invalid</th>
                      <th>By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compendiumImportRuns.map((run) => (
                      <tr key={run.id}>
                        <td>{run.applied_at ? new Date(run.applied_at).toLocaleString() : '-'}</td>
                        <td>{run.entity_type}</td>
                        <td>{run.filename}</td>
                        <td>{run.total_rows}</td>
                        <td>{run.new_rows}</td>
                        <td>{run.updated_rows}</td>
                        <td>{run.deleted_rows}</td>
                        <td>{run.unchanged_rows}</td>
                        <td>{run.invalid_rows}</td>
                        <td>{run.user?.name ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <div className="rounded-box bg-base-100 p-3 shadow-md">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Legacy character approvals</h2>
            <p className="text-xs text-base-content/60">
              Import the old guild approval CSV and match current characters by D&amp;D Beyond character id.
            </p>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-base-content/60">
            <span className="rounded-full border border-base-200 px-2 py-1">
              Imported rows: {legacyCharacterApprovalStats.total_rows}
            </span>
            <span className="rounded-full border border-base-200 px-2 py-1">
              Last import: {legacyCharacterApprovalStats.last_imported_at ? new Date(legacyCharacterApprovalStats.last_imported_at).toLocaleString() : 'Never'}
            </span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="form-control">
              <span className="label text-xs">Legacy CSV file</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="file-input file-input-bordered file-input-sm w-full"
                onChange={(event) => setLegacyImportFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => void handlePreviewLegacyImport()} disabled={legacyImportBusy}>
                {legacyImportBusy ? 'Previewing...' : 'Preview legacy CSV'}
              </Button>
            </div>
          </div>
          {legacyImportFile ? (
            <p className="mt-2 text-xs text-base-content/60">
              Selected file: <span className="font-semibold text-base-content">{legacyImportFile.name}</span>
            </p>
          ) : null}
          {legacyImportPreview ? (
            <div className="mt-4 space-y-3 rounded-lg border border-base-200 p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-base-200 px-2 py-1">Rows: {legacyImportPreview.summary.total_rows}</span>
                <span className="rounded-full border border-success/40 px-2 py-1 text-success">New: {legacyImportPreview.summary.new_rows}</span>
                <span className="rounded-full border border-warning/40 px-2 py-1 text-warning">Updated: {legacyImportPreview.summary.updated_rows}</span>
                <span className="rounded-full border border-base-200 px-2 py-1">Unchanged: {legacyImportPreview.summary.unchanged_rows}</span>
                <span className="rounded-full border border-error/40 px-2 py-1 text-error">Invalid: {legacyImportPreview.summary.invalid_rows}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="table table-xs">
                  <thead>
                    <tr>
                      <th>Line</th>
                      <th>Action</th>
                      <th>Character</th>
                      <th>Tier</th>
                      <th>Player</th>
                      <th>Discord</th>
                      <th>Room</th>
                      <th>DDB id</th>
                      <th>Changes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {legacyImportPreview.row_samples.map((sample) => (
                      <tr key={`${sample.line}-${sample.payload.dndbeyond_character_id}`}>
                        <td>{sample.line}</td>
                        <td>{sample.action}</td>
                        <td>{sample.payload.character_name}</td>
                        <td>{sample.payload.tier.toUpperCase()}</td>
                        <td>{sample.payload.player_name ?? '-'}</td>
                        <td>{sample.payload.discord_name ?? '-'}</td>
                        <td>{sample.payload.room ?? '-'}</td>
                        <td>{sample.payload.dndbeyond_character_id}</td>
                        <td>{sample.changes ? Object.keys(sample.changes).join(', ') || '-' : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {legacyImportPreview.error_samples.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-error">Errors</p>
                  {legacyImportPreview.error_samples.map((error, index) => (
                    <p key={`${error.line ?? index}-${index}`} className="text-xs text-error">
                      Line {error.line ?? '-'}: {error.message ?? 'Invalid row'}
                    </p>
                  ))}
                </div>
              ) : null}
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={() => void handleApplyLegacyImport()} disabled={legacyApplyBusy}>
                  {legacyApplyBusy ? 'Applying...' : 'Apply import'}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
        <div className="rounded-box bg-base-100 shadow-md p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">Character approvals</h2>
              <p className="text-xs text-base-content/60">
                Send pending character announcements to a Discord channel.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DiscordChannelPickerModal
                title="Character approval channel"
                description="Select a text channel to receive pending character announcements."
                confirmLabel="Use channel"
                channelsRouteName="admin.settings.backup.channels.refresh"
                mode="single"
                allowedChannelTypes={['GuildText', 'GuildAnnouncement']}
                onConfirm={handleApprovalChannelSelect}
              >
                Select channel
              </DiscordChannelPickerModal>
              {botSettingsForm.data.character_approval_channel_id ? (
                <Button size="sm" variant="ghost" onClick={handleApprovalChannelClear}>
                  Clear
                </Button>
              ) : null}
            </div>
          </div>
          {botChannelOverride?.active && botChannelOverride.channel_id ? (
            <div className="mt-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
              Local channel override active. The bot uses Discord channel <span className="font-semibold">{botChannelOverride.channel_id}</span> for character approvals, retirements, and inbox threads instead of the saved channel settings while developing locally.
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-base-content/60">
            <span>
              Current: <span className="font-semibold text-base-content">{approvalChannelLabel}</span>
            </span>
            {botSettingsForm.errors.character_approval_channel_id ? (
              <span className="text-error">{botSettingsForm.errors.character_approval_channel_id}</span>
            ) : null}
          </div>
          <div className="mt-4 border-t border-base-200 pt-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Character retirements</h3>
                <p className="text-xs text-base-content/60">
                  Post a notice when a player unregisters a character so orga can follow up on items or auction handoff.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <DiscordChannelPickerModal
                  title="Character retirement channel"
                  description="Select a text channel for character retirement notices."
                  confirmLabel="Use channel"
                  channelsRouteName="admin.settings.backup.channels.refresh"
                  mode="single"
                  allowedChannelTypes={['GuildText', 'GuildAnnouncement']}
                  onConfirm={handleRetirementChannelSelect}
                >
                  Select channel
                </DiscordChannelPickerModal>
                {botSettingsForm.data.character_retirement_channel_id ? (
                  <Button size="sm" variant="ghost" onClick={handleRetirementChannelClear}>
                    Clear
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-base-content/60">
              <span>
                Current: <span className="font-semibold text-base-content">{retirementChannelLabel}</span>
              </span>
              {botSettingsForm.errors.character_retirement_channel_id ? (
                <span className="text-error">{botSettingsForm.errors.character_retirement_channel_id}</span>
              ) : null}
            </div>
          </div>
          <div className="mt-4 border-t border-base-200 pt-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Inbox</h3>
                <p className="text-xs text-base-content/60">
                  User DMs to the bot create inbox threads in this channel.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <DiscordChannelPickerModal
                  title="Inbox channel"
                  description="Select a text channel where inbox threads should be created."
                  confirmLabel="Use channel"
                  channelsRouteName="admin.settings.backup.channels.refresh"
                  mode="single"
                  allowedChannelTypes={['GuildText', 'GuildAnnouncement']}
                  onConfirm={handleSupportTicketChannelSelect}
                >
                  Select channel
                </DiscordChannelPickerModal>
                {botSettingsForm.data.support_ticket_channel_id ? (
                  <Button size="sm" variant="ghost" onClick={handleSupportTicketChannelClear}>
                    Clear
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-base-content/60">
              <span>
                Current: <span className="font-semibold text-base-content">{supportTicketChannelLabel}</span>
              </span>
              {botSettingsForm.errors.support_ticket_channel_id ? (
                <span className="text-error">{botSettingsForm.errors.support_ticket_channel_id}</span>
              ) : null}
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button size="sm" variant="outline" onClick={handleBotSettingsSave} disabled={botSettingsForm.processing}>
              Save bot settings
            </Button>
          </div>
        </div>
        <div className="rounded-box bg-base-100 p-3 shadow-md">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Level-Fortschritt</h2>
            <p className="text-xs text-base-content/60">
              Lege fest, wie viele Bubbles ein Level bis zum nächsten braucht. Die Gesamt-Bubbles werden automatisch daraus berechnet.
            </p>
          </div>
          <div className="mt-4 rounded-lg border border-warning/30 bg-warning/8 p-3 text-xs text-base-content/75">
            <p className="font-medium text-base-content">Kurvenwechsel erzeugt immer eine neue Version.</p>
            <p className="mt-1">
              Bestehende Charaktere bleiben auf ihrer bisherigen Kurve. Echte Abenteuer und gesetzte Level bleiben unverändert, bis ein Charakter bewusst auf die neue Kurve wechselt.
            </p>
          </div>
          {levelProgressionUpdateReport ? (
            <div className="mt-4 rounded-lg border border-success/30 bg-success/8 p-3 text-xs text-base-content/75">
              <p className="font-medium text-base-content">Version {levelProgressionUpdateReport.new_version_id} wurde aktiviert.</p>
              <p className="mt-1">
                Bestehende Charaktere bleiben auf ihrer bisherigen Kurve. {levelProgressionUpdateReport.characters_pending_upgrade}{' '}
                Charaktere können jetzt bewusst auf die neue Kurve wechseln.
              </p>
              {levelProgressionUpdateReport.backfill.pseudo_adventures_backfilled > 0 ? (
                <p className="mt-1">
                  Vorher ergänzt: {levelProgressionUpdateReport.backfill.pseudo_adventures_backfilled} fehlende Metadaten bei{' '}
                  {levelProgressionUpdateReport.backfill.characters_affected} Charakteren.
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="mt-4 grid gap-2 lg:grid-cols-3">
            {levelProgressionVersions.map((version) => (
              <div key={version.id} className="rounded-lg border border-base-200 bg-base-100 p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-base-content">Version {version.id}</div>
                  <span className={cn(
                    'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                    version.is_active
                      ? 'border-success/40 bg-success/10 text-success'
                      : 'border-base-200 bg-base-200/40 text-base-content/60'
                  )}>
                    {version.is_active ? 'Aktiv' : 'Archiv'}
                  </span>
                </div>
                <div className="mt-1 text-base-content/60">
                  Erstellt: {formattedLevelProgressionVersionTimestamp(version.created_at)}
                </div>
                <div className="mt-2 text-base-content/70">
                  {version.changed_levels_count > 0 ? `${version.changed_levels_count} geänderte Levels` : 'Ausgangsversion'}
                </div>
                {version.change_samples.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {version.change_samples.map((sample) => (
                      <span key={`${version.id}-${sample.level}`} className="rounded-full border border-base-200 bg-base-200/40 px-2 py-0.5 text-[11px] text-base-content/70">
                        L{sample.level} {sample.delta > 0 ? `+${sample.delta}` : sample.delta}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {levelProgressionColumns.map((columnEntries, columnIndex) => (
              <div key={columnIndex} className="overflow-x-auto rounded-lg border border-base-200">
                <div className="border-b border-base-200 bg-base-200/30 px-4 py-2 text-sm font-medium">
                  {columnIndex === 0 ? 'Level 1-10' : 'Level 11-20'}
                </div>
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Level</th>
                      <th>Bis zum nächsten Level</th>
                      <th className="text-right">Gesamt-Bubbles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {columnEntries.map((entry) => {
                      const index = entry.level - 1
                      const stepValue = levelProgressionStepValues[index]
                      const highlightCapBoundary = entry.level === 10 || entry.level === 11

                      return (
                        <tr key={entry.level} className={highlightCapBoundary ? 'bg-warning/5' : undefined}>
                          <td className="font-medium">{entry.level}</td>
                          <td className="min-w-36">
                            {stepValue === null ? (
                              <span className="text-sm text-base-content/50">—</span>
                            ) : (
                              <input
                                type="number"
                                min={1}
                                max={5000}
                                className="input input-bordered input-sm w-28 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                value={stepValue}
                                onChange={(event) => updateLevelProgressionEntry(index, event.target.value)}
                              />
                            )}
                          </td>
                          <td className="text-right font-mono text-sm text-base-content/60">{entry.required_bubbles}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
          {levelProgressionForm.errors.entries ? (
            <p className="mt-3 text-xs text-error">{levelProgressionForm.errors.entries}</p>
          ) : null}
          <div className="mt-4 flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={handleLevelProgressionSave}
              disabled={levelProgressionForm.processing}
            >
              {levelProgressionForm.processing ? 'Saving...' : 'Save level progression'}
            </Button>
          </div>
        </div>
        <div className="rounded-box bg-base-100 p-3 shadow-md">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">Discord line poster</h2>
              <p className="text-xs text-base-content/60">
                Paste one line per message. The bot posts every non-empty line separately to the selected channel or thread.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DiscordChannelPickerModal
                title="Discord target"
                description="Select a text channel directly or load threads from a selected channel."
                confirmLabel="Use target"
                channelsRouteName="admin.settings.backup.channels.refresh"
                threadsRouteName="admin.settings.backup.threads.refresh"
                mode="single"
                allowedChannelTypes={['GuildText', 'GuildAnnouncement', 'PublicThread', 'PrivateThread', 'AnnouncementThread']}
                enableThreadLoader
                onConfirm={handleDiscordLinePostTargetSelect}
              >
                Select target
              </DiscordChannelPickerModal>
              {discordLinePostForm.data.channel_id ? (
                <Button size="sm" variant="ghost" onClick={handleDiscordLinePostTargetClear}>
                  Clear
                </Button>
              ) : null}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-base-content/60">
            <span>
              Target: <span className="font-semibold text-base-content">{discordLinePostTargetLabel}</span>
            </span>
            <span>
              Prepared lines: <span className="font-semibold text-base-content">{discordLinePostCount}</span>
            </span>
          </div>
          <div className="mt-3 space-y-2">
            <label className="form-control">
              <span className="label text-xs">Lines</span>
              <textarea
                className="textarea textarea-bordered min-h-40 w-full font-mono text-sm"
                value={discordLinePostForm.data.lines}
                onChange={(event) => discordLinePostForm.setData('lines', event.target.value)}
                placeholder={'First line\nSecond line\nThird line'}
              />
            </label>
            <p className="text-xs text-base-content/60">
              Empty lines are ignored. Maximum 100 messages per run. Each line becomes one Discord message.
            </p>
            {discordLinePostForm.errors.lines ? (
              <p className="text-xs text-error">{discordLinePostForm.errors.lines}</p>
            ) : null}
            {discordLinePostForm.errors.channel_id ? (
              <p className="text-xs text-error">{discordLinePostForm.errors.channel_id}</p>
            ) : null}
            {discordLinePostRequestError ? (
              <p className="text-xs text-error">{String(discordLinePostRequestError)}</p>
            ) : null}
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDiscordLinePost}
              disabled={discordLinePostForm.processing}
            >
              {discordLinePostForm.processing ? 'Posting...' : 'Post lines'}
            </Button>
          </div>
        </div>
        <div className="rounded-box border border-base-200 bg-base-100 p-4 space-y-3">
          <div>
            <h2 className="text-sm font-semibold">Monitoring</h2>
            <p className="text-xs text-base-content/60 mt-0.5">Test that the error reporting pipeline is wired up correctly.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                reportFrontendError({
                  source: 'window_error',
                  message: '[test] Frontend error reporting test — triggered manually from admin settings.',
                  url: window.location.href,
                  context: { manual_test: true },
                })
                toast.show('Test error sent — check Nightwatch.', 'info')
              }}
            >
              Test frontend error reporting
            </Button>
            <TestErrorBoundaryButton />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
