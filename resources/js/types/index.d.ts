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
  betaNoticeEnabled?: boolean
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
  simplified_tracking?: boolean
  avatar_masked?: boolean

  [key: string]: unknown // This allows for additional properties...
}

export interface ShopItem {
  id: number
  item?: Item | null
  item_name?: string | null
  item_url?: string | null
  item_cost?: string | null
  item_rarity?: Item['rarity'] | string | null
  item_type?: Item['type'] | string | null
  snapshot_custom?: boolean | null
  spell?: Spell | null
  spell_name?: string | null
  spell_url?: string | null
  spell_legacy_url?: string | null
  spell_level?: number | null
  spell_school?: Spell['spell_school'] | string | null
  notes?: string | null
}

export interface Shop {
  id: number
  created_at: string
  shop_items: ShopItem[]
}

export interface BackstockItem {
  id: number
  item?: Item | null
  item_name?: string | null
  item_url?: string | null
  item_cost?: string | null
  item_rarity?: Item['rarity'] | string | null
  item_type?: Item['type'] | string | null
  snapshot_custom?: boolean | null
  notes?: string | null
  created_at?: string
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
  item?: Item | null
  item_name?: string | null
  item_url?: string | null
  item_cost?: string | null
  item_rarity?: Item['rarity'] | string | null
  item_type?: Item['type'] | string | null
  snapshot_custom?: boolean | null
  notes?: string | null
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

export interface ShopSettings {
  post_channel_id?: string | null
  post_channel_name?: string | null
  post_channel_type?: string | null
  post_channel_guild_id?: string | null
  post_channel_is_thread?: boolean | null
  last_post_channel_id?: string | null
  auto_post_enabled?: boolean | null
  auto_post_weekday?: number | null
  auto_post_time?: string | null
  last_auto_posted_at?: string | null
}

export interface BackstockSettings {
  post_channel_id?: string | null
  post_channel_name?: string | null
  post_channel_type?: string | null
  post_channel_guild_id?: string | null
  post_channel_is_thread?: boolean | null
  last_post_channel_id?: string | null
}

export interface AuctionSettings {
  post_channel_id?: string | null
  post_channel_name?: string | null
  post_channel_type?: string | null
  post_channel_guild_id?: string | null
  post_channel_is_thread?: boolean | null
  voice_channel_id?: string | null
  voice_channel_name?: string | null
  voice_channel_type?: string | null
  voice_channel_guild_id?: string | null
  voice_channel_is_thread?: boolean | null
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

export interface DiscordBotSettings {
  owner_ids: string[]
}

export interface DiscordBotOwner {
  id: string
  name?: string
  display_name?: string | null
  avatar_url?: string | null
}

export interface DiscordBotOwnersStatus {
  owner_ids: string[]
  updated_at?: string | null
  owners?: DiscordBotOwner[]
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
  shop_enabled?: boolean
  guild_enabled?: boolean
  default_spell_roll_enabled?: boolean
  default_spell_levels?: number[] | null
  default_spell_schools?: Spell['spell_school'][] | null
  ruling_changed?: boolean
  ruling_note?: string | null
}

export interface Spell {
  id: number
  name: string
  url: string
  legacy_url: string
  spell_school: 'abjuration' | 'conjuration' | 'divination' | 'enchantment' | 'evocation' | 'illusion' | 'necromancy' | 'transmutation'
  spell_level: number
  guild_enabled?: boolean
  ruling_changed?: boolean
  ruling_note?: string | null
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
  guild_status?: 'pending' | 'approved' | 'declined' | 'retired'
  room_count?: number
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
    | 'agenten'
    | 'waffenmeister'
    | 'arkanisten'
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
  faction_rank?: number
  simplified_tracking?: boolean
  avatar_masked?: boolean
  external_link: string
  avatar: string
  user_id: number
  user?: {
    id: number
    name: string
    discord_id?: number | null
    simplified_tracking?: boolean
    avatar_masked?: boolean
  }
  character?: Character
}

export interface RoomMap {
  id: number
  name: string
  image_path: string
  grid_columns: number
  grid_rows: number
  rooms?: Room[]
}

export interface RoomAsset {
  id: number
  room_id: number
  user_id?: number | null
  source?: 'upload' | 'library'
  library_path?: string | null
  file_path: string
  original_name?: string | null
  mime_type?: string | null
  size?: number | null
  width?: number | null
  height?: number | null
  pos_x: number
  pos_y: number
  scale: number
  scale_x?: number | null
  scale_y?: number | null
  rotation: number
  locked?: boolean
  z_index?: number | null
}

export interface RoomCharacter {
  id: number
  name: string
  avatar?: string | null
  user_id?: number | null
}

export interface Room {
  id: number
  room_map_id: number
  name: string
  grid_x: number
  grid_y: number
  grid_w: number
  grid_h: number
  character_id?: number | null
  character?: RoomCharacter | null
  assets?: RoomAsset[]
}

export interface Ally {
  id: number
  name: string
  rating: number
  character_id: number
  linked_character_id?: number | null
  linked_character?: Character | null
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
  is_pseudo?: boolean
  notes: string
  game_master: string
  character_id: number
  allies?: Ally[]
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
  tier_of_month_reward?: 'bubble' | 'coin' | null
  sessions: number
  notes: string
  user_id: number
}

export interface GameAnnouncement {
  id: number
  discord_channel_id: string
  discord_guild_id?: string | null
  discord_message_id: string
  discord_author_id?: string | null
  discord_author_name?: string | null
  discord_author_avatar_url?: string | null
  title?: string | null
  content?: string | null
  tier?: 'bt' | 'lt' | 'ht' | 'et' | string | null
  starts_at?: string | null
  posted_at?: string | null
  confidence?: number
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
