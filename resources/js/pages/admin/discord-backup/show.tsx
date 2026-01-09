import { Button } from '@/components/ui/button'
import { Card, CardBody, CardContent, CardTitle } from '@/components/ui/card'
import AppLayout from '@/layouts/app-layout'
import { DiscordBackupChannel, DiscordBackupMessage } from '@/types'
import { Head, Link } from '@inertiajs/react'

interface DiscordBackupShowProps {
  channel: DiscordBackupChannel
  messages: {
    data: DiscordBackupMessage[]
    links: { url: string | null; label: string; active: boolean }[]
  }
}

export default function DiscordBackupShow({ channel, messages }: DiscordBackupShowProps) {
  return (
    <AppLayout>
      <Head title={`Discord Backup · ${channel.name}`} />
      <div className="container mx-auto max-w-4xl space-y-4 px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold">{channel.name}</h1>
            <p className="text-xs text-base-content/70">
              {channel.guild_id} · {channel.type}
              {channel.last_synced_at ? ` · Last backup: ${new Date(channel.last_synced_at).toLocaleString()}` : ''}
            </p>
          </div>
          <Button size="sm" variant="outline" as={Link} href={route('admin.discord-backup.index')}>
            Back
          </Button>
        </div>

        <Card className="card-xs">
          <CardBody>
            <CardTitle>Messages</CardTitle>
            <CardContent>
              {messages.data.length === 0 ? (
                <p className="text-sm text-base-content/70">No messages saved.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {messages.data.map((message) => (
                    <div key={message.id} className="rounded-box border border-base-200 p-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold">
                          {message.author_display_name || message.author_name}
                        </p>
                        <p className="text-xs text-base-content/60">
                          {message.sent_at ? new Date(message.sent_at).toLocaleString() : '—'}
                        </p>
                      </div>
                      {message.content && (
                        <p className="mt-2 whitespace-pre-wrap text-sm">{message.content}</p>
                      )}
                      {(message.attachments ?? []).length > 0 && (
                        <div className="mt-2 flex flex-col gap-1 text-xs">
                          {(message.attachments ?? []).map((attachment) => (
                            <a
                              key={attachment.id}
                              className="link link-primary truncate"
                              href={
                                attachment.storage_path
                                  ? route('admin.discord-backup.attachments.show', attachment.id)
                                  : attachment.url
                              }
                              target={attachment.storage_path ? undefined : '_blank'}
                              rel={attachment.storage_path ? undefined : 'noreferrer'}
                            >
                              {attachment.filename}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {messages.links.length > 1 && (
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  {messages.links.map((link) => (
                    <Button
                      key={link.label}
                      variant={link.active ? undefined : 'ghost'}
                      size="xs"
                      as={Link}
                      href={link.url || ''}
                      disabled={!link.url}
                      dangerouslySetInnerHTML={{ __html: link.label }}
                    />
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
