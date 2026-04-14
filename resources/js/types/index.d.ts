import type { Config } from 'ziggy-js'

export interface PageProps {
  name: string
  quote: { message: string; author: string }
  auth: Auth
  locale: 'de' | 'en'
  availableLocales?: Array<'de' | 'en'>
  appearance: string
  classes: CharacterClass[]
  tiers: object
  versions: string[]
  factions: object
  features: { games_calendar: boolean; rooms: boolean; character_status_switch: boolean }
  botChannelOverride?: { active: boolean; channel_id?: string | null }
  discordConnected: boolean
  impersonating?: { name: string } | null
  handbookChannels?: { id: string; name: string }[]
  levelProgressionTotals?: Record<number, number>
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
  email: string | null
  discord_username?: string | null
  discord_display_name?: string | null
  discord_id?: string | number | null
  avatar?: string
  locale?: 'de' | 'en' | null
  created_at: string
  updated_at: string
  is_admin: boolean
  simplified_tracking?: boolean | null
  avatar_masked?: boolean
  has_password?: boolean
  needs_password_fallback?: boolean

  [key: string]: unknown // This allows for additional properties...
}

export interface ShopItem {
  id: number
  item_id?: number | null
  item?: Item | null
  item_name?: string | null
  item_url?: string | null
  item_cost?: string | null
  item_rarity?: Item['rarity'] | string | null
  item_type?: Item['type'] | string | null
  item_ruling_changed?: boolean | null
  item_ruling_note?: string | null
  roll_source_kind?: ShopRollRule['source_kind'] | null
  roll_rule_id?: number | null
  source_shortcode?: string | null
  snapshot_custom?: boolean | null
  spell_id?: number | null
  spell?: Spell | null
  spell_name?: string | null
  spell_url?: string | null
  spell_legacy_url?: string | null
  spell_level?: number | null
  spell_school?: Spell['spell_school'] | string | null
  spell_ruling_changed?: boolean | null
  spell_ruling_note?: string | null
  notes?: string | null
}

export interface Shop {
  id: number
  created_at: string
  roll_rows_snapshot?: ShopRollRule[] | null
  shop_items: ShopItem[]
}

export interface BackstockItem {
  id: number
  item_id?: number | null
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
  item_id?: number | null
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
  sold_at?: string | null
  sold_bid_id?: number | null
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
  current_shop_id?: number | null
  draft_shop_id?: number | null
  line_template?: string | null
  auto_roll_after_publish?: boolean | null
  keep_previous_post?: boolean | null
  roll_rules?: ShopRollRule[]
}

export interface ShopRollRule {
  id?: number
  row_kind: 'heading' | 'rule'
  rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary' | 'artifact' | 'unknown_rarity'
  selection_types: Array<'weapon' | 'armor' | 'item' | 'consumable' | 'spellscroll'>
  source_kind: 'all' | 'official' | 'partnered'
  heading_title: string
  count: number
  sort_order?: number
}

export interface BotOperation {
  id: number
  resource: 'shop' | 'auction' | 'backstock' | string
  resource_id?: number | null
  action: 'publish_draft' | 'update_current_post' | 'post_auction' | 'post_backstock' | string
  status: 'pending' | 'posting_to_discord' | 'rotating_pointers' | 'completed' | 'failed' | string
  step?: 'pending' | 'posting_to_discord' | 'rotating_pointers' | 'completed' | string | null
  channel_id?: string | null
  shop_id?: number | null
  result_shop_id?: number | null
  current_shop_id?: number | null
  draft_shop_id?: number | null
  error?: string | null
  meta?: {
    total_lines?: number | null
    posted_lines?: number | null
    last_line?: string | null
  } | null
  started_at?: string | null
  finished_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface BackstockSettings {
  post_channel_id?: string | null
  post_channel_name?: string | null
  post_channel_type?: string | null
  post_channel_guild_id?: string | null
  post_channel_is_thread?: boolean | null
  last_post_channel_id?: string | null
  last_post_item_message_ids?: Record<string, string> | null
}

export interface AuctionSettings {
  post_channel_id?: string | null
  post_channel_name?: string | null
  post_channel_type?: string | null
  post_channel_guild_id?: string | null
  post_channel_is_thread?: boolean | null
  last_post_channel_id?: string | null
  last_post_item_message_ids?: Record<string, string> | null
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
  character_approval_channel_id?: string | null
  character_approval_channel_name?: string | null
  character_approval_channel_guild_id?: string | null
  support_ticket_channel_id?: string | null
  support_ticket_channel_name?: string | null
  support_ticket_channel_guild_id?: string | null
  games_channel_id?: string | null
  games_channel_name?: string | null
  games_channel_guild_id?: string | null
  games_scan_years?: number | null
  games_scan_interval_minutes?: number | null
}

export interface Source {
  id: number
  name: string
  shortcode: string
  kind: 'official' | 'partnered'
}

export interface MundaneItemVariant {
  id: number
  name: string
  slug: string
  category: 'weapon' | 'armor'
  cost_gp?: number | null
  is_placeholder?: boolean
  guild_enabled?: boolean
}

export interface CompendiumImportRun {
  id: number
  entity_type: 'items' | 'spells' | 'sources'
  filename: string
  total_rows: number
  new_rows: number
  updated_rows: number
  deleted_rows: number
  unchanged_rows: number
  invalid_rows: number
  error_samples?: Array<{ line?: number; message?: string }> | null
  applied_at?: string | null
  user?: { id: number; name: string } | null
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
  cost: string | null
  extra_cost_note?: string | null
  display_cost?: string | null
  type: 'weapon' | 'armor' | 'item' | 'consumable' | 'spellscroll'
  rarity: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary' | 'artifact' | 'unknown_rarity'
  pick_count: number
  shop_enabled?: boolean
  guild_enabled?: boolean
  default_spell_roll_enabled?: boolean
  default_spell_levels?: number[] | null
  default_spell_schools?: Spell['spell_school'][] | null
  ruling_changed?: boolean
  ruling_note?: string | null
  source_id?: number | null
  source?: Source | null
  mundane_variant_ids?: number[]
  mundane_variants?: MundaneItemVariant[]
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
  source_id?: number | null
  source?: Source | null
}

export interface CharacterClass {
  id: number
  name: string
  source_id?: number | null
  source?: Source | null
  guild_enabled?: boolean
}

export interface CharacterSubclass {
  id: number
  character_class_id: number
  name: string
  source_id?: number | null
  source?: Source | null
}

export interface Character {
  position: number
  character_classes: CharacterClass[]
  adventures: Adventure[]
  downtimes: Downtime[]
  allies: Ally[]
  deleted_at: string
  guild_status?: 'pending' | 'approved' | 'declined' | 'needs_changes' | 'retired' | 'draft'
  registration_note?: string | null
  review_note?: string | null
  reviewed_by_name?: string | null
  is_first_submission?: boolean
  room_count?: number
  admin_notes?: string | null
  admin_managed?: boolean
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
  start_tier: 'bt' | 'lt' | 'ht'
  version: '2014' | '2024'
  dm_bubbles: number
  dm_coins: number
  is_filler: boolean
  bubble_shop_spend: number
  faction_rank?: number
  manual_adventures_count?: number | null
  manual_faction_rank?: number | null
  simplified_tracking?: boolean
  avatar_masked?: boolean
  private_mode?: boolean
  external_link: string
  avatar: string
  user_id: number
  user?: {
    id: number
    name: string
    discord_id?: number | null
    discord_username?: string | null
    discord_display_name?: string | null
    avatar?: string | null
    simplified_tracking?: boolean | null
    avatar_masked?: boolean
    private_mode?: boolean
  }
  can_force_delete?: boolean
  force_delete_block_reason?: string | null
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
  shared_adventure_count?: number
}

export interface Adventure {
  id: number
  title: string
  duration: number
  start_date: string
  has_additional_bubble: boolean
  is_pseudo?: boolean
  target_level?: number | null
  target_bubbles?: number | null
  progression_version_id?: number | null
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
