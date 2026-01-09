import { Button } from '@/components/ui/button'
import { Card, CardBody, CardContent } from '@/components/ui/card'
import AppLayout from '@/layouts/app-layout'
import { DiscordBackupChannel } from '@/types'
import { Head, Link } from '@inertiajs/react'

interface DiscordBackupIndexProps {
  channels: DiscordBackupChannel[]
  selected: Record<string, string[]>
}

export default function DiscordBackupIndex({ channels, selected }: DiscordBackupIndexProps) {
  const selectedSet = new Set(
    Object.entries(selected).flatMap(([_, channelIds]) => channelIds)
  )

  return (
    <AppLayout>
      <Head title="Discord Backup" />
      <div className="container mx-auto max-w-4xl space-y-6 px-4 py-6">
        <section className="flex flex-col gap-2 border-b pb-4">
          <h1 className="text-2xl font-bold">Discord Backup</h1>
          <p className="text-sm text-base-content/70">
            Saved channel content. Only admins have access.
          </p>
        </section>
        <Card className="card-xs">
          <CardBody>
            <CardContent>
              {channels.length === 0 ? (
                <p className="mt-4 text-sm text-base-content/70">No backups available yet.</p>
              ) : (
                <div className="mt-4 flex flex-col gap-2">
                  {channels.map((channel) => (
                    <div
                      key={channel.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-box border border-base-200 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{channel.name}</p>
                        <p className="text-xs text-base-content/70">
                          {channel.guild_id} · {channel.type}
                          {channel.messages_count !== undefined ? ` · ${channel.messages_count} Messages` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedSet.has(channel.id) && (
                          <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                            Selected
                          </span>
                        )}
                        <Button size="sm" variant="outline" as={Link} href={route('admin.discord-backup.show', channel.id)}>
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CardBody>
        </Card>
      </div>
    </AppLayout>
  )
}
