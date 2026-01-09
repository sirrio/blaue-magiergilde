import { Card, CardBody, CardContent, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import AppLayout from '@/layouts/app-layout'
import { DiscordBackupChannel, DiscordBackupMessage } from '@/types'
import { Head, Link } from '@inertiajs/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SyntheticEvent } from 'react'

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

const extractDiscordChannelId = (url: string) => {
  const match = url.match(/discord\.com\/channels\/\d+\/(\d+)/)
  return match ? match[1] : null
}

const stripLeadingSymbols = (value: string) => value.replace(/^[^\p{L}\p{N}]+/u, '')

const extractUrlCandidate = (value: string) => {
  const match = value.match(/https?:\/\/[^\s"'<>]+/i)
  if (!match) return null
  return match[0]
    .split('&quot;')[0]
    .split('&lt;')[0]
    .split('&gt;')[0]
    .split('&amp;quot;')[0]
    .split('&amp;lt;')[0]
    .split('&amp;gt;')[0]
}

const normalizeLinkParts = (label: string, url: string) => {
  const cleanLabel = label.replace(/<\/?[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  const candidateUrl = extractUrlCandidate(url) || extractUrlCandidate(cleanLabel) || url.trim()
  const trimmedUrl = candidateUrl
    .replace(/&amp;$/gi, '')
    .replace(/[.,:;"')\]]+$/g, '')
    .replace(/&+$/g, '')
  const labelIsUrl = cleanLabel.toLowerCase().startsWith('http')
  const trimmedLabel = labelIsUrl
    ? trimmedUrl
    : cleanLabel
  return {
    label: trimmedLabel || trimmedUrl || candidateUrl,
    url: trimmedUrl,
  }
}

const buildLabelVariants = (value: string) => {
  const variants = new Set<string>()
  const trimmed = value.trim()
  if (trimmed) variants.add(trimmed)

  const stripped = stripLeadingSymbols(trimmed)
  if (stripped) variants.add(stripped)

  const withSpaces = stripped.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (withSpaces) variants.add(withSpaces)

  return Array.from(variants)
}

const replaceBrokenDiscordLinks = (
  text: string,
  threadLinkMap?: Map<string, string>,
  channelLinkMap?: Map<string, string>,
) => {
  const pattern =
    /(https?:\/\/(?:canary\.|ptb\.)?discord\.com\/channels\/\d+\/\d+(?:\/\d+)?)"\s+target="_blank"\s+rel="noopener noreferrer">/gi
  let result = ''
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text))) {
    const url = match[1]
    const labelStart = pattern.lastIndex

    result += text.slice(lastIndex, match.index)

    const channelId = extractDiscordChannelId(url)
    const candidateName =
      (channelId && threadLinkMap?.get(channelId)) || (channelId && channelLinkMap?.get(channelId)) || ''
    const remaining = text.slice(labelStart)

    let label = ''
    let labelEnd = labelStart

    if (candidateName) {
      for (const variant of buildLabelVariants(candidateName)) {
        const slice = remaining.slice(0, variant.length)
        if (slice.toLowerCase() === variant.toLowerCase()) {
          label = slice
          labelEnd = labelStart + slice.length
          break
        }
      }
    }

    if (!label) {
      const fallback = remaining.match(/^[^\s<]+/)
      if (fallback) {
        label = fallback[0]
        labelEnd = labelStart + label.length
      }
    }

    if (!label) {
      label = url
    }

    result += `[${label}](${url})`
    lastIndex = labelEnd
    pattern.lastIndex = labelEnd
  }

  result += text.slice(lastIndex)
  return result
}

const applyInlineFormatting = (
  value: string,
  threadLinkMap?: Map<string, string>,
  channelLinkMap?: Map<string, string>,
) => {
  let text = value

  const escapeHref = (url: string) => escapeHtml(url.replace(/&amp;/g, '&'))

  const buildThreadLink = (label: string, channelId: string, threadName: string) => {
    const display = threadName || label
    return `<a href="#thread-${channelId}" class="discord-thread-link">${escapeHtml(display)}</a>`
  }

  const buildChannelLink = (label: string, channelId: string, channelName: string) => {
    const display = channelName || label
    const href = route('rules.index', { channel: channelId })
    return `<a href="${escapeHref(href)}" class="discord-thread-link">${escapeHtml(display)}</a>`
  }

  const resolveDiscordLink = (label: string, url: string) => {
    const normalized = normalizeLinkParts(label, url)
    if (!normalized.url || !normalized.url.startsWith('http')) {
      return normalized.label
    }
    const channelId = extractDiscordChannelId(normalized.url)
    if (!channelId) {
      return `<a href="${escapeHref(normalized.url)}" target="_blank" rel="noopener noreferrer">${normalized.label}</a>`
    }
    if (threadLinkMap?.has(channelId)) {
      return buildThreadLink(normalized.label, channelId, threadLinkMap.get(channelId) || '')
    }
    if (channelLinkMap?.has(channelId)) {
      return buildChannelLink(normalized.label, channelId, channelLinkMap.get(channelId) || '')
    }
    return `<a href="${escapeHref(normalized.url)}" target="_blank" rel="noopener noreferrer">${normalized.label}</a>`
  }

  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/__(.+?)__/g, '<u>$1</u>')
  text = text.replace(/~~(.+?)~~/g, '<del>$1</del>')
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>')
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) => {
    return resolveDiscordLink(label, url)
  })
  const protectedHrefs: string[] = []
  text = text.replace(/href="([^"]+)"/g, (_, url) => {
    const token = `@@HREF_${protectedHrefs.length}@@`
    protectedHrefs.push(url)
    return `href="${token}"`
  })
  text = text.replace(/href='([^']+)'/g, (_, url) => {
    const token = `@@HREF_${protectedHrefs.length}@@`
    protectedHrefs.push(url)
    return `href='${token}'`
  })
  text = text.replace(/(https?:\/\/[^\s<]+)/g, (match) => {
    return resolveDiscordLink(match, match)
  })
  text = text.replace(/@@HREF_(\d+)@@/g, (_, index) => protectedHrefs[Number(index)] ?? '')
  return text
}

const buildDiscordHtml = (
  raw: string,
  threadLinkMap?: Map<string, string>,
  channelLinkMap?: Map<string, string>,
) => {
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

  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')

  text = text.replace(
    /<a\s+[^>]*href="(https?:\/\/[^"]+)"[^>]*>(.*?)<\/a>/gi,
    (_, url, label) => `[${label}](${url})`,
  )
  text = text.replace(
    /<a\s+[^>]*href='(https?:\/\/[^']+)'[^>]*>(.*?)<\/a>/gi,
    (_, url, label) => `[${label}](${url})`,
  )
  text = text.replace(/<a\s+[^>]*href="([^"]+)"[^>]*>/gi, (_, url) => `${url} `)
  text = text.replace(/<a\s+[^>]*href='([^']+)'[^>]*>/gi, (_, url) => `${url} `)
  text = text.replace(/<a\s+[^>]*href="([^"]+)"/gi, (_, url) => `${url} `)
  text = text.replace(/<a\s+[^>]*href='([^']+)'/gi, (_, url) => `${url} `)
  text = text.replace(/<\/?a\b[^>]*>/gi, '')
  text = replaceBrokenDiscordLinks(text, threadLinkMap, channelLinkMap)

  text = escapeHtml(text)
  text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  text = text.replace(/^# (.+)$/gm, '<h1>$1</h1>')
  text = text.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
  text = text.replace(/^-# (.+)$/gm, '<span class="discord-subtext">$1</span>')
  text = applyInlineFormatting(text, threadLinkMap, channelLinkMap)
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

const MessageContent = ({
  content,
  threadLinkMap,
  channelLinkMap,
  onThreadLinkClick,
}: {
  content?: string | null
  threadLinkMap?: Map<string, string>
  channelLinkMap?: Map<string, string>
  onThreadLinkClick?: (threadId: string) => void
}) => {
  if (!content) return null
  const html = buildDiscordHtml(content, threadLinkMap, channelLinkMap)

  return (
    <div
      className="discord-markup text-sm text-base-content/90"
      onClick={(event) => {
        const target = event.target as HTMLElement | null
        const anchor = target?.closest('a')
        const href = anchor?.getAttribute('href') ?? ''
        if (href.startsWith('#thread-')) {
          const threadId = href.replace('#thread-', '')
          if (threadId && onThreadLinkClick) {
            onThreadLinkClick(threadId)
          }
        }
      }}
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

const MessageList = ({
  messages,
  threadLinkMap,
  channelLinkMap,
  onThreadLinkClick,
}: {
  messages: DiscordBackupMessage[]
  threadLinkMap?: Map<string, string>
  channelLinkMap?: Map<string, string>
  onThreadLinkClick?: (threadId: string) => void
}) => {
  const visibleMessages = messages.filter(
    (message) => (message.content && message.content.trim() !== '') || (message.attachments ?? []).length > 0,
  )

  if (visibleMessages.length === 0) {
    return <p className="text-xs text-base-content/60">No messages.</p>
  }

  return (
    <div className="space-y-4">
      {visibleMessages.map((message) => (
        <div key={message.id} className="space-y-2">
          <MessageContent
            content={message.content}
            threadLinkMap={threadLinkMap}
            channelLinkMap={channelLinkMap}
            onThreadLinkClick={onThreadLinkClick}
          />
          <MessageAttachments message={message} />
        </div>
      ))}
    </div>
  )
}

export default function RulesIndex({ channels, activeChannelId, messages, threads }: RulesPageProps) {
  const [openThreadId, setOpenThreadId] = useState<string | null>(null)
  const activeChannel = useMemo(
    () => channels.find((channel) => channel.id === activeChannelId) ?? null,
    [channels, activeChannelId],
  )
  const channelLinkMap = useMemo(() => {
    const map = new Map<string, string>()
    channels.forEach((channel) => {
      map.set(channel.id, channel.name)
    })
    return map
  }, [channels])
  const threadLinkMap = useMemo(() => {
    const map = new Map<string, string>()
    threads.forEach((thread) => {
      map.set(thread.channel.id, thread.channel.name)
    })
    return map
  }, [threads])

  useEffect(() => {
    setOpenThreadId(null)
  }, [activeChannelId])

  const handleThreadLinkClick = useCallback((threadId: string) => {
    setOpenThreadId(threadId)
  }, [])

  const handleThreadToggle = useCallback((event: SyntheticEvent<HTMLDetailsElement>) => {
    const threadId = event.currentTarget.dataset.threadId
    if (!threadId) return

    const isOpen = event.currentTarget.open
    setOpenThreadId((previous) => {
      if (isOpen) return threadId
      return previous === threadId ? null : previous
    })
  }, [])

  return (
    <AppLayout>
      <Head title="Guild Handbook" />
      <div className="container mx-auto max-w-6xl space-y-6 px-4 py-6">
        <section className="flex flex-col gap-2 border-b pb-4">
          <h1 className="text-2xl font-bold">Guild Handbook</h1>
          <p className="text-sm text-base-content/70">
            Browse saved guild texts and linked threads in one place.
          </p>
        </section>
        <div className="flex flex-col gap-4 md:flex-row">
          <aside className="md:w-64">
            <Card className="card-xs">
              <CardBody>
                <CardTitle>Channels</CardTitle>
                <CardContent>
                  {channels.length === 0 ? (
                    <p className="text-xs text-base-content/60">No content saved yet.</p>
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
                <CardTitle>{activeChannel ? activeChannel.name : 'Guild Handbook'}</CardTitle>
                <CardContent>
                  {activeChannel ? (
                    <div className="space-y-6">
                      <MessageList
                        messages={messages}
                        threadLinkMap={threadLinkMap}
                        channelLinkMap={channelLinkMap}
                        onThreadLinkClick={handleThreadLinkClick}
                      />
                      {threads.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-xs font-semibold uppercase text-base-content/50">Threads</p>
                          {threads.map((thread) => (
                            <details
                              key={thread.channel.id}
                              id={`thread-${thread.channel.id}`}
                              className="rounded-box border border-base-200 p-3"
                              data-thread-id={thread.channel.id}
                              open={openThreadId === thread.channel.id}
                              onToggle={handleThreadToggle}
                            >
                              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold">
                                <span className="truncate">{thread.channel.name}</span>
                                <span className="text-xs font-normal text-base-content/60">
                                  {thread.messages.length} Messages
                                </span>
                              </summary>
                              <div className="mt-3">
                                <MessageList
                                  messages={thread.messages}
                                  threadLinkMap={threadLinkMap}
                                  channelLinkMap={channelLinkMap}
                                  onThreadLinkClick={handleThreadLinkClick}
                                />
                              </div>
                            </details>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-base-content/60">
                      No content found. Select text channels in Admin settings.
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
