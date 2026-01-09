import type { Config } from 'ziggy-js'

export interface PageProps {
  name: string
  quote: { message: string; author: string }
  auth: Auth
  appearance: string
  classes: CharacterClass[]
  tiers: object
  versions: string[]
  factions: object
  features: { discord: boolean; character_manager: boolean }
  discordConnected: boolean
  handbookChannels?: { id: string; name: string }[]
  activeChannelId?: string | null
  ziggy: Config & { location: string }

  [key: string]: unknown
}

export interface Auth {
  user: User
}

export interface User {
  id: number
  name: string
  email: string
  avatar?: string
  created_at: string
  updated_at: string
  is_admin: boolean

  [key: string]: unknown // This allows for additional properties...
}

export interface ShopItem {
  id: number
  item: Item
  spell?: Spell | null
}

export interface Shop {
  id: number
  created_at: string
  shop_items: ShopItem[]
}

export interface AuctionBid {
  id: number
  bidder_name: string
  bidder_discord_id: string
  amount: number
  created_at: string
}

export interface AuctionHiddenBid {
  id: number
  bidder_name: string
  bidder_discord_id: string
  max_amount: number
  created_at: string
}

export interface AuctionItem {
  id: number
  item: Item
  notes?: string | null
  starting_bid: number
  repair_current?: number | null
  repair_max?: number | null
  remaining_auctions: number
  bids: AuctionBid[]
  hidden_bids: AuctionHiddenBid[]
}

export interface AuctionVoiceCandidate {
  id: string
  name: string
  avatar?: string | null
}

export interface VoiceSettings {
  voice_channel_id?: string | null
}

export interface ShopSettings {
  post_channel_id?: string | null
  post_channel_name?: string | null
  post_channel_type?: string | null
  post_channel_guild_id?: string | null
  post_channel_is_thread?: boolean | null
}

export interface DiscordBackupStats {
  channels: number
  messages: number
  attachments: number
  last_synced_at?: string | null
  available_channels?: Record<string, DiscordBackupChannel[]>
  selected_channels?: Record<string, string[]>
  selected_channels_details?: Record<string, DiscordBackupChannel[]>
}

export interface DiscordBackupChannel {
  id: string
  guild_id: string
  name: string
  type: string
  parent_id?: string | null
  is_thread: boolean
  last_synced_at?: string | null
  messages_count?: number
}

export interface DiscordBackupStatus {
  running: boolean
  started_at?: string | null
  finished_at?: string | null
  updated_at?: string | null
  total_channels: number
  processed_channels: number
  processed_messages: number
  current_channel?: {
    id: string
    name: string
    guild_id: string
  } | null
}

export interface DiscordBackupAttachment {
  id: number
  filename: string
  url: string
  storage_path?: string | null
}

export interface DiscordBackupMessage {
  id: string
  author_name: string
  author_display_name?: string | null
  content?: string | null
  message_type: number
  is_pinned: boolean
  sent_at?: string | null
  edited_at?: string | null
  attachments: DiscordBackupAttachment[]
}

export interface Auction {
  id: number
  title?: string | null
  status: 'open' | 'closed' | 'draft'
  currency: string
  created_at: string
  posted_at?: string | null
  auction_items: AuctionItem[]
}

export interface Item {
  id: number
  name: string
  url: string
  cost: string
  type: 'item' | 'consumable' | 'spellscroll'
  rarity: 'common' | 'uncommon' | 'rare' | 'very_rare'
  pick_count: number
}

export interface Spell {
  id: number
  name: string
  url: string
  legacy_url: string
  spell_school: 'abjuration' | 'conjuration' | 'divination' | 'enchantment' | 'evocation' | 'illusion' | 'necromancy' | 'transmutation'
  spell_level: number
}

export interface CharacterClass {
  id: number
  name: string
  src: string
}

export interface Character {
  position: number
  character_classes: CharacterClass[]
  adventures: Adventure[]
  downtimes: Downtime[]
  allies: Ally[]
  deleted_at: string
  guild_status?: 'pending' | 'approved' | 'declined'
  admin_notes?: string | null
  faction:
    | 'none'
    | 'heiler'
    | 'handwerker'
    | 'feldforscher'
    | 'bibliothekare'
    | 'diplomaten'
    | 'gardisten'
    | 'unterhalter'
    | 'logistiker'
    | 'flora & fauna'
  notes: string
  id: number
  name: string
  class: Array<CharacterClass>
  start_tier: 'bt' | 'lt' | 'ht' | 'et'
  version: '2014' | '2024'
  dm_bubbles: number
  dm_coins: number
  is_filler: boolean
  bubble_shop_spend: number
  external_link: string
  avatar: string
  user_id: number
  user?: {
    id: number
    name: string
    discord_id?: number | null
  }
  character?: Character
}

export interface Ally {
  id: number
  name: string
  standing: 'best' | 'good' | 'normal' | 'bad'
  character_id: number
  avatar: string | File
  notes: string
  classes: string
  species: string
}

export interface Adventure {
  id: number
  title: string
  duration: number
  start_date: string
  has_additional_bubble: boolean
  notes: string
  game_master: string
  character_id: number
}

export interface Downtime {
  id: number
  duration: number
  start_date: string
  type: 'faction' | 'other'
  notes: string
  character_id: number
}


export interface Game {
  id: number
  title: string
  tier: 'bt' | 'lt' | 'ht' | 'et'
  duration: number
  start_date: string
  has_additional_bubble: boolean
  sessions: number
  notes: string
  user_id: number
}

export interface SharedData {
  name: string
  quote: { message: string; author: string }
  auth: Auth
  classes: CharacterClass[]
  factions: string[]
  versions: string[]
  ziggy: Config & { location: string }

  [key: string]: unknown
}
