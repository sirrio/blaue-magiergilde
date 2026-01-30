import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import DiscordChannelPickerModal from '@/components/discord-channel-picker-modal'
import AppLayout from '@/layouts/app-layout'
import LogoTier from '@/components/logo-tier'
import { DiscordBotSettings } from '@/types'
import { Head, useForm } from '@inertiajs/react'
import { CalendarDays } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'

const monthLabel = (value: string) => {
  const [year, month] = value.split('-')
  const index = Number(month) - 1
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const label = names[index] ?? '???'
  return `${label} ${year}`
}

type GamesSettingsProps = {
  discordBotSettings: Pick<
    DiscordBotSettings,
    'games_channel_id' | 'games_channel_name' | 'games_channel_guild_id' | 'games_scan_years'
  >
  stats: {
    monthly: Array<{
      month: string
      counts: Record<'bt' | 'lt' | 'ht' | 'et' | 'unknown', number>
      total: number
    }>
    totals: Record<'bt' | 'lt' | 'ht' | 'et' | 'unknown' | 'total', number>
    gms: Array<{
      discord_author_id?: string | null
      discord_author_name?: string | null
      total: number
    }>
  }
}

export default function GamesSettings({ discordBotSettings, stats }: GamesSettingsProps) {
  const form = useForm({
    games_channel_id: discordBotSettings.games_channel_id ?? '',
    games_channel_name: discordBotSettings.games_channel_name ?? '',
    games_channel_guild_id: discordBotSettings.games_channel_guild_id ?? '',
    games_scan_years: discordBotSettings.games_scan_years ?? 10,
  })

  const channelLabel = useMemo(() => {
    if (form.data.games_channel_name) return form.data.games_channel_name
    if (form.data.games_channel_id) return form.data.games_channel_id
    return 'No channel selected'
  }, [form.data.games_channel_id, form.data.games_channel_name])

  const handleChannelSelect = useCallback(
    (selection: { id: string; name: string; guild_id: string } | { guild_id: string; channel_ids: string[] }[] | null) => {
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

            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">Scan window</span>
                <div className="flex items-center gap-2">
                  <input
                    className="input input-sm input-bordered w-24"
                    type="number"
                    min={1}
                    max={25}
                    value={form.data.games_scan_years}
                    onChange={(event) => {
                      const value = Number(event.target.value)
                      const clamped = Number.isFinite(value) ? Math.min(25, Math.max(1, value)) : 1
                      form.setData('games_scan_years', clamped)
                    }}
                  />
                  <span className="text-xs text-base-content/70">years</span>
                </div>
              </label>
              <span className="text-xs text-base-content/60">
                Controls how far back the bot scans for announcements (1–25 years).
              </span>
            </div>

            {form.errors.games_channel_id ? (
              <span className="text-sm text-error">{form.errors.games_channel_id}</span>
            ) : null}
            {form.errors.games_scan_years ? (
              <span className="text-sm text-error">{form.errors.games_scan_years}</span>
            ) : null}

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={form.processing}>
                Save
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-base-200 bg-base-100 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Monthly stats</h2>
              <p className="text-sm text-base-content/70">
                Games grouped by month and tier (based on start date).
              </p>
            </div>
            <span className="badge badge-ghost badge-sm">Total {stats.totals.total}</span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th className="text-xs font-semibold text-base-content/70">Month</th>
                  <th className="text-xs font-semibold text-base-content/70">
                    <span className="flex items-center gap-1">
                      <LogoTier tier="bt" width={12} />
                      BT
                    </span>
                  </th>
                  <th className="text-xs font-semibold text-base-content/70">
                    <span className="flex items-center gap-1">
                      <LogoTier tier="lt" width={12} />
                      LT
                    </span>
                  </th>
                  <th className="text-xs font-semibold text-base-content/70">
                    <span className="flex items-center gap-1">
                      <LogoTier tier="ht" width={12} />
                      HT
                    </span>
                  </th>
                  <th className="text-xs font-semibold text-base-content/70">
                    <span className="flex items-center gap-1">
                      <LogoTier tier="et" width={12} />
                      ET
                    </span>
                  </th>
                  <th className="text-xs font-semibold text-base-content/70">?</th>
                  <th className="text-xs font-semibold text-base-content/70">Total</th>
                </tr>
              </thead>
              <tbody>
                {stats.monthly.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-sm text-base-content/60">
                      No games recorded yet.
                    </td>
                  </tr>
                ) : (
                  stats.monthly.map((row) => (
                    <tr key={row.month}>
                      <td className="text-sm font-semibold">{monthLabel(row.month)}</td>
                      <td className={cn('text-sm', row.counts.bt ? 'text-tier-bt font-semibold' : 'text-base-content/60')}>
                        {row.counts.bt}
                      </td>
                      <td className={cn('text-sm', row.counts.lt ? 'text-tier-lt font-semibold' : 'text-base-content/60')}>
                        {row.counts.lt}
                      </td>
                      <td className={cn('text-sm', row.counts.ht ? 'text-tier-ht font-semibold' : 'text-base-content/60')}>
                        {row.counts.ht}
                      </td>
                      <td className={cn('text-sm', row.counts.et ? 'text-tier-et font-semibold' : 'text-base-content/60')}>
                        {row.counts.et}
                      </td>
                      <td className="text-sm">{row.counts.unknown}</td>
                      <td className="text-sm font-semibold">{row.total}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {stats.monthly.length ? (
                <tfoot>
                  <tr>
                    <th>Total</th>
                    <th className={cn('text-sm font-semibold', stats.totals.bt ? 'text-tier-bt' : 'text-base-content/60')}>
                      {stats.totals.bt}
                    </th>
                    <th className={cn('text-sm font-semibold', stats.totals.lt ? 'text-tier-lt' : 'text-base-content/60')}>
                      {stats.totals.lt}
                    </th>
                    <th className={cn('text-sm font-semibold', stats.totals.ht ? 'text-tier-ht' : 'text-base-content/60')}>
                      {stats.totals.ht}
                    </th>
                    <th className={cn('text-sm font-semibold', stats.totals.et ? 'text-tier-et' : 'text-base-content/60')}>
                      {stats.totals.et}
                    </th>
                    <th className="text-sm font-semibold">{stats.totals.unknown}</th>
                    <th className="text-sm font-semibold">{stats.totals.total}</th>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-base-200 bg-base-100 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">GM activity</h2>
              <p className="text-sm text-base-content/70">
                How often each Discord GM posted a game announcement.
              </p>
            </div>
            <span className="badge badge-ghost badge-sm">Total {stats.totals.total}</span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th className="text-xs font-semibold text-base-content/70">GM</th>
                  <th className="text-xs font-semibold text-base-content/70">Announcements</th>
                </tr>
              </thead>
              <tbody>
                {stats.gms.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="text-sm text-base-content/60">
                      No announcements recorded yet.
                    </td>
                  </tr>
                ) : (
                  stats.gms.map((gm) => (
                    <tr key={`${gm.discord_author_id ?? 'unknown'}-${gm.discord_author_name ?? 'unknown'}`}>
                      <td className="text-sm font-semibold">
                        {gm.discord_author_name || gm.discord_author_id || 'Unknown'}
                      </td>
                      <td className="text-sm">{gm.total}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
