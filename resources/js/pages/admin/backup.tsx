import { ActionMenu } from '@/components/ui/action-menu'
import { Button } from '@/components/ui/button'
import { Modal, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Progress } from '@/components/ui/progress'
import { toast } from '@/components/ui/toast'
import DiscordChannelPickerModal from '@/components/discord-channel-picker-modal'
import AppLayout from '@/layouts/app-layout'
import { DiscordBackupChannel, DiscordBackupStats, DiscordBackupStatus, PageProps } from '@/types'
import { Head, router, useForm, usePage } from '@inertiajs/react'
import { Settings } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export default function Backup({
  discordBackup,
}: {
  discordBackup: DiscordBackupStats
}) {
  const { errors: pageErrors } = usePage<PageProps>().props
  const backupForm = useForm({})
  const deleteForm = useForm({})
  const selectionForm = useForm({
    guilds: [] as { guild_id: string; channel_ids: string[] }[],
  })
  const [selectedByGuild, setSelectedByGuild] = useState<Record<string, string[]>>(
    discordBackup.selected_channels ?? {}
  )
  const [syncingChannelId, setSyncingChannelId] = useState<string | null>(null)
  const [backupStatus, setBackupStatus] = useState<DiscordBackupStatus | null>(null)
  const statusIntervalRef = useRef<number | null>(null)

  const getCsrfToken = useCallback(() => {
    if (typeof document === 'undefined') return ''
    const meta = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null
    return meta?.content ?? ''
  }, [])

  const fetchBackupStatus = useCallback(
    async (showToast: boolean) => {
      const csrfToken = getCsrfToken()
      if (!csrfToken) {
        if (showToast) toast.show('Missing CSRF token.', 'error')
        return
      }

      try {
        const response = await fetch(route('admin.backup.status'), {
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

        const status = payload?.status ?? null
        if (!status || typeof status !== 'object') {
          setBackupStatus(null)
          return
        }
        setBackupStatus(status as DiscordBackupStatus)
      } catch (error) {
        if (showToast) {
          toast.show('Status could not be loaded.', 'error')
        }
      }
    },
    [getCsrfToken],
  )

  useEffect(() => {
    setSelectedByGuild(discordBackup.selected_channels ?? {})
  }, [discordBackup.selected_channels])

  useEffect(() => {
    void fetchBackupStatus(false)

    return () => {
      if (statusIntervalRef.current !== null) {
        window.clearInterval(statusIntervalRef.current)
        statusIntervalRef.current = null
      }
    }
  }, [fetchBackupStatus])

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
      void fetchBackupStatus(false)
    }, 5000)

    return () => {
      if (statusIntervalRef.current !== null) {
        window.clearInterval(statusIntervalRef.current)
        statusIntervalRef.current = null
      }
    }
  }, [backupStatus?.running, fetchBackupStatus])

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
    selectionForm.patch(route('admin.backup.channels.update'), {
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
    backupForm.post(route('admin.backup.store'), {
      preserveScroll: true,
      onSuccess: () => {
        toast.show('Discord backup started.', 'info')
        void fetchBackupStatus(false)
      },
      onError: (formErrors) => {
        const message = formErrors?.discord_backup ? String(formErrors.discord_backup) : ''
        if (message.toLowerCase().includes('backup already running')) {
          toast.show('Backup already running.', 'info')
          void fetchBackupStatus(false)
          return
        }

        toast.show('Discord backup could not be started.', 'error')
        void fetchBackupStatus(false)
      },
    })
  }

  const handleBackupDelete = () => {
    if (!window.confirm('Delete Discord backup?')) {
      return
    }

    deleteForm.delete(route('admin.backup.destroy'), {
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
        const response = await fetch(route('admin.backup.channels.sync', channel.id), {
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
        void fetchBackupStatus(false)
        router.reload({ only: ['discordBackup'] })
      } catch (error) {
        toast.show('Channel sync failed.', 'error')
      } finally {
        setSyncingChannelId(null)
      }
    },
    [fetchBackupStatus, getCsrfToken, syncingChannelId, router],
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

  return (
    <AppLayout>
      <Head title="Backup" />
      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-6">
        <section className="flex flex-col gap-2 border-b pb-4">
          <h1 className="text-2xl font-bold">Backup</h1>
          <p className="text-sm text-base-content/70">
            Manage Discord backup preferences for the guild.
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
                    <Settings size={16} />
                  </Button>
                </ModalTrigger>
                <ModalTitle>Backup settings</ModalTitle>
                <ModalContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">Selected channels</p>
                      <DiscordChannelPickerModal
                        title="Add backup channels"
                        description="Select the text channels to include in backups. Threads are captured automatically."
                        confirmLabel="Add channels"
                        excludedByGuild={selectedByGuild}
                        onConfirm={handleAddChannels}
                      >
                        Add channels
                      </DiscordChannelPickerModal>
                    </div>
                    {selectedChannelsFlat.length === 0 ? (
                      <p className="text-xs text-base-content/70">No channels selected yet.</p>
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
                                {syncingChannelId === channel.id ? 'Sync...' : 'Sync'}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" onClick={handleSaveSelection} disabled={selectionForm.processing}>
                        Save selection
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
      </div>
    </AppLayout>
  )
}
