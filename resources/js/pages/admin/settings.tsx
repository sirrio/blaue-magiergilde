import { Button } from '@/components/ui/button'
import { Card, CardBody, CardContent, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { toast } from '@/components/ui/toast'
import AppLayout from '@/layouts/app-layout'
import { DiscordBackupChannel, DiscordBackupStats, DiscordBackupStatus, PageProps, VoiceSettings } from '@/types'
import { Head, Link, useForm, usePage } from '@inertiajs/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export default function Settings({
  voiceSettings,
  discordBackup,
}: {
  voiceSettings: VoiceSettings
  discordBackup: DiscordBackupStats
}) {
  const { data, setData, patch, processing, errors } = useForm({
    voice_channel_id: voiceSettings?.voice_channel_id ?? '',
  })
  const { errors: pageErrors } = usePage<PageProps>().props
  const backupForm = useForm({})
  const deleteForm = useForm({})
  const selectionForm = useForm({
    guilds: [] as { guild_id: string; channel_ids: string[] }[],
  })
  const [availableChannelGroups, setAvailableChannelGroups] = useState<Record<string, DiscordBackupChannel[]>>({})
  const [isRefreshingChannels, setIsRefreshingChannels] = useState(false)
  const [selectedByGuild, setSelectedByGuild] = useState<Record<string, string[]>>(
    discordBackup.selected_channels ?? {}
  )
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
        if (showToast) toast.show('CSRF Token fehlt.', 'error')
        return
      }

      try {
        const response = await fetch(route('discord-backup.status'), {
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
            toast.show(String(payload?.error ?? 'Status konnte nicht geladen werden.'), 'error')
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
          toast.show('Status konnte nicht geladen werden.', 'error')
        }
      }
    },
    [getCsrfToken],
  )

  useEffect(() => {
    setData('voice_channel_id', voiceSettings?.voice_channel_id ?? '')
  }, [setData, voiceSettings?.voice_channel_id])

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
      ...Object.keys(availableChannelGroups),
      ...Object.keys(selectedChannelDetails),
      ...Object.keys(selectedByGuild),
    ])

    guildIds.forEach((guildId) => {
      const channelMap = new Map<string, DiscordBackupChannel>()
      ;(availableChannelGroups[guildId] ?? []).forEach((channel) => {
        channelMap.set(channel.id, channel)
      })
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
  }, [availableChannelGroups, selectedChannelDetails, selectedByGuild])

  const isChannelSelected = (guildId: string, channelId: string) =>
    (selectedByGuild[guildId] ?? []).includes(channelId)

  const handleSubmit = () => {
    patch(route('voice-settings.update'), {
      preserveScroll: true,
      onSuccess: () => {
        toast.show('Einstellungen gespeichert', 'info')
      },
      onError: () => {
        toast.show('Einstellungen konnten nicht gespeichert werden.', 'error')
      },
    })
  }

  const handleRefreshChannels = async () => {
    if (isRefreshingChannels) return

    const csrfToken = getCsrfToken()
    if (!csrfToken) {
      toast.show('CSRF Token fehlt.', 'error')
      return
    }

    setIsRefreshingChannels(true)

    try {
      const response = await fetch(route('discord-backup.channels.refresh'), {
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
        toast.show(String(payload?.error ?? 'Channel-Liste konnte nicht geladen werden.'), 'error')
        return
      }

      const guilds = Array.isArray(payload?.guilds) ? payload.guilds : []
      const nextGroups: Record<string, DiscordBackupChannel[]> = {}

      guilds.forEach((guild) => {
        if (!guild?.guild_id || !Array.isArray(guild?.channels)) return
        nextGroups[String(guild.guild_id)] = guild.channels as DiscordBackupChannel[]
      })

      setAvailableChannelGroups(nextGroups)
      toast.show('Channel-Liste aktualisiert', 'info')
    } catch (error) {
      toast.show('Channel-Liste konnte nicht geladen werden.', 'error')
    } finally {
      setIsRefreshingChannels(false)
    }
  }

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
    selectionForm.patch(route('discord-backup.channels.update'), {
      preserveScroll: true,
      onSuccess: () => {
        toast.show('Backup-Channels gespeichert', 'info')
      },
      onError: () => {
        toast.show('Backup-Channels konnten nicht gespeichert werden.', 'error')
      },
    })
  }

  const handleBackupStart = () => {
    backupForm.post(route('discord-backup.store'), {
      preserveScroll: true,
      onSuccess: () => {
        toast.show('Discord Backup gestartet', 'info')
        void fetchBackupStatus(false)
      },
      onError: (formErrors) => {
        const message = formErrors?.discord_backup ? String(formErrors.discord_backup) : ''
        if (message.toLowerCase().includes('backup already running')) {
          toast.show('Backup laeuft bereits.', 'info')
          void fetchBackupStatus(false)
          return
        }

        toast.show('Discord Backup konnte nicht gestartet werden.', 'error')
        void fetchBackupStatus(false)
      },
    })
  }

  const handleBackupDelete = () => {
    if (!window.confirm('Discord Backup wirklich loeschen?')) {
      return
    }

    deleteForm.delete(route('discord-backup.destroy'), {
      preserveScroll: true,
      onSuccess: () => {
        toast.show('Discord Backup geloescht', 'info')
      },
      onError: () => {
        toast.show('Discord Backup konnte nicht geloescht werden.', 'error')
      },
    })
  }

  const lastSyncedLabel = backupStatus?.running
    ? backupStatus?.started_at
      ? `Laufend seit ${new Date(backupStatus.started_at).toLocaleString()}`
      : 'Backup laeuft...'
    : backupStatus?.finished_at
      ? new Date(backupStatus.finished_at).toLocaleString()
      : discordBackup.last_synced_at
        ? new Date(discordBackup.last_synced_at).toLocaleString()
        : 'Nie'

  const backupProgressMax = backupStatus?.total_channels ?? 0
  const backupProgressValue = backupStatus?.processed_channels ?? 0
  const backupProgressLabel =
    backupProgressMax > 0
      ? `${backupProgressValue}/${backupProgressMax} Channels`
      : backupStatus?.running
        ? 'Backup laeuft...'
        : 'Kein aktiver Backup'
  const isBackupRunning = backupStatus?.running ?? false

  const buildGroupedList = (
    guildId: string,
    channels: DiscordBackupChannel[],
    mode: 'selected' | 'available',
  ) => {
    const selectedSet = new Set(selectedByGuild[guildId] ?? [])
    const categories = new Map<string, string>()
    channels.forEach((channel) => {
      if (channel.type === 'GuildCategory') {
        categories.set(channel.id, channel.name)
      }
    })

    const filtered = channels.filter((channel) => {
      if (channel.type === 'GuildCategory') return true
      const isSelected = selectedSet.has(channel.id)
      return mode === 'selected' ? isSelected : !isSelected
    })

    const grouped = new Map<string, { id: string | null; name: string; channels: DiscordBackupChannel[] }>()
    filtered.forEach((channel) => {
      if (channel.type === 'GuildCategory') return

      const categoryId = channel.parent_id && categories.has(channel.parent_id) ? channel.parent_id : null
      const key = categoryId ?? 'uncategorized'
      if (!grouped.has(key)) {
        grouped.set(key, {
          id: categoryId,
          name: categoryId ? categories.get(categoryId) ?? channel.parent_id ?? 'Kategorie' : 'Ohne Kategorie',
          channels: [],
        })
      }
      grouped.get(key)?.channels.push(channel)
    })

    return Array.from(grouped.values())
      .map((group) => ({
        ...group,
        channels: [...group.channels].sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => {
        if (a.id === null && b.id !== null) return 1
        if (a.id !== null && b.id === null) return -1
        return a.name.localeCompare(b.name)
      })
  }

  const selectedGuildEntries = Object.keys(selectedByGuild)
    .filter((guildId) => (selectedByGuild[guildId] ?? []).length > 0)
    .map((guildId) => [guildId, mergedChannelGroups[guildId] ?? []] as [string, DiscordBackupChannel[]])

  const availableGuildEntries = (Object.entries(availableChannelGroups) as [string, DiscordBackupChannel[]][])
    .map(([guildId, channels]) => {
      const availableCount = channels.filter(
        (channel) => channel.type !== 'GuildCategory' && !isChannelSelected(guildId, channel.id),
      ).length
      return availableCount > 0 ? [guildId, channels] : null
    })
    .filter(Boolean) as [string, DiscordBackupChannel[]][]

  const renderGuildGroups = (entries: [string, DiscordBackupChannel[]][], mode: 'selected' | 'available') => {
    return (
      <div className="mt-3 flex flex-col gap-4">
        {entries.map(([guildId, channels]) => {
          const selectedCount = (selectedByGuild[guildId] ?? []).length
          const availableCount = channels.filter(
            (channel) => channel.type !== 'GuildCategory' && !isChannelSelected(guildId, channel.id),
          ).length
          const summaryCount = mode === 'selected' ? selectedCount : availableCount

          return (
            <details
              key={`${mode}-${guildId}`}
              className="rounded-box border border-base-200 p-3"
              open={mode === 'selected' && summaryCount > 0}
            >
              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold">
                <span>Guild {guildId}</span>
                <span className="text-xs font-normal text-base-content/60">{summaryCount}</span>
              </summary>
              <div className="mt-3 flex flex-col gap-3">
                {buildGroupedList(guildId, channels, mode).map((group) => (
                  <details
                    key={`${mode}-${guildId}-${group.id ?? 'uncategorized'}`}
                    className="rounded-box border border-base-200/70 p-2"
                    open={mode === 'selected' && group.channels.length > 0}
                  >
                    <summary className="flex cursor-pointer items-center justify-between text-xs font-semibold text-base-content/70">
                      <span className="truncate">{group.name}</span>
                      <span className="text-[11px] font-normal text-base-content/60">{group.channels.length}</span>
                    </summary>
                    <div className="mt-2 grid gap-2">
                      {group.channels.map((channel) => (
                        <label key={channel.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-xs"
                            checked={isChannelSelected(guildId, channel.id)}
                            onChange={() => toggleChannel(guildId, channel.id)}
                          />
                          <span className="truncate">{channel.name}</span>
                        </label>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </details>
          )
        })}
      </div>
    )
  }

  return (
    <AppLayout>
      <Head title="Admin Settings" />
      <div className="container mx-auto flex max-w-2xl flex-col gap-4 px-2 py-4 md:px-0">
        <Card className="card-xs">
          <CardBody>
            <CardTitle>Discord Bot</CardTitle>
            <CardContent>
              <p className="text-xs text-base-content/70">
                Die Voice Channel ID steuert die Live-Kandidatenliste in den Auktionen.
              </p>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <Input
                  errors={errors.voice_channel_id}
                  value={data.voice_channel_id}
                  onChange={(e) => setData('voice_channel_id', e.target.value)}
                >
                  Voice Channel ID
                </Input>
                <Button size="sm" variant="outline" onClick={handleSubmit} disabled={processing}>
                  Speichern
                </Button>
              </div>
            </CardContent>
          </CardBody>
        </Card>
        <Card className="card-xs">
          <CardBody>
            <CardTitle>Discord Backup</CardTitle>
            <CardContent>
              <p className="text-xs text-base-content/70">
                Sichert alle Text-Channels und Threads inklusive Anhangen. Backup laesst sich manuell loeschen.
              </p>
              <div className="mt-3 grid gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-base-content/70">Channels</span>
                  <span className="font-semibold">{discordBackup.channels}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-base-content/70">Messages</span>
                  <span className="font-semibold">{discordBackup.messages}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-base-content/70">Attachments</span>
                  <span className="font-semibold">{discordBackup.attachments}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-base-content/70">Letztes Backup</span>
                  <span className="font-semibold">{lastSyncedLabel}</span>
                </div>
              </div>
              {backupStatus ? (
                <div className="mt-4 rounded-box border border-base-200 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-base-content/70">
                      {backupStatus.running ? 'Backup laeuft' : 'Backup Status'}
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
                      Aktuell: {backupStatus.current_channel.name}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div className="mt-4 rounded-box border border-base-200 p-3">
                <p className="text-sm font-semibold">Ausgewaehlte Channels</p>
                {selectedGuildEntries.length === 0 ? (
                  <p className="mt-3 text-xs text-base-content/70">Noch keine Channels ausgewaehlt.</p>
                ) : (
                  renderGuildGroups(selectedGuildEntries, 'selected')
                )}
              </div>
              <div className="mt-4 rounded-box border border-base-200 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Weitere Channels</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRefreshChannels}
                    disabled={isRefreshingChannels}
                  >
                    Channels laden
                  </Button>
                </div>
                {availableGuildEntries.length === 0 ? (
                  <p className="mt-3 text-xs text-base-content/70">
                    Keine weiteren Channels geladen. Klicke auf &quot;Channels laden&quot;.
                  </p>
                ) : (
                  renderGuildGroups(availableGuildEntries, 'available')
                )}
              </div>
              <div className="mt-3 flex justify-end">
                <Button size="sm" variant="outline" onClick={handleSaveSelection} disabled={selectionForm.processing}>
                  Auswahl speichern
                </Button>
              </div>
              {pageErrors?.discord_backup &&
              !String(pageErrors.discord_backup).toLowerCase().includes('backup already running') ? (
                <p className="mt-2 text-xs text-error">{pageErrors.discord_backup}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBackupStart}
                  disabled={backupForm.processing || isBackupRunning}
                >
                  Backup starten
                </Button>
                <Button size="sm" variant="outline" as={Link} href={route('admin.discord-backup.index')}>
                  Archiv anzeigen
                </Button>
                <Button size="sm" variant="ghost" onClick={handleBackupDelete} disabled={deleteForm.processing}>
                  Backup loeschen
                </Button>
              </div>
            </CardContent>
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  )
}
