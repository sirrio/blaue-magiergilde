import { Card, CardBody, CardContent, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import AppLayout from '@/layouts/app-layout'
import { DiscordBackupChannel, DiscordBackupMessage } from '@/types'
import { Head, Link } from '@inertiajs/react'
import { useMemo } from 'react'

type ThreadBlock = {
  channel: DiscordBackupChannel
  messages: DiscordBackupMessage[]
}

interface RulesPageProps {
  channels: DiscordBackupChannel[]
  activeChannelId?: string | null
  messages: DiscordBackupMessage[]
  threads: ThreadBlock[]
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const applyInlineFormatting = (value: string) => {
  let text = value
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/__(.+?)__/g, '<u>$1</u>')
  text = text.replace(/~~(.+?)~~/g, '<del>$1</del>')
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>')
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
  text = text.replace(/(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
  return text
}

const buildDiscordHtml = (raw: string) => {
  const normalized = raw.replace(/\r\n/g, '\n')
  const codeBlocks: string[] = []
  const inlineCodes: string[] = []

  let text = normalized.replace(/```([\s\S]*?)```/g, (_, code) => {
    const token = `@@CODEBLOCK_${codeBlocks.length}@@`
    codeBlocks.push(code)
    return token
  })

  text = text.replace(/`([^`]+)`/g, (_, code) => {
    const token = `@@INLINE_${inlineCodes.length}@@`
    inlineCodes.push(code)
    return token
  })

  text = escapeHtml(text)
  text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  text = text.replace(/^# (.+)$/gm, '<h1>$1</h1>')
  text = text.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
  text = applyInlineFormatting(text)
  text = text.replace(/\n/g, '<br />')

  text = text.replace(/@@INLINE_(\d+)@@/g, (_, index) => {
    const code = inlineCodes[Number(index)] ?? ''
    return `<code>${escapeHtml(code)}</code>`
  })

  text = text.replace(/@@CODEBLOCK_(\d+)@@/g, (_, index) => {
    const code = codeBlocks[Number(index)] ?? ''
    return `<pre><code>${escapeHtml(code)}</code></pre>`
  })

  return text
}

const isImageAttachment = (filename: string) => /\.(png|jpe?g|gif|webp)$/i.test(filename)

const MessageContent = ({ content }: { content?: string | null }) => {
  if (!content) return null
  const html = buildDiscordHtml(content)

  return (
    <div
      className="discord-markup text-sm text-base-content/90"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

const MessageAttachments = ({ message }: { message: DiscordBackupMessage }) => {
  if (!message.attachments || message.attachments.length === 0) return null

  return (
    <div className="mt-2 flex flex-col gap-2 text-xs">
      {message.attachments.map((attachment) => {
        const href = attachment.storage_path
          ? route('rules.attachments.show', attachment.id)
          : attachment.url
        const isImage = isImageAttachment(attachment.filename)

        if (isImage) {
          return (
            <a key={attachment.id} href={href} className="max-w-full" target="_blank" rel="noreferrer">
              <img
                src={href}
                alt={attachment.filename}
                className="max-h-80 rounded-box border border-base-200 object-contain"
              />
            </a>
          )
        }

        return (
          <a
            key={attachment.id}
            className="link link-primary truncate"
            href={href}
            target="_blank"
            rel="noreferrer"
          >
            {attachment.filename}
          </a>
        )
      })}
    </div>
  )
}

const MessageList = ({ messages }: { messages: DiscordBackupMessage[] }) => {
  const visibleMessages = messages.filter(
    (message) => (message.content && message.content.trim() !== '') || (message.attachments ?? []).length > 0,
  )

  if (visibleMessages.length === 0) {
    return <p className="text-xs text-base-content/60">Keine Nachrichten.</p>
  }

  return (
    <div className="space-y-4">
      {visibleMessages.map((message) => (
        <div key={message.id} className="space-y-2">
          <MessageContent content={message.content} />
          <MessageAttachments message={message} />
        </div>
      ))}
    </div>
  )
}

export default function RulesIndex({ channels, activeChannelId, messages, threads }: RulesPageProps) {
  const activeChannel = useMemo(
    () => channels.find((channel) => channel.id === activeChannelId) ?? null,
    [channels, activeChannelId],
  )

  return (
    <AppLayout>
      <Head title="Rules" />
      <div className="container mx-auto flex max-w-6xl flex-col gap-4 px-2 py-4 md:px-0">
        <div className="flex flex-col gap-4 md:flex-row">
          <aside className="md:w-64">
            <Card className="card-xs">
              <CardBody>
                <CardTitle>Rules</CardTitle>
                <CardContent>
                  {channels.length === 0 ? (
                    <p className="text-xs text-base-content/60">Keine Regeln gespeichert.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <select
                        className="select select-sm md:hidden"
                        value={activeChannelId ?? ''}
                        onChange={(event) => {
                          const channelId = event.target.value
                          if (channelId) {
                            window.location.href = route('rules.index', { channel: channelId })
                          }
                        }}
                      >
                        {channels.map((channel) => (
                          <option key={channel.id} value={channel.id}>
                            {channel.name}
                          </option>
                        ))}
                      </select>
                      <ul className="menu hidden gap-1 md:flex" role="menu">
                        {channels.map((channel) => (
                          <li key={channel.id} role="none">
                            <Link
                              role="menuitem"
                              className={cn(
                                'truncate',
                                channel.id === activeChannelId ? 'menu-active' : '',
                              )}
                              href={route('rules.index', { channel: channel.id })}
                            >
                              {channel.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </CardBody>
            </Card>
          </aside>
          <section className="flex-1">
            <Card className="card-xs">
              <CardBody>
                <CardTitle>{activeChannel ? activeChannel.name : 'Regeln'}</CardTitle>
                <CardContent>
                  {activeChannel ? (
                    <div className="space-y-6">
                      <MessageList messages={messages} />
                      {threads.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-xs font-semibold uppercase text-base-content/50">Threads</p>
                          {threads.map((thread) => (
                            <details key={thread.channel.id} className="rounded-box border border-base-200 p-3">
                              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold">
                                <span className="truncate">{thread.channel.name}</span>
                                <span className="text-xs font-normal text-base-content/60">
                                  {thread.messages.length} Messages
                                </span>
                              </summary>
                              <div className="mt-3">
                                <MessageList messages={thread.messages} />
                              </div>
                            </details>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-base-content/60">
                      Keine Regeln gefunden. Waehle im Admin-Bereich die Rule-Channels aus.
                    </p>
                  )}
                </CardContent>
              </CardBody>
            </Card>
          </section>
        </div>
      </div>
    </AppLayout>
  )
}
