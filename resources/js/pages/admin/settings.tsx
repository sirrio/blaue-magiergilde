import { Button } from '@/components/ui/button'
import { Card, CardBody, CardContent, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import AppLayout from '@/layouts/app-layout'
import { DiscordBackupChannel, DiscordBackupStats, VoiceSettings } from '@/types'
import { Head, Link, useForm } from '@inertiajs/react'
import { useEffect, useMemo, useState } from 'react'

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
  const backupForm = useForm({})
  const deleteForm = useForm({})
  const refreshForm = useForm({})
  const selectionForm = useForm({
    guilds: [] as { guild_id: string; channel_ids: string[] }[],
  })
  const [selectedByGuild, setSelectedByGuild] = useState<Record<string, string[]>>(
    discordBackup.selected_channels ?? {}
  )

  useEffect(() => {
    setData('voice_channel_id', voiceSettings?.voice_channel_id ?? '')
  }, [setData, voiceSettings?.voice_channel_id])

  useEffect(() => {
    setSelectedByGuild(discordBackup.selected_channels ?? {})
  }, [discordBackup.selected_channels])

  const availableChannelGroups = useMemo(
    () => discordBackup.available_channels ?? {},
    [discordBackup.available_channels]
  )

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

  const handleRefreshChannels = () => {
    refreshForm.post(route('discord-backup.channels.refresh'), {
      preserveScroll: true,
      onSuccess: () => {
        toast.show('Channel-Liste aktualisiert', 'info')
      },
      onError: () => {
        toast.show('Channel-Liste konnte nicht geladen werden.', 'error')
      },
    })
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
      },
      onError: () => {
        toast.show('Discord Backup konnte nicht gestartet werden.', 'error')
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

  const lastSyncedLabel = discordBackup.last_synced_at
    ? new Date(discordBackup.last_synced_at).toLocaleString()
    : 'Nie'

  const channelGroupEntries = Object.entries(availableChannelGroups) as [string, DiscordBackupChannel[]][]

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
              <div className="mt-4 rounded-box border border-base-200 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Backup Channels</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRefreshChannels}
                    disabled={refreshForm.processing}
                  >
                    Channels laden
                  </Button>
                </div>
                {channelGroupEntries.length === 0 ? (
                  <p className="mt-3 text-xs text-base-content/70">
                    Noch keine Channel geladen. Klicke auf &quot;Channels laden&quot;.
                  </p>
                ) : (
                  <div className="mt-3 flex flex-col gap-4">
                    {channelGroupEntries.map(([guildId, channels]) => (
                      <details
                        key={guildId}
                        className="rounded-box border border-base-200 p-3"
                        open={channels.some((channel) => isChannelSelected(guildId, channel.id))}
                      >
                        <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold">
                          <span>Guild {guildId}</span>
                          <span className="text-xs font-normal text-base-content/60">
                            {(selectedByGuild[guildId] ?? []).length}/{channels.filter((channel) => channel.type !== 'GuildCategory').length}
                          </span>
                        </summary>
                        <div className="mt-3 flex flex-col gap-3">
                          {(() => {
                            const categories = new Map<string, string>()
                            channels.forEach((channel) => {
                              if (channel.type === 'GuildCategory') {
                                categories.set(channel.id, channel.name)
                              }
                            })

                            const grouped = new Map<
                              string,
                              { id: string | null; name: string; channels: DiscordBackupChannel[] }
                            >()

                            channels.forEach((channel) => {
                              if (channel.type === 'GuildCategory') {
                                return
                              }

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

                            const groupedList = Array.from(grouped.values())
                              .map((group) => ({
                                ...group,
                                channels: [...group.channels].sort((a, b) => a.name.localeCompare(b.name)),
                              }))
                              .sort((a, b) => {
                                if (a.id === null && b.id !== null) return 1
                                if (a.id !== null && b.id === null) return -1
                                return a.name.localeCompare(b.name)
                              })

                            return groupedList.map((group) => {
                              const isOpen = group.channels.some((channel) => isChannelSelected(guildId, channel.id))
                              return (
                                <details
                                  key={group.id ?? 'uncategorized'}
                                  className="rounded-box border border-base-200/70 p-2"
                                  open={isOpen}
                                >
                                  <summary className="flex cursor-pointer items-center justify-between text-xs font-semibold text-base-content/70">
                                    <span className="truncate">{group.name}</span>
                                    <span className="text-[11px] font-normal text-base-content/60">
                                      {group.channels.filter((channel) => isChannelSelected(guildId, channel.id)).length}/
                                      {group.channels.length}
                                    </span>
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
                              )
                            })
                          })()}
                        </div>
                      </details>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex justify-end">
                  <Button size="sm" variant="outline" onClick={handleSaveSelection} disabled={selectionForm.processing}>
                    Auswahl speichern
                  </Button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={handleBackupStart} disabled={backupForm.processing}>
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
