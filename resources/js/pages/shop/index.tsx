import { Button } from '@/components/ui/button'
import BotOperationProgress, { isTerminalBotOperation } from '@/components/bot-operation-progress'
import { List, ListRow } from '@/components/ui/list'
import { Modal, ModalContent, ModalTitle, ModalTrigger } from '@/components/ui/modal'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import DiscordChannelPickerModal from '@/components/discord-channel-picker-modal'
import AppLayout from '@/layouts/app-layout'
import ItemRow from '@/pages/item/item-row'
import { cn } from '@/lib/utils'
import { renderDiscordLine, DEFAULT_LINE_TEMPLATE, LINE_TEMPLATE_VARIABLES } from '@/lib/shopLineTemplate'
import { BotOperation, DiscordBackupChannel, Item, PageProps, Shop, ShopItem, ShopRollRule, ShopSettings } from '@/types'
import { closestCenter, DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Head, router, usePage } from '@inertiajs/react'
import { format } from 'date-fns'
import { Copy, GripVertical, Plus, RotateCcw, Send, Settings, SlidersHorizontal, Trash2 } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'

const rarityOptions: Array<{ value: ShopRollRule['rarity']; label: string }> = [
  { value: 'common', label: 'Common' },
  { value: 'uncommon', label: 'Uncommon' },
  { value: 'rare', label: 'Rare' },
  { value: 'very_rare', label: 'Very rare' },
  { value: 'legendary', label: 'Legendary' },
  { value: 'artifact', label: 'Artifact' },
  { value: 'unknown_rarity', label: 'Unknown rarity' },
]

const itemTypeOptions: Array<{ value: ShopRollRule['selection_types'][number]; label: string }> = [
  { value: 'weapon', label: 'Weapons' },
  { value: 'armor', label: 'Armor' },
  { value: 'item', label: 'Items' },
  { value: 'consumable', label: 'Consumables' },
  { value: 'spellscroll', label: 'Spell scrolls' },
]

const sourceKindOptions: Array<{ value: ShopRollRule['source_kind']; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'official', label: 'Official' },
  { value: 'partnered', label: 'Partnered' },
]

const itemTypeBadgeLabels: Record<ShopRollRule['selection_types'][number], string> = {
  weapon: 'Wpn',
  armor: 'Arm',
  item: 'Item',
  consumable: 'Cons',
  spellscroll: 'Scroll',
}

const createEmptyRollRule = (sortOrder: number): ShopRollRule => ({
  row_kind: 'rule',
  rarity: 'common',
  selection_types: ['item'],
  source_kind: 'all',
  heading_title: '',
  count: 1,
  sort_order: sortOrder,
})

const createEmptyHeading = (sortOrder: number): ShopRollRule => ({
  row_kind: 'heading',
  rarity: 'common',
  selection_types: ['item'],
  source_kind: 'all',
  heading_title: '## ***:crossed_swords: New heading:***',
  count: 0,
  sort_order: sortOrder,
})

const normalizeRollRulesForSave = (rules: ShopRollRule[]): ShopRollRule[] => {
  return rules.map((rule, index) => {
    const sortOrder = (index + 1) * 10

    if (rule.row_kind === 'heading') {
      const headingTitle = rule.heading_title.trim()

      return {
        ...rule,
        heading_title: headingTitle,
        rarity: 'common',
        selection_types: ['item'],
        source_kind: 'all',
        count: 0,
        sort_order: sortOrder,
      }
    }

    return {
      ...rule,
      row_kind: 'rule',
      heading_title: '',
      count: Number(rule.count),
      sort_order: sortOrder,
    }
  })
}

type ShopDisplayRow =
  | { key: string; type: 'heading'; title: string }
  | { key: string; type: 'item'; item: ShopItem }

type EditableShopRollRule = ShopRollRule & { client_key: string }

type SortableRollRuleRowProps = {
  index: number
  rollRulesLength: number
  rule: EditableShopRollRule
  handleRollRuleChange: <K extends keyof ShopRollRule>(index: number, key: K, value: ShopRollRule[K]) => void
  handleToggleRollRuleType: (index: number, type: ShopRollRule['selection_types'][number]) => void
  handleDuplicateRollRule: (index: number) => void
  handleRemoveRollRule: (index: number) => void
}

function SortableRollRuleRow({
  index,
  rollRulesLength,
  rule,
  handleRollRuleChange,
  handleToggleRollRuleType,
  handleDuplicateRollRule,
  handleRemoveRollRule,
}: SortableRollRuleRowProps) {
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rule.client_key,
  })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'grid gap-1.5 rounded-box border border-base-200 px-2 py-1.5',
        'lg:grid-cols-[46px_64px_108px_minmax(0,1fr)_104px_56px_64px] lg:items-center',
        rule.row_kind === 'heading' && 'bg-base-200/25',
        isDragging && 'opacity-80 shadow-lg ring-1 ring-primary/20',
      )}
    >
      <div className="flex items-center justify-between gap-3 lg:justify-start">
        <span className="text-xs font-semibold uppercase tracking-wide text-base-content/60 lg:hidden">
          {rule.row_kind === 'heading' ? `Heading ${index + 1}` : `Rule ${index + 1}`}
        </span>
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="inline-flex h-7 min-h-7 w-7 items-center justify-center rounded-btn text-base-content/55 transition hover:bg-base-200 hover:text-base-content active:cursor-grabbing lg:h-5 lg:min-h-5 lg:w-5"
          aria-label={`Drag ${rule.row_kind} ${index + 1}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={12} />
        </button>
      </div>
      <div className="flex items-center lg:justify-center">
        <span
          className={cn(
            'rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
            rule.row_kind === 'heading'
              ? 'border-secondary/30 bg-secondary/10 text-secondary'
              : 'border-primary/30 bg-primary/10 text-primary',
          )}
        >
          {rule.row_kind === 'heading' ? 'Heading' : 'Rule'}
        </span>
      </div>
      {rule.row_kind === 'heading' ? (
        <div className="space-y-1 lg:col-span-4 lg:space-y-0">
          <span className="block text-xs text-base-content/70 lg:hidden">Discord heading line</span>
          <input
            type="text"
            className="input input-xs lg:h-7 lg:min-h-7 lg:text-xs"
            placeholder="## ***:crossed_swords: Rare Items:***"
            value={rule.heading_title}
            onChange={(event) => handleRollRuleChange(index, 'heading_title', event.target.value)}
          />
        </div>
      ) : (
        <>
          <Select
            value={rule.rarity}
            className="select-xs lg:min-h-7 lg:h-7 lg:text-xs"
            onChange={(event) => handleRollRuleChange(index, 'rarity', event.target.value as ShopRollRule['rarity'])}
          >
            <SelectLabel className="lg:hidden">Rarity</SelectLabel>
            <SelectOptions>
              {rarityOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </SelectOptions>
          </Select>
          <div className="space-y-1">
            <p className="text-xs font-medium text-base-content/70 lg:hidden">Types</p>
            <div className="dropdown w-full">
              <div tabIndex={0} role="button" className="flex min-h-7 w-full items-center justify-between rounded-btn border border-base-300 bg-base-100 px-1.5 py-0.5 text-left text-[11px] text-base-content/80">
                <div className="flex min-w-0 flex-wrap items-center gap-1">
                  {rule.selection_types.map((type) => (
                    <span
                      key={type}
                      className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary"
                    >
                      {itemTypeBadgeLabels[type]}
                    </span>
                  ))}
                </div>
                <span className="shrink-0 text-[9px] text-base-content/45">Edit</span>
              </div>
              <div tabIndex={0} className="dropdown-content z-10 mt-2 w-64 rounded-box border border-base-200 bg-base-100 p-2 shadow-xl">
                <div className="space-y-1">
                  {itemTypeOptions.map((option) => {
                    const active = rule.selection_types.includes(option.value)

                    return (
                      <label
                        key={option.value}
                        className={cn(
                          'flex cursor-pointer items-center gap-2 rounded-btn px-2 py-1.5 text-xs transition',
                          active ? 'bg-primary/10 text-primary' : 'text-base-content/80 hover:bg-base-200',
                        )}
                      >
                        <input
                          type="checkbox"
                          className="checkbox checkbox-xs"
                          checked={active}
                          onChange={() => handleToggleRollRuleType(index, option.value)}
                        />
                        {option.label}
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
          <Select
            value={rule.source_kind}
            className="select-xs lg:min-h-7 lg:h-7 lg:text-xs"
            onChange={(event) => handleRollRuleChange(index, 'source_kind', event.target.value as ShopRollRule['source_kind'])}
          >
            <SelectLabel className="lg:hidden">Source</SelectLabel>
            <SelectOptions>
              {sourceKindOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </SelectOptions>
          </Select>
          <div className="space-y-1">
            <span className="block text-xs text-base-content/70 lg:hidden">Count</span>
            <input
              type="number"
              min={0}
              className="input input-xs w-full lg:h-7 lg:min-h-7 lg:px-1.5 lg:text-center lg:text-xs"
              value={rule.count}
              onChange={(event) => handleRollRuleChange(index, 'count', Math.max(0, Number(event.target.value) || 0))}
            />
          </div>
        </>
      )}
      <div className="flex items-center justify-end gap-1">
        <Button
          size="sm"
          variant="ghost"
          modifier="square"
          className="h-6 min-h-6 w-6 text-base-content/60 hover:text-base-content"
          onClick={() => handleDuplicateRollRule(index)}
          aria-label={`Duplicate ${rule.row_kind} ${index + 1}`}
        >
          <Copy size={12} />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          modifier="square"
          className="h-6 min-h-6 w-6 text-error/70 hover:text-error"
          onClick={() => handleRemoveRollRule(index)}
          aria-label={`Remove ${rule.row_kind} ${index + 1}`}
          disabled={rollRulesLength === 1}
        >
          <Trash2 size={12} />
        </Button>
      </div>
    </div>
  )
}

export default function Index({ shops, shopSettings }: { shops: Shop[]; shopSettings: ShopSettings }) {
  const resolveFallbackShop = useCallback(
    (availableShops: Shop[], preferredShopId?: number | null): Shop | null => {
      if (!availableShops.length) return null
      if (preferredShopId) {
        const preferred = availableShops.find((shop) => shop.id === preferredShopId)
        if (preferred) return preferred
      }
      return availableShops[0] ?? null
    },
    [],
  )
  const [selectedShop, setSelectedShop] = useState<Shop | null>(
    resolveFallbackShop(shops, shopSettings?.draft_shop_id ?? null),
  )
  const [isPosting, setIsPosting] = useState(false)
  const [isUpdatingPost, setIsUpdatingPost] = useState(false)
  const [isSavingChannel, setIsSavingChannel] = useState(false)
  const [isSavingSchedule, setIsSavingSchedule] = useState(false)
  const [isSavingRules, setIsSavingRules] = useState(false)
  const [lineTemplate, setLineTemplate] = useState<string>(shopSettings?.line_template ?? '')
  const [isSavingLineTemplate, setIsSavingLineTemplate] = useState(false)
  const lineTemplateInputRef = useRef<HTMLInputElement>(null)
  const [activeOperation, setActiveOperation] = useState<BotOperation | null>(null)
  const [settings, setSettings] = useState<ShopSettings>(shopSettings ?? {})
  const [autoPostEnabled, setAutoPostEnabled] = useState(Boolean(shopSettings?.auto_post_enabled))
  const [autoPostWeekday, setAutoPostWeekday] = useState<number>(shopSettings?.auto_post_weekday ?? 0)
  const [autoPostTime, setAutoPostTime] = useState<string>(shopSettings?.auto_post_time ?? '09:00')
  const [autoRollAfterPublish, setAutoRollAfterPublish] = useState(shopSettings?.auto_roll_after_publish !== false)
  const [keepPreviousPost, setKeepPreviousPost] = useState(Boolean(shopSettings?.keep_previous_post))
  const rollRuleKeyCounterRef = useRef(0)
  const createRuleClientKey = useCallback(() => {
    rollRuleKeyCounterRef.current += 1
    return `shop-roll-rule-${rollRuleKeyCounterRef.current}`
  }, [])
  const toEditableRollRules = useCallback(
    (rules: ShopRollRule[] = []): EditableShopRollRule[] => rules.map((rule) => ({
      ...rule,
      client_key: createRuleClientKey(),
    })),
    [createRuleClientKey],
  )
  const [rollRules, setRollRules] = useState<EditableShopRollRule[]>(toEditableRollRules(shopSettings?.roll_rules ?? []))
  const rollRulesSyncKeyRef = useRef<string>('')
  const { auth } = usePage<PageProps>().props
  const isAdmin = Boolean(auth?.user?.is_admin)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => {
    setSelectedShop((current) => {
      if (current) {
        const sameShop = shops.find((shop) => shop.id === current.id)
        if (sameShop) {
          return sameShop
        }
      }

      return resolveFallbackShop(shops, shopSettings?.draft_shop_id ?? null)
    })
  }, [resolveFallbackShop, shops, shopSettings?.draft_shop_id])

  useEffect(() => {
    setSettings(shopSettings ?? {})
    setAutoPostEnabled(Boolean(shopSettings?.auto_post_enabled))
    setAutoPostWeekday(shopSettings?.auto_post_weekday ?? 0)
    setAutoPostTime(shopSettings?.auto_post_time ?? '09:00')
    setAutoRollAfterPublish(shopSettings?.auto_roll_after_publish !== false)
    setKeepPreviousPost(Boolean(shopSettings?.keep_previous_post))
    setLineTemplate(shopSettings?.line_template ?? '')
  }, [shopSettings])

  useEffect(() => {
    const syncKey = JSON.stringify(shopSettings?.roll_rules ?? [])
    if (rollRulesSyncKeyRef.current === syncKey) {
      return
    }

    rollRulesSyncKeyRef.current = syncKey
    setRollRules(toEditableRollRules(shopSettings?.roll_rules ?? []))
  }, [shopSettings?.roll_rules, toEditableRollRules])

  const formatShopCreatedAt = (createdAt: string) => format(new Date(createdAt), "iiii dd MMM'.' yyyy ' - ' HH:mm")

  const onShopSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const shopId = Number(event.target.value)
    const newShop = shops.find((shop) => shop.id === shopId) || null
    setSelectedShop(newShop)
  }

  const getShopItemSnapshot = (shopItem: ShopItem): Item => {
    return {
      id: shopItem.item?.id ?? 0,
      name: shopItem.item_name ?? 'Unknown item',
      url: shopItem.item_url ?? '',
      cost: shopItem.item_cost ?? '',
      rarity: (shopItem.item_rarity ?? 'common') as Item['rarity'],
      type: (shopItem.item_type ?? 'item') as Item['type'],
      pick_count: 0,
      ruling_changed: shopItem.item_ruling_changed ?? false,
      ruling_note: shopItem.item_ruling_note ?? null,
    }
  }

  const shopDisplayRows = React.useMemo<ShopDisplayRow[]>(() => {
    if (!selectedShop) {
      return []
    }

    const snapshotRows = Array.isArray(selectedShop.roll_rows_snapshot)
      ? selectedShop.roll_rows_snapshot
      : []

    if (!snapshotRows.length) {
      return []
    }

    const itemsByRuleId = new Map<number, ShopItem[]>()

    selectedShop?.shop_items.forEach((shopItem) => {
      const rollRuleId = Number(shopItem.roll_rule_id ?? 0)

      if (!rollRuleId) {
        return
      }

      const existingItems = itemsByRuleId.get(rollRuleId) ?? []
      existingItems.push(shopItem)
      itemsByRuleId.set(rollRuleId, existingItems)
    })

    return snapshotRows.flatMap<ShopDisplayRow>((rule, index) => {
      if (rule.row_kind === 'heading') {
        return [{
          key: `heading-${rule.id ?? `new-${index}`}`,
          type: 'heading' as const,
          title: rule.heading_title.trim(),
        }]
      }

      if (!rule.id) {
        return []
      }

      return (itemsByRuleId.get(rule.id) ?? []).map((shopItem) => ({
        key: `item-${shopItem.id}`,
        type: 'item' as const,
        item: shopItem,
      }))
    })
  }, [selectedShop])

  const handleCreateShop = (): void => {
    if (!window.confirm('Roll a new draft shop?')) {
      return
    }
    router.post(route('admin.shops.store'), {}, { preserveState: false, preserveScroll: true })
  }

  const getCsrfToken = useCallback(() => {
    if (typeof document === 'undefined') return ''
    const meta = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null
    return meta?.content ?? ''
  }, [])

  const handlePostChannelSelect = useCallback(
    async (
      selection:
        | DiscordBackupChannel
        | { guild_id: string; channel_ids: string[] }[]
        | null
    ) => {
      if (!selection || Array.isArray(selection)) return
      if (isSavingChannel) return

      const csrfToken = getCsrfToken()
      if (!csrfToken) {
        toast.show('Missing CSRF token.', 'error')
        return
      }

      setIsSavingChannel(true)
      const payload = {
        post_channel_id: selection.id,
        post_channel_name: selection.name,
        post_channel_type: selection.type,
        post_channel_guild_id: selection.guild_id,
        post_channel_is_thread: selection.is_thread,
      }

      try {
        const response = await fetch(route('admin.shop-settings.update'), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRF-TOKEN': csrfToken,
          },
          credentials: 'same-origin',
          body: JSON.stringify(payload),
        })

        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          toast.show(String(data?.error ?? 'Channel could not be saved.'), 'error')
          return
        }

        setSettings((current) => ({
          ...current,
          post_channel_id: selection.id,
          post_channel_name: selection.name,
          post_channel_type: selection.type,
          post_channel_guild_id: selection.guild_id,
          post_channel_is_thread: selection.is_thread,
        }))
        toast.show('Posting channel saved.', 'info')
      } catch {
        toast.show('Channel could not be saved.', 'error')
      } finally {
        setIsSavingChannel(false)
      }
    },
    [getCsrfToken, isSavingChannel],
  )

  const handleScheduleSave = useCallback(async () => {
    if (isSavingSchedule) return
    const csrfToken = getCsrfToken()
    if (!csrfToken) {
      toast.show('Missing CSRF token.', 'error')
      return
    }

    setIsSavingSchedule(true)
    const payload = {
      auto_post_enabled: autoPostEnabled,
      auto_post_weekday: autoPostWeekday,
      auto_post_time: autoPostTime,
      auto_roll_after_publish: autoRollAfterPublish,
      keep_previous_post: keepPreviousPost,
    }

    try {
      const response = await fetch(route('admin.shop-settings.update'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.show(String(data?.error ?? 'Schedule could not be saved.'), 'error')
        return
      }

      setSettings((current) => ({
        ...current,
        ...(data?.shop_settings ?? payload),
      }))
      toast.show('Schedule saved.', 'info')
    } catch {
      toast.show('Schedule could not be saved.', 'error')
    } finally {
      setIsSavingSchedule(false)
    }
  }, [autoPostEnabled, autoPostTime, autoPostWeekday, autoRollAfterPublish, getCsrfToken, isSavingSchedule, keepPreviousPost])

  const handleLineTemplateSave = useCallback(async () => {
    if (isSavingLineTemplate) return
    const csrfToken = getCsrfToken()
    if (!csrfToken) return
    setIsSavingLineTemplate(true)
    try {
      const response = await fetch(route('admin.shop-settings.update'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify({ line_template: lineTemplate.trim() || null }),
      })
      if (response.ok) {
        toast.show('Line template saved.', 'success')
      } else {
        toast.show('Could not save line template.', 'error')
      }
    } finally {
      setIsSavingLineTemplate(false)
    }
  }, [getCsrfToken, isSavingLineTemplate, lineTemplate])

  const insertTemplateVariable = useCallback((variable: string) => {
    const input = lineTemplateInputRef.current
    if (!input) {
      setLineTemplate((prev) => prev + variable)
      return
    }
    const start = input.selectionStart ?? lineTemplate.length
    const end = input.selectionEnd ?? lineTemplate.length
    const newValue = lineTemplate.slice(0, start) + variable + lineTemplate.slice(end)
    setLineTemplate(newValue)
    requestAnimationFrame(() => {
      input.focus()
      input.setSelectionRange(start + variable.length, start + variable.length)
    })
  }, [lineTemplate])

  const templatePreview = React.useMemo(() => {
    return renderDiscordLine(lineTemplate || null, {
      itemName: 'Wand of Example',
      notes: 'Variant',
      itemUrl: 'https://www.dndbeyond.com/magic-items/example',
      itemCost: '500 gp',
      spellId: 1,
      spellName: 'Fireball',
      spellUrl: 'https://www.dndbeyond.com/spells/fireball',
      spellLegacyUrl: 'https://www.dndbeyond.com/legacy/spells/fireball',
      sourceKind: 'partnered',
      sourceShortcode: 'XGE',
    })
  }, [lineTemplate])

  const handleRollRuleChange = useCallback(<K extends keyof ShopRollRule>(index: number, key: K, value: ShopRollRule[K]) => {
    setRollRules((current) => current.map((rule, ruleIndex) => (
      ruleIndex === index
        ? {
            ...rule,
            [key]: value,
          }
        : rule
    )))
  }, [])

  const handleToggleRollRuleType = useCallback((index: number, type: ShopRollRule['selection_types'][number]) => {
    setRollRules((current) => current.map((rule, ruleIndex) => {
      if (ruleIndex !== index) {
        return rule
      }

      const nextTypes = rule.selection_types.includes(type)
        ? rule.selection_types.filter((entry) => entry !== type)
        : [...rule.selection_types, type]

      return {
        ...rule,
        selection_types: nextTypes.length ? nextTypes : rule.selection_types,
      }
    }))
  }, [])

  const handleAddRollRule = useCallback(() => {
    setRollRules((current) => [
      ...current,
      {
        ...createEmptyRollRule((current.length + 1) * 10),
        client_key: createRuleClientKey(),
      },
    ])
  }, [createRuleClientKey])

  const handleAddHeading = useCallback(() => {
    setRollRules((current) => [
      ...current,
      {
        ...createEmptyHeading((current.length + 1) * 10),
        client_key: createRuleClientKey(),
      },
    ])
  }, [createRuleClientKey])

  const handleRemoveRollRule = useCallback((index: number) => {
    setRollRules((current) => current.filter((_, ruleIndex) => ruleIndex !== index).map((rule, ruleIndex) => ({
      ...rule,
      sort_order: (ruleIndex + 1) * 10,
    })))
  }, [])

  const handleDuplicateRollRule = useCallback((index: number) => {
    setRollRules((current) => {
      const ruleToDuplicate = current[index]
      if (!ruleToDuplicate) {
        return current
      }

      const nextRules = [...current]
      nextRules.splice(index + 1, 0, {
        ...ruleToDuplicate,
        id: undefined,
        selection_types: [...ruleToDuplicate.selection_types],
        client_key: createRuleClientKey(),
      })

      return nextRules.map((rule, ruleIndex) => ({
        ...rule,
        sort_order: (ruleIndex + 1) * 10,
      }))
    })
  }, [createRuleClientKey])

  const handleRollRuleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }

    setRollRules((current) => {
      const oldIndex = current.findIndex((rule) => rule.client_key === String(active.id))
      const newIndex = current.findIndex((rule) => rule.client_key === String(over.id))
      if (oldIndex < 0 || newIndex < 0) {
        return current
      }

      const nextRules = arrayMove(current, oldIndex, newIndex)

      return nextRules.map((rule, ruleIndex) => ({
        ...rule,
        sort_order: (ruleIndex + 1) * 10,
      }))
    })
  }, [])

  const handleRollRulesSave = useCallback(async () => {
    if (isSavingRules) return

    const csrfToken = getCsrfToken()
    if (!csrfToken) {
      toast.show('Missing CSRF token.', 'error')
      return
    }

    setIsSavingRules(true)
    try {
      const response = await fetch(route('admin.shop-settings.update'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          roll_rules: normalizeRollRulesForSave(rollRules).map((rule) => ({
            id: rule.id,
            row_kind: rule.row_kind,
            rarity: rule.rarity,
            selection_types: rule.selection_types,
            source_kind: rule.source_kind,
            heading_title: rule.heading_title,
            count: Number(rule.count),
            sort_order: rule.sort_order,
          })),
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.show(String(data?.error ?? 'Roll rules could not be saved.'), 'error')
        return
      }

      const nextSettings = (data?.shop_settings ?? {}) as ShopSettings
      setSettings((current) => ({ ...current, ...nextSettings }))
      setRollRules(toEditableRollRules(nextSettings.roll_rules ?? []))
      rollRulesSyncKeyRef.current = JSON.stringify(nextSettings.roll_rules ?? [])
      toast.show('Roll rules saved.', 'info')
    } catch {
      toast.show('Roll rules could not be saved.', 'error')
    } finally {
      setIsSavingRules(false)
    }
  }, [getCsrfToken, isSavingRules, rollRules, toEditableRollRules])

  const handlePostShop = useCallback(async () => {
    if (isPosting) return
    if (!settings.post_channel_id) {
      toast.show('Select a posting channel first.', 'error')
      return
    }
    if (!settings.draft_shop_id) {
      toast.show('No draft shop available.', 'error')
      return
    }
    if (!window.confirm('Publish the draft shop to Discord now? This promotes it to current and rolls a new draft.')) {
      return
    }

    const csrfToken = getCsrfToken()
    if (!csrfToken) {
      toast.show('Missing CSRF token.', 'error')
      return
    }

    setIsPosting(true)
    try {
      const response = await fetch(route('admin.shops.post'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify({ channel_id: settings.post_channel_id }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.show(String(payload?.error ?? 'Shop could not be posted.'), 'error')
        return
      }

      const operation = (payload?.operation ?? null) as BotOperation | null
      if (!operation?.id) {
        toast.show('Shop operation could not be started.', 'error')
        return
      }

      setActiveOperation(operation)
      toast.show('Publishing draft started.', 'info')
    } catch {
      toast.show('Shop could not be posted.', 'error')
    } finally {
      setIsPosting(false)
    }
  }, [getCsrfToken, isPosting, settings.draft_shop_id, settings.post_channel_id])

  const handleUpdatePost = useCallback(async () => {
    if (isUpdatingPost) return
    if (!settings.last_post_channel_id) {
      toast.show('No previously posted shop to update.', 'error')
      return
    }
    if (!settings.current_shop_id) {
      toast.show('No current shop available.', 'error')
      return
    }
    if (!window.confirm('Update the posted shop in Discord?')) {
      return
    }

    const csrfToken = getCsrfToken()
    if (!csrfToken) {
      toast.show('Missing CSRF token.', 'error')
      return
    }

    setIsUpdatingPost(true)
    try {
      const response = await fetch(route('admin.shops.update-post'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify({}),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.show(String(payload?.error ?? 'Shop could not be updated.'), 'error')
        return
      }

      const operation = (payload?.operation ?? null) as BotOperation | null
      if (!operation?.id) {
        toast.show('Shop operation could not be started.', 'error')
        return
      }

      setActiveOperation(operation)
      toast.show('Updating current post started.', 'info')
    } catch {
      toast.show('Shop could not be updated.', 'error')
    } finally {
      setIsUpdatingPost(false)
    }
  }, [getCsrfToken, isUpdatingPost, settings.current_shop_id, settings.last_post_channel_id])

  const destinationLabel = settings.post_channel_name ?? settings.post_channel_id ?? 'Not set'
  const destinationKind = settings.post_channel_id
    ? settings.post_channel_is_thread
      ? 'Thread'
      : 'Channel'
    : null
  const destinationText = `Destination: ${destinationKind ? `${destinationKind} ${destinationLabel}` : destinationLabel}`
  const hasPostDestination = Boolean(settings.post_channel_id)
  const currentShopId = settings.current_shop_id ?? null
  const draftShopId = settings.draft_shop_id ?? null
  const canUpdateSelectedShopLine = Boolean(
    selectedShop && currentShopId && settings.last_post_channel_id && selectedShop.id === currentShopId,
  )
  const operationRunning = !isTerminalBotOperation(activeOperation)
  const canUpdatePost = Boolean(settings.current_shop_id && settings.last_post_channel_id)
  const handleOperationCompleted = useCallback((operation: BotOperation) => {
    if (operation.action === 'publish_draft') {
      const newCurrentShopId = Number(operation.current_shop_id || operation.result_shop_id || 0) || null
      const newDraftShopId = Number(operation.draft_shop_id || 0) || null
      setSettings((current) => ({
        ...current,
        current_shop_id: newCurrentShopId ?? current.current_shop_id ?? null,
        draft_shop_id: newDraftShopId ?? current.draft_shop_id ?? null,
      }))
      toast.show(
        `Published draft #${operation.result_shop_id ?? 'n/a'}. Current: #${newCurrentShopId ?? 'n/a'}, Draft: #${newDraftShopId ?? 'n/a'}.`,
        'info',
      )
      if (typeof window !== 'undefined') {
        router.visit(window.location.href, {
          only: ['shops', 'shopSettings'],
          preserveState: true,
          preserveScroll: true,
          replace: true,
        })
      } else {
        router.reload({ only: ['shops', 'shopSettings'] })
      }
      return
    }

    toast.show('Current shop post updated.', 'info')
    if (typeof window !== 'undefined') {
      router.visit(window.location.href, {
        only: ['shopSettings'],
        preserveState: true,
        preserveScroll: true,
        replace: true,
      })
    } else {
      router.reload({ only: ['shopSettings'] })
    }
  }, [])
  const handleOperationFailed = useCallback((operation: BotOperation) => {
    toast.show(String(operation.error ?? 'Shop operation failed.'), 'error')
  }, [])

  const weekdayOptions = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ]
  const savedAutoPostEnabled = Boolean(settings.auto_post_enabled)
  const savedWeekday = settings.auto_post_weekday ?? 0
  const savedTime = settings.auto_post_time ?? '09:00'
  const weekdayLabel = weekdayOptions.find((option) => option.value === savedWeekday)?.label ?? 'Sunday'
  const autoPostLabel = savedAutoPostEnabled ? `Auto post: ${weekdayLabel} ${savedTime}` : 'Auto post: Off'
  return (
    <AppLayout>
      <Head title="Shop" />
      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-6">
        <section className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold">Shop</h1>
            <p className="text-sm text-base-content/70">Roll new shops and review the current inventory.</p>
          </div>
        </section>
        <div>
          <Select className="w-full" value={selectedShop?.id || ''} onChange={onShopSelectChange}>
            <SelectLabel>Shops</SelectLabel>
            <SelectOptions>
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {`Shop ID ${String(shop.id).padStart(3, '0')} - ${formatShopCreatedAt(shop.created_at)}${
                    shop.id === draftShopId ? ' [Draft]' : shop.id === currentShopId ? ' [Current]' : ''
                  }`}
                </option>
              ))}
            </SelectOptions>
          </Select>
        </div>
        {isAdmin ? (
          <div className="rounded-box bg-base-100 shadow-md p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/60">
                <span
                  className={cn(
                    'rounded-full border px-2 py-1',
                    hasPostDestination ? 'border-base-200 text-base-content/70' : 'border-warning text-warning',
                  )}
                >
                  {destinationText}
                </span>
                <span className="rounded-full border border-base-200 px-2 py-1">
                  Items: {selectedShop?.shop_items.length ?? 0}
                </span>
                <span className="rounded-full border border-base-200 px-2 py-1">
                  Current: {currentShopId ? `#${String(currentShopId).padStart(3, '0')}` : 'n/a'}
                </span>
                <span className="rounded-full border border-base-200 px-2 py-1">
                  Draft: {draftShopId ? `#${String(draftShopId).padStart(3, '0')}` : 'n/a'}
                </span>
                <span className="rounded-full border border-base-200 px-2 py-1">
                  {autoPostLabel}
                </span>
              </div>
              <Modal>
                <ModalTrigger>
                  <Button size="sm" variant="outline" modifier="square" aria-label="Configure shop">
                    <Settings size={16} />
                  </Button>
                </ModalTrigger>
                <ModalTitle>Shop settings</ModalTitle>
                <ModalContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-base-content/70">Posting destination</p>
                      <p className="text-sm font-semibold">{destinationText}</p>
                    </div>
                    <DiscordChannelPickerModal
                      title="Select posting channel"
                      description="Choose where the shop should be posted."
                      confirmLabel="Save channel"
                      channelsRouteName="admin.settings.backup.channels.refresh"
                      threadsRouteName="admin.settings.backup.threads.refresh"
                      includeThreads={false}
                      enableThreadLoader
                      threadLoadIncludeArchived
                      threadLoadIncludePrivate={false}
                      mode="single"
                      allowedChannelTypes={['GuildText', 'GuildAnnouncement', 'PublicThread', 'PrivateThread', 'AnnouncementThread']}
                      triggerClassName="gap-2"
                      triggerSize="sm"
                      triggerVariant="outline"
                      triggerDisabled={isSavingChannel}
                      onConfirm={handlePostChannelSelect}
                    >
                      <Send size={18} />
                      Select channel
                    </DiscordChannelPickerModal>
                    <div className="space-y-2 border-t border-base-200 pt-3">
                      <p className="text-xs text-base-content/70">Weekly auto post</p>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-xs"
                          checked={autoPostEnabled}
                          onChange={(event) => setAutoPostEnabled(event.target.checked)}
                        />
                        Enable weekly auto post
                      </label>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <select
                          className="select select-sm"
                          value={autoPostWeekday}
                          onChange={(event) => setAutoPostWeekday(Number(event.target.value))}
                        >
                          {weekdayOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="time"
                          className="input input-sm"
                          value={autoPostTime}
                          onChange={(event) => setAutoPostTime(event.target.value)}
                        />
                      </div>
                      <p className="text-[11px] text-base-content/60">
                        Uses Europe/Berlin time.
                      </p>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-xs"
                          checked={autoRollAfterPublish}
                          onChange={(event) => setAutoRollAfterPublish(event.target.checked)}
                        />
                        Auto-roll new draft after publishing
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-xs"
                          checked={keepPreviousPost}
                          onChange={(event) => setKeepPreviousPost(event.target.checked)}
                        />
                        Keep old shop post in Discord when publishing
                      </label>
                      <Button size="sm" variant="outline" onClick={handleScheduleSave} disabled={isSavingSchedule}>
                        Save
                      </Button>
                    </div>
                    <div className="space-y-2 border-t border-base-200 pt-3">
                      <p className="text-xs text-base-content/70">Line template</p>
                      <div className="flex flex-wrap gap-1">
                        {LINE_TEMPLATE_VARIABLES.map((variable) => (
                          <button
                            key={variable}
                            type="button"
                            className="rounded border border-base-300 bg-base-200/60 px-1.5 py-0.5 font-mono text-[10px] text-base-content/70 transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary active:scale-95"
                            title={`Insert ${variable}`}
                            onClick={() => insertTemplateVariable(variable)}
                          >
                            {variable}
                          </button>
                        ))}
                      </div>
                      <input
                        ref={lineTemplateInputRef}
                        type="text"
                        className="input input-sm w-full font-mono text-xs"
                        placeholder={DEFAULT_LINE_TEMPLATE}
                        value={lineTemplate}
                        onChange={(e) => setLineTemplate(e.target.value)}
                      />
                      {templatePreview !== null ? (
                        <div className="rounded border border-base-200 bg-base-200/30 px-2 py-1.5">
                          <p className="mb-1 text-[10px] text-base-content/50">Preview (first item)</p>
                          <p className="font-mono text-[11px] text-base-content/80 break-all">{templatePreview}</p>
                        </div>
                      ) : null}
                      <Button size="sm" variant="outline" onClick={handleLineTemplateSave} disabled={isSavingLineTemplate}>
                        Save template
                      </Button>
                    </div>
                  </div>
                </ModalContent>
              </Modal>
              <Modal wide>
                <ModalTrigger>
                  <Button size="sm" variant="outline" className="gap-2">
                    <SlidersHorizontal size={16} />
                    Roll rules
                  </Button>
                </ModalTrigger>
                <ModalTitle>Shop roll rules</ModalTitle>
                <ModalContent>
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Roll rules</p>
                        <p className="text-xs text-base-content/60">
                          Configure heading rows and rule rows in the same order they will be processed.
                        </p>
                        <p className="mt-1 text-[11px] text-base-content/50">
                          Heading rows are rendered directly. Rule rows roll items top to bottom, and earlier rolls are excluded from later ones.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" variant="outline" onClick={handleAddHeading}>
                          <Plus size={14} />
                          Add heading
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleAddRollRule}>
                          <Plus size={14} />
                          Add rule
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="hidden grid-cols-[46px_64px_108px_minmax(0,1fr)_104px_56px_64px] items-center gap-1.5 rounded-box border border-base-200 bg-base-200/40 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-base-content/60 lg:grid">
                        <span>Drag</span>
                        <span>Kind</span>
                        <span>Rarity</span>
                        <span>Types</span>
                        <span>Source</span>
                        <span>Count</span>
                        <span className="text-right">Actions</span>
                      </div>
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleRollRuleDragEnd}>
                        <SortableContext items={rollRules.map((rule) => rule.client_key)} strategy={verticalListSortingStrategy}>
                          <div className="space-y-1.5">
                            {rollRules.map((rule, index) => (
                              <SortableRollRuleRow
                                key={rule.client_key}
                                index={index}
                                rollRulesLength={rollRules.length}
                                rule={rule}
                                handleRollRuleChange={handleRollRuleChange}
                                handleToggleRollRuleType={handleToggleRollRuleType}
                                handleDuplicateRollRule={handleDuplicateRollRule}
                                handleRemoveRollRule={handleRemoveRollRule}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </div>
                    <div className="flex justify-end">
                      <Button size="sm" variant="outline" onClick={handleRollRulesSave} disabled={isSavingRules}>
                        Save roll rules
                      </Button>
                    </div>
                  </div>
                </ModalContent>
              </Modal>
            </div>
            <BotOperationProgress
              operation={activeOperation}
              onOperationChange={setActiveOperation}
              onCompleted={handleOperationCompleted}
              onFailed={handleOperationFailed}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handlePostShop}
                disabled={isPosting || operationRunning || !settings.post_channel_id || !settings.draft_shop_id}
                className="gap-2"
              >
                <Send size={16} />
                Publish draft
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleUpdatePost}
                disabled={isUpdatingPost || operationRunning || !canUpdatePost}
                className="gap-2"
              >
                <RotateCcw size={16} />
                Update current post
              </Button>
              <Button size="sm" variant="outline" onClick={handleCreateShop} className="gap-2" disabled={operationRunning}>
                <Plus size={16} />
                Roll new draft
              </Button>
            </div>
          </div>
        ) : null}
        <List>
          {shopDisplayRows.map((row) => (
            row.type === 'heading'
              ? (
                <ListRow
                  key={row.key}
                  className="grid-cols-1 border-b border-base-200 bg-base-200/25 px-4 py-3"
                >
                  <div className="text-sm font-semibold whitespace-pre-wrap break-words">
                    {row.title}
                  </div>
                </ListRow>
              )
              : (
              <ItemRow
                key={row.key}
                item={getShopItemSnapshot(row.item)}
                shopItem={row.item}
                lineTemplate={lineTemplate || null}
                canUpdatePostLine={canUpdateSelectedShopLine}
              />
              )
          ))}
        </List>
      </div>
    </AppLayout>
  )
}


