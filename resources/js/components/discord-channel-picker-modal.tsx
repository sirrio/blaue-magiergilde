import { Button } from '@/components/ui/button'
import { Modal, ModalAction, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { toast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { DiscordBackupChannel } from '@/types'
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react'

type SelectionMode = 'single' | 'multiple'
type TriggerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type TriggerVariant = 'outline' | 'dash' | 'soft' | 'ghost' | 'link'
type TriggerModifier = 'wide' | 'block' | 'square' | 'circle'
type TriggerColor = 'neutral' | 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error'

type GuildSelection = {
  guild_id: string
  channel_ids: string[]
}

type SingleSelection = DiscordBackupChannel | null

type ChannelPickerProps = {
  title: string
  description?: string
  confirmLabel?: string
  includeThreads?: boolean
  includeArchivedThreads?: boolean
  includePrivateThreads?: boolean
  enableThreadLoader?: boolean
  threadLoadIncludeArchived?: boolean
  threadLoadIncludePrivate?: boolean
  mode?: SelectionMode
  excludedByGuild?: Record<string, string[]>
  allowedChannelTypes?: string[]
  triggerClassName?: string
  triggerSize?: TriggerSize
  triggerVariant?: TriggerVariant
  triggerModifier?: TriggerModifier
  triggerColor?: TriggerColor
  triggerDisabled?: boolean
  onConfirm: (selection: GuildSelection[] | SingleSelection) => void
  children: ReactNode
}

const getCsrfToken = () => {
  if (typeof document === 'undefined') return ''
  const meta = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null
  return meta?.content ?? ''
}

const buildChannelLabel = (channel: DiscordBackupChannel, channelLookup: Map<string, DiscordBackupChannel>) => {
  if (channel.is_thread && channel.parent_id) {
    const parent = channelLookup.get(channel.parent_id)
    if (parent?.name) {
      return `${parent.name} / ${channel.name}`
    }
  }
  return channel.name
}

const buildGroupedList = (
  channels: DiscordBackupChannel[],
  excludedSet: Set<string>,
  includeThreads: boolean,
  allowedTypes?: Set<string>,
  threadParentAllowlist?: Set<string>,
) => {
  const channelLookup = new Map<string, DiscordBackupChannel>()
  const categories = new Map<string, string>()

  channels.forEach((channel) => {
    channelLookup.set(channel.id, channel)
    if (channel.type === 'GuildCategory') {
      categories.set(channel.id, channel.name)
    }
  })

  const filtered = channels.filter((channel) => {
    if (channel.type === 'GuildCategory') return true
    if (!includeThreads && channel.is_thread) {
      if (!threadParentAllowlist) return false
      if (!channel.parent_id || !threadParentAllowlist.has(channel.parent_id)) return false
    }
    if (allowedTypes && !allowedTypes.has(channel.type)) return false
    if (excludedSet.has(channel.id)) return false
    return true
  })

  const grouped = new Map<string, { id: string | null; name: string; channels: DiscordBackupChannel[] }>()

  filtered.forEach((channel) => {
    if (channel.type === 'GuildCategory') return

    let categoryId: string | null = null
    if (channel.parent_id && categories.has(channel.parent_id)) {
      categoryId = channel.parent_id
    } else if (channel.is_thread && channel.parent_id && channelLookup.has(channel.parent_id)) {
      const parent = channelLookup.get(channel.parent_id)
      if (parent?.parent_id && categories.has(parent.parent_id)) {
        categoryId = parent.parent_id
      }
    }

    const key = categoryId ?? 'uncategorized'
    if (!grouped.has(key)) {
      grouped.set(key, {
        id: categoryId,
        name: categoryId ? categories.get(categoryId) ?? 'Category' : 'Uncategorized',
        channels: [],
      })
    }
    grouped.get(key)?.channels.push(channel)
  })

  return {
    groups: Array.from(grouped.values())
      .map((group) => ({
        ...group,
        channels: [...group.channels].sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => {
        if (a.id === null && b.id !== null) return 1
        if (a.id !== null && b.id === null) return -1
        return a.name.localeCompare(b.name)
      }),
    channelLookup,
  }
}

export default function DiscordChannelPickerModal({
  title,
  description,
  confirmLabel,
  includeThreads = false,
  includeArchivedThreads = false,
  includePrivateThreads = false,
  enableThreadLoader = false,
  threadLoadIncludeArchived = true,
  threadLoadIncludePrivate = false,
  mode = 'multiple',
  excludedByGuild,
  allowedChannelTypes,
  triggerClassName,
  triggerSize = 'sm',
  triggerVariant = 'outline',
  triggerModifier,
  triggerColor,
  triggerDisabled,
  onConfirm,
  children,
}: ChannelPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [availableChannelGroups, setAvailableChannelGroups] = useState<Record<string, DiscordBackupChannel[]>>({})
  const [isRefreshingChannels, setIsRefreshingChannels] = useState(false)
  const [pendingByGuild, setPendingByGuild] = useState<Record<string, string[]>>({})
  const [pendingSingle, setPendingSingle] = useState<SingleSelection>(null)
  const [threadLoadingId, setThreadLoadingId] = useState<string | null>(null)
  const [loadedThreadParents, setLoadedThreadParents] = useState<string[]>([])

  const allowedTypes = useMemo(
    () => (allowedChannelTypes && allowedChannelTypes.length > 0 ? new Set(allowedChannelTypes) : undefined),
    [allowedChannelTypes],
  )
  const threadParentAllowlist = useMemo(() => new Set(loadedThreadParents), [loadedThreadParents])

  useEffect(() => {
    if (!isOpen) return
    setPendingByGuild({})
    setPendingSingle(null)
    setLoadedThreadParents([])
    setThreadLoadingId(null)
  }, [isOpen])

  const handleRefreshChannels = useCallback(async () => {
    if (isRefreshingChannels) return

    const csrfToken = getCsrfToken()
    if (!csrfToken) {
      toast.show('Missing CSRF token.', 'error')
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
          body: JSON.stringify({
            include_threads: includeThreads,
            include_archived_threads: includeArchivedThreads,
            include_private_threads: includePrivateThreads,
          }),
        })

      const payload = await response.json()
      if (!response.ok) {
        toast.show(String(payload?.error ?? 'Channel list could not be loaded.'), 'error')
        return
      }

      const guilds = Array.isArray(payload?.guilds) ? payload.guilds : []
      const nextGroups: Record<string, DiscordBackupChannel[]> = {}

      guilds.forEach((guild) => {
        if (!guild?.guild_id || !Array.isArray(guild?.channels)) return
        nextGroups[String(guild.guild_id)] = guild.channels as DiscordBackupChannel[]
      })

      setAvailableChannelGroups(nextGroups)
      setLoadedThreadParents([])
      toast.show('Channel list updated.', 'info')
    } catch (error) {
      toast.show('Channel list could not be loaded.', 'error')
    } finally {
      setIsRefreshingChannels(false)
    }
  }, [includeThreads, isRefreshingChannels])

  const handleLoadThreads = useCallback(async () => {
    if (!pendingSingle) {
      toast.show('Select a channel first.', 'error')
      return
    }

    if (pendingSingle.is_thread) {
      toast.show('Select a text channel to load threads.', 'error')
      return
    }

    if (threadLoadingId) return

    const csrfToken = getCsrfToken()
    if (!csrfToken) {
      toast.show('Missing CSRF token.', 'error')
      return
    }

    setThreadLoadingId(pendingSingle.id)

    try {
      const response = await fetch(route('discord-backup.threads.refresh'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          channel_id: pendingSingle.id,
          include_archived_threads: threadLoadIncludeArchived,
          include_private_threads: threadLoadIncludePrivate,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        toast.show(String(payload?.error ?? 'Threads could not be loaded.'), 'error')
        return
      }

      const threads = Array.isArray(payload?.threads) ? (payload.threads as DiscordBackupChannel[]) : []
      if (threads.length === 0) {
        toast.show('No threads found.', 'info')
        return
      }

      setAvailableChannelGroups((current) => {
        const guildId = pendingSingle.guild_id
        const existing = current[guildId] ?? []
        const map = new Map(existing.map((channel) => [channel.id, channel]))
        threads.forEach((thread) => {
          map.set(thread.id, thread)
        })
        return { ...current, [guildId]: Array.from(map.values()) }
      })

      setLoadedThreadParents((current) =>
        current.includes(pendingSingle.id) ? current : [...current, pendingSingle.id]
      )
      toast.show('Threads loaded.', 'info')
    } catch (error) {
      toast.show('Threads could not be loaded.', 'error')
    } finally {
      setThreadLoadingId(null)
    }
  }, [
    getCsrfToken,
    pendingSingle,
    threadLoadingId,
    threadLoadIncludeArchived,
    threadLoadIncludePrivate,
  ])

  const togglePendingChannel = (guildId: string, channelId: string) => {
    setPendingByGuild((current) => {
      const existing = new Set(current[guildId] ?? [])
      if (existing.has(channelId)) {
        existing.delete(channelId)
      } else {
        existing.add(channelId)
      }
      return { ...current, [guildId]: Array.from(existing) }
    })
  }

  const availableGuildEntries = useMemo(() => {
    return (Object.entries(availableChannelGroups) as [string, DiscordBackupChannel[]][])
      .map(([guildId, channels]) => {
        const excludedSet = new Set(excludedByGuild?.[guildId] ?? [])
        const availableCount = channels.filter((channel) => {
          if (channel.type === 'GuildCategory') return false
          if (!includeThreads && channel.is_thread) {
            if (!channel.parent_id || !threadParentAllowlist.has(channel.parent_id)) return false
          }
          if (allowedTypes && !allowedTypes.has(channel.type)) return false
          return !excludedSet.has(channel.id)
        }).length
        return availableCount > 0 ? [guildId, channels] : null
      })
      .filter(Boolean) as [string, DiscordBackupChannel[]][]
  }, [allowedTypes, availableChannelGroups, excludedByGuild, includeThreads, threadParentAllowlist])

  const handleConfirm = () => {
    if (mode === 'single') {
      if (!pendingSingle) {
        toast.show('Select a channel first.', 'error')
        return
      }
      onConfirm(pendingSingle)
      setIsOpen(false)
      return
    }

    const selection = Object.entries(pendingByGuild)
      .map(([guild_id, channel_ids]) => ({
        guild_id,
        channel_ids,
      }))
      .filter((entry) => entry.channel_ids.length > 0)

    if (selection.length === 0) {
      toast.show('Select at least one channel.', 'error')
      return
    }

    onConfirm(selection)
    setIsOpen(false)
  }

  const renderGuildGroups = (entries: [string, DiscordBackupChannel[]][]) => {
    return (
      <div className="mt-3 flex flex-col gap-4">
        {entries.map(([guildId, channels]) => {
          const excludedSet = new Set(excludedByGuild?.[guildId] ?? [])
          const { groups, channelLookup } = buildGroupedList(
            channels,
            excludedSet,
            includeThreads,
            allowedTypes,
            threadParentAllowlist,
          )
          const summaryCount = groups.reduce((sum, group) => sum + group.channels.length, 0)

          if (summaryCount === 0) {
            return null
          }

          return (
            <details key={guildId} className="rounded-box border border-base-200 p-3" open>
              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold">
                <span>Guild {guildId}</span>
                <span className="text-xs font-normal text-base-content/60">{summaryCount}</span>
              </summary>
              <div className="mt-3 flex flex-col gap-3">
                {groups.map((group) => (
                  <details
                    key={`${guildId}-${group.id ?? 'uncategorized'}`}
                    className="rounded-box border border-base-200/70 p-2"
                    open={group.channels.length > 0}
                  >
                    <summary className="flex cursor-pointer items-center justify-between text-xs font-semibold text-base-content/70">
                      <span className="truncate">{group.name}</span>
                      <span className="text-[11px] font-normal text-base-content/60">{group.channels.length}</span>
                    </summary>
                    <div className="mt-2 grid gap-2">
                      {group.channels.map((channel) => {
                        const channelLabel = buildChannelLabel(channel, channelLookup)
                        const checked =
                          mode === 'single'
                            ? pendingSingle?.id === channel.id
                            : (pendingByGuild[guildId] ?? []).includes(channel.id)
                        return (
                          <label key={channel.id} className="flex items-center gap-2 text-sm">
                            <input
                              type={mode === 'single' ? 'radio' : 'checkbox'}
                              name={mode === 'single' ? 'discord-channel-picker' : undefined}
                              className={cn('checkbox', mode === 'single' ? 'radio-xs' : 'checkbox-xs')}
                              checked={checked}
                              onChange={() => {
                                if (mode === 'single') {
                                  setPendingSingle(channel)
                                } else {
                                  togglePendingChannel(guildId, channel.id)
                                }
                              }}
                            />
                            <span className="truncate">{channelLabel}</span>
                            {channel.is_thread ? (
                              <span className="rounded-full bg-base-200 px-2 py-0.5 text-[10px] uppercase text-base-content/50">
                                Thread
                              </span>
                            ) : null}
                          </label>
                        )
                      })}
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
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} wide>
      <ModalTrigger>
        <Button
          size={triggerSize}
          variant={triggerVariant}
          modifier={triggerModifier}
          color={triggerColor}
          className={triggerClassName}
          disabled={triggerDisabled}
          onClick={() => {
            setIsOpen(true)
          }}
        >
          {children}
        </Button>
      </ModalTrigger>
      <ModalTitle>{title}</ModalTitle>
      <ModalContent>
        {description ? <p className="text-xs text-base-content/70">{description}</p> : null}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">Available channels</p>
          <div className="flex flex-wrap gap-2">
            {enableThreadLoader && mode === 'single' ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleLoadThreads}
                disabled={!pendingSingle || pendingSingle.is_thread || threadLoadingId === pendingSingle?.id}
              >
                {threadLoadingId === pendingSingle?.id ? 'Loading threads...' : 'Load threads'}
              </Button>
            ) : null}
            <Button size="sm" variant="outline" onClick={handleRefreshChannels} disabled={isRefreshingChannels}>
              Load channels
            </Button>
          </div>
        </div>
        {availableGuildEntries.length === 0 ? (
          <p className="mt-3 text-xs text-base-content/70">
            No channels loaded yet. Click &quot;Load channels&quot;.
          </p>
        ) : (
          renderGuildGroups(availableGuildEntries)
        )}
      </ModalContent>
      <ModalAction onClick={handleConfirm}>{confirmLabel ?? 'Confirm'}</ModalAction>
    </Modal>
  )
}
