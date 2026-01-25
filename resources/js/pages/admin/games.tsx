import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import DiscordChannelPickerModal from '@/components/discord-channel-picker-modal'
import AppLayout from '@/layouts/app-layout'
import { DiscordBotSettings } from '@/types'
import { Head, useForm } from '@inertiajs/react'
import { CalendarDays } from 'lucide-react'
import { useCallback, useMemo } from 'react'

type GamesSettingsProps = {
  discordBotSettings: Pick<
    DiscordBotSettings,
    'games_channel_id' | 'games_channel_name' | 'games_channel_guild_id'
  >
}

export default function GamesSettings({ discordBotSettings }: GamesSettingsProps) {
  const form = useForm({
    games_channel_id: discordBotSettings.games_channel_id ?? '',
    games_channel_name: discordBotSettings.games_channel_name ?? '',
    games_channel_guild_id: discordBotSettings.games_channel_guild_id ?? '',
  })

  const channelLabel = useMemo(() => {
    if (form.data.games_channel_name) return form.data.games_channel_name
    if (form.data.games_channel_id) return form.data.games_channel_id
    return 'No channel selected'
  }, [form.data.games_channel_id, form.data.games_channel_name])

  const handleChannelSelect = useCallback(
    (selection: { id: string; name: string; guild_id: string } | { guild_id: string; channel_ids: string[] }[]) => {
      if (Array.isArray(selection) || !selection) return
      form.setData('games_channel_id', selection.id)
      form.setData('games_channel_name', selection.name)
      form.setData('games_channel_guild_id', selection.guild_id)
    },
    [form],
  )

  const handleChannelClear = useCallback(() => {
    form.setData('games_channel_id', '')
    form.setData('games_channel_name', '')
    form.setData('games_channel_guild_id', '')
  }, [form])

  const handleSave = useCallback(() => {
    form.patch(route('admin.games.update'), {
      preserveScroll: true,
      onSuccess: () => toast.show('Games channel saved.', 'info'),
      onError: () => toast.show('Games channel could not be saved.', 'error'),
    })
  }, [form])

  return (
    <AppLayout>
      <Head title="Games settings" />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-12 pt-8">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-base-200 p-2">
            <CalendarDays size={18} />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Games</h1>
            <p className="text-sm text-base-content/70">
              Select the Discord channel that should be scanned for game announcements.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-base-200 bg-base-100 p-5 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <DiscordChannelPickerModal
                title="Games channel"
                description="Choose the channel that contains game announcements."
                confirmLabel="Use channel"
                channelsRouteName="admin.settings.backup.channels.refresh"
                allowedChannelTypes={['GuildText', 'GuildAnnouncement']}
                mode="single"
                onConfirm={handleChannelSelect}
              >
                Select channel
              </DiscordChannelPickerModal>
              {form.data.games_channel_id ? (
                <Button size="sm" variant="ghost" onClick={handleChannelClear}>
                  Clear selection
                </Button>
              ) : null}
            </div>

            <div className="text-sm">
              Current: <span className="font-semibold text-base-content">{channelLabel}</span>
            </div>

            {form.errors.games_channel_id ? (
              <span className="text-sm text-error">{form.errors.games_channel_id}</span>
            ) : null}

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={form.processing}>
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
