import * as React from 'react'
import { siDiscord } from 'simple-icons/icons'

export default function DiscordIcon({ width = 24, className }: { width?: number; className?: string }) {
  return (
    <svg
      role="img"
      width={width}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill={`#${siDiscord.hex}`}
    >
      <title>Discord</title>
      <path d={siDiscord.path} />
    </svg>
  )
}
