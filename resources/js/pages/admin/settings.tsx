import { ActionMenu } from '@/components/ui/action-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Progress } from '@/components/ui/progress'
import { toast } from '@/components/ui/toast'
import DiscordChannelPickerModal from '@/components/discord-channel-picker-modal'
import AppLayout from '@/layouts/app-layout'
import { useTranslate } from '@/lib/i18n'
import {
  CompendiumImportRun,
  DiscordBackupChannel,
  DiscordBackupStats,
  DiscordBackupStatus,
  DiscordBotSettings,
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

export default function Settings({
  discordBackup,
  discordBotSettings,
  sources,
  compendiumImportRuns,
  legacyCharacterApprovalStats,
}: {
  discordBackup: DiscordBackupStats
  discordBotSettings: DiscordBotSettings
  sources: Source[]
  compendiumImportRuns: CompendiumImportRun[]
  legacyCharacterApprovalStats: {
    total_rows: number
    last_imported_at?: string | null
  }
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
    support_ticket_channel_id: discordBotSettings.support_ticket_channel_id ?? '',
    support_ticket_channel_name: discordBotSettings.support_ticket_channel_name ?? '',
    support_ticket_channel_guild_id: discordBotSettings.support_ticket_channel_guild_id ?? '',
  })
  const createSourceForm = useForm({
    name: '',
    shortcode: '',
  })
  const sourceEditForm = useForm({
    id: 0,
    name: '',
    shortcode: '',
  })
  const [selectedByGuild, setSelectedByGuild] = useState<Record<string, string[]>>(
    discordBackup.selected_channels ?? {}
  )
  const [syncingChannelId, setSyncingChannelId] = useState<string | null>(null)
  const [backupStatus, setBackupStatus] = useState<DiscordBackupStatus | null>(null)
  const statusIntervalRef = useRef<number | null>(null)
  const fetchBackupStatusRef = useRef<(showToast: boolean) => Promise<void>>(async () => {})
  const [editingSource, setEditingSource] = useState<Source | null>(null)
  const [importEntityType, setImportEntityType] = useState<'items' | 'spells'>('items')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importBusy, setImportBusy] = useState(false)
  const [applyBusy, setApplyBusy] = useState(false)
  const [importPreview, setImportPreview] = useState<{
    preview_token: string
    entity_type: 'items' | 'spells'
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
      payload: Record<string, string | number | boolean | null>
      source_shortcode?: string
      changes?: Record<string, { from: string | number | boolean | null; to: string | number | boolean | null }>
    }>
    error_samples: Array<{ line?: number; message?: string }>
  } | null>(null)
  const [legacyImportFile, setLegacyImportFile] = useState<File | null>(null)
  const [legacyImportBusy, setLegacyImportBusy] = useState(false)
  const [legacyApplyBusy, setLegacyApplyBusy] = useState(false)
  const [legacyImportPreview, setLegacyImportPreview] = useState<LegacyCharacterApprovalImportPreview | null>(null)

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

  useEffect(() => {
    if (!editingSource) return
    sourceEditForm.setData({
      id: editingSource.id,
      name: editingSource.name,
      shortcode: editingSource.shortcode,
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
      toast.show('Preview ready.', 'info')
    } catch {
      toast.show('Preview failed.', 'error')
    } finally {
      setImportBusy(false)
    }
  }, [importEntityType, importFile])

  const handleApplyImport = useCallback(async () => {
    if (!importPreview?.preview_token) {
      toast.show('Run preview first.', 'error')
      return
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
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_180px_auto] sm:items-end">
            <Input
              value={createSourceForm.data.name}
              onChange={(event) => createSourceForm.setData('name', event.target.value)}
              errors={createSourceForm.errors.name}
              placeholder="Player's Handbook"
            >
              {t('compendium.sourceName')}
            </Input>
            <Input
              value={createSourceForm.data.shortcode}
              onChange={(event) => createSourceForm.setData('shortcode', event.target.value)}
              errors={createSourceForm.errors.shortcode}
              placeholder="PHB"
            >
              {t('compendium.shortcode')}
            </Input>
            <Button size="sm" variant="outline" onClick={handleSourceCreate} disabled={createSourceForm.processing}>
              {t('compendium.addSource')}
            </Button>
          </div>
          <div className="mt-4 space-y-2">
            {sources.length === 0 ? (
              <p className="text-xs text-base-content/60">No sources configured yet.</p>
            ) : (
              sources.map((source) => (
                <div key={source.id} className="flex items-center justify-between gap-3 rounded-lg border border-base-200 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="rounded-full border border-base-300 px-2 py-0.5 text-[10px] uppercase text-base-content/70">
                      {source.shortcode}
                    </span>
                    <span className="truncate text-sm">{source.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="xs" variant="ghost" onClick={() => setEditingSource(source)}>
                      Edit
                    </Button>
                    <Button size="xs" variant="ghost" className="text-error" onClick={() => handleSourceDelete(source)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          <Modal isOpen={editingSource !== null} onClose={() => setEditingSource(null)}>
            <ModalTitle>{t('compendium.editSource')}</ModalTitle>
            <ModalContent>
              <Input
                value={sourceEditForm.data.name}
                onChange={(event) => sourceEditForm.setData('name', event.target.value)}
                errors={sourceEditForm.errors.name}
                placeholder="Player's Handbook"
              >
                {t('compendium.sourceName')}
              </Input>
              <Input
                value={sourceEditForm.data.shortcode}
                onChange={(event) => sourceEditForm.setData('shortcode', event.target.value)}
                errors={sourceEditForm.errors.shortcode}
                placeholder="PHB"
              >
                {t('compendium.shortcode')}
              </Input>
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={handleSourceUpdate} disabled={sourceEditForm.processing}>
                  {t('compendium.saveSource')}
                </Button>
              </div>
            </ModalContent>
          </Modal>
        </div>
        <div className="rounded-box bg-base-100 shadow-md p-3">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Compendium import</h2>
            <p className="text-xs text-base-content/60">
              Upload CSV metadata for items or spells, preview changes, then apply.
            </p>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr_auto] sm:items-end">
            <label className="form-control">
              <span className="label text-xs">Entity</span>
              <select
                className="select select-sm w-full"
                value={importEntityType}
                onChange={(event) => setImportEntityType(event.target.value as 'items' | 'spells')}
              >
                <option value="items">Items</option>
                <option value="spells">Spells</option>
              </select>
            </label>
            <label className="form-control">
              <span className="label text-xs">CSV file</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="file-input file-input-bordered file-input-sm w-full"
                onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <div className="flex items-center gap-2">
              <Button
                as="a"
                size="sm"
                variant="outline"
                href={route('admin.settings.compendium.template', { entity_type: importEntityType })}
              >
                Template
              </Button>
              <Button size="sm" variant="outline" onClick={() => void handlePreviewImport()} disabled={importBusy}>
                {importBusy ? 'Previewing...' : 'Preview compendium'}
              </Button>
            </div>
          </div>
          {importFile ? (
            <p className="mt-2 text-xs text-base-content/60">
              Selected file: <span className="font-semibold text-base-content">{importFile.name}</span>
            </p>
          ) : null}
          {importPreview ? (
            <div className="mt-4 space-y-3 rounded-lg border border-base-200 p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-base-200 px-2 py-1">Rows: {importPreview.summary.total_rows}</span>
                <span className="rounded-full border border-success/40 px-2 py-1 text-success">New: {importPreview.summary.new_rows}</span>
                <span className="rounded-full border border-warning/40 px-2 py-1 text-warning">Updated: {importPreview.summary.updated_rows}</span>
                <span className="rounded-full border border-base-200 px-2 py-1">Unchanged: {importPreview.summary.unchanged_rows}</span>
                <span className="rounded-full border border-error/40 px-2 py-1 text-error">Invalid: {importPreview.summary.invalid_rows}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="table table-xs">
                  <thead>
                    <tr>
                      <th>Line</th>
                      <th>Action</th>
                      {(importPreview.entity_type === 'items'
                        ? ['name', 'type', 'rarity', 'cost', 'url', 'source', 'guild_enabled', 'shop_enabled', 'ruling_changed', 'ruling_note']
                        : ['name', 'spell_level', 'spell_school', 'url', 'legacy_url', 'source', 'guild_enabled', 'ruling_changed', 'ruling_note']
                      ).map((column) => (
                        <th key={column}>{column}</th>
                      ))}
                      <th>Changes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.row_samples.map((sample) => (
                      <tr key={`${sample.line}-${sample.action}`}>
                        <td>{sample.line}</td>
                        <td>{sample.action}</td>
                        {(importPreview.entity_type === 'items'
                          ? ['name', 'type', 'rarity', 'cost', 'url', 'source', 'guild_enabled', 'shop_enabled', 'ruling_changed', 'ruling_note']
                          : ['name', 'spell_level', 'spell_school', 'url', 'legacy_url', 'source', 'guild_enabled', 'ruling_changed', 'ruling_note']
                        ).map((column) => {
                          const rawValue = column === 'source' ? sample.payload?.source_id : sample.payload?.[column]
                          let displayValue: string | number | boolean | null = rawValue ?? null

                          if (column === 'source') {
                            const sourceId = typeof rawValue === 'number' ? rawValue : Number(rawValue)
                            const resolved = Number.isFinite(sourceId) && sourceById[sourceId]
                              ? sourceById[sourceId]
                              : null
                            displayValue = resolved ?? sample.source_shortcode ?? null
                          }

                          return <td key={`${sample.line}-${column}`}>{displayValue === null ? '-' : String(displayValue)}</td>
                        })}
                        <td>{sample.changes ? Object.keys(sample.changes).join(', ') || '-' : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {importPreview.error_samples.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-error">Errors</p>
                  {importPreview.error_samples.map((error, index) => (
                    <p key={`${error.line ?? index}-${index}`} className="text-xs text-error">
                      Line {error.line ?? '-'}: {error.message ?? 'Invalid row'}
                    </p>
                  ))}
                </div>
              ) : null}
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={() => void handleApplyImport()} disabled={applyBusy}>
                  {applyBusy ? 'Applying...' : 'Apply import'}
                </Button>
              </div>
            </div>
          ) : null}
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-base-content/70">Recent imports</p>
            {compendiumImportRuns.length === 0 ? (
              <p className="text-xs text-base-content/60">No imports yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-xs">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Type</th>
                      <th>File</th>
                      <th>Total</th>
                      <th>New</th>
                      <th>Updated</th>
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
              Local channel override active. The bot uses Discord channel <span className="font-semibold">{botChannelOverride.channel_id}</span> for character approvals and support tickets instead of the saved channel settings while developing locally.
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
                <h3 className="text-sm font-semibold">Support tickets</h3>
                <p className="text-xs text-base-content/60">
                  User DMs to the bot create ticket threads in this channel.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <DiscordChannelPickerModal
                  title="Support ticket channel"
                  description="Select a text channel where support ticket threads should be created."
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
      </div>
    </AppLayout>
  )
}
