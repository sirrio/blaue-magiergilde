import { Button } from '@/components/ui/button'
import { FileInput } from '@/components/ui/file-input'
import { Input } from '@/components/ui/input'
import { Modal, ModalAction, ModalContent, ModalTitle } from '@/components/ui/modal'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import AppLayout from '@/layouts/app-layout'
import { cn } from '@/lib/utils'
import { PageProps, Room, RoomAsset, RoomCharacter, RoomMap } from '@/types'
import { Head, router, useForm, usePage } from '@inertiajs/react'
import { Check, ChevronLeft, ChevronRight, ImagePlus, Loader2, MapPin, Minus, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useInitials } from '@/hooks/use-initials'

type RoomCharacterEntry = RoomCharacter & {
  guild_status?: 'pending' | 'approved' | 'declined'
  user_name?: string | null
}

type RoomSelection = {
  grid_x: number
  grid_y: number
  grid_w: number
  grid_h: number
}

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const resizeHandlePositions: { key: ResizeHandle; className: string }[] = [
  { key: 'nw', className: '-left-1.5 -top-1.5' },
  { key: 'n', className: 'left-1/2 -top-1.5 -translate-x-1/2' },
  { key: 'ne', className: '-right-1.5 -top-1.5' },
  { key: 'w', className: '-left-1.5 top-1/2 -translate-y-1/2' },
  { key: 'e', className: '-right-1.5 top-1/2 -translate-y-1/2' },
  { key: 'sw', className: '-left-1.5 -bottom-1.5' },
  { key: 's', className: 'left-1/2 -bottom-1.5 -translate-x-1/2' },
  { key: 'se', className: '-right-1.5 -bottom-1.5' },
]

const resizeHandleCursor: Record<ResizeHandle, string> = {
  n: 'cursor-ns-resize',
  s: 'cursor-ns-resize',
  e: 'cursor-ew-resize',
  w: 'cursor-ew-resize',
  ne: 'cursor-nesw-resize',
  sw: 'cursor-nesw-resize',
  nw: 'cursor-nwse-resize',
  se: 'cursor-nwse-resize',
}

type RoomFormData = {
  room_map_id: number
  name: string
  grid_x: number
  grid_y: number
  grid_w: number
  grid_h: number
  character_id: number | null
}

type RoomMapFormData = {
  name: string
  grid_columns: number
  grid_rows: number
  image: File | null
}

type LibraryCategory = {
  key: string
  label: string
}

type LibraryItem = {
  path: string
  label: string
  category: string
  category_label: string
  url: string
}

const mapSelectionToForm = (selection: RoomSelection, mapId: number): RoomFormData => ({
  room_map_id: mapId,
  name: '',
  grid_x: selection.grid_x,
  grid_y: selection.grid_y,
  grid_w: selection.grid_w,
  grid_h: selection.grid_h,
  character_id: null,
})

const buildCharacterLabel = (character: RoomCharacterEntry) => {
  const base = character.name
  return character.user_name ? `${base} (${character.user_name})` : base
}

const RoomFormModal = ({
  open,
  title,
  submitLabel,
  map,
  characters,
  initialValues,
  onClose,
  onSubmit,
  onDelete,
}: {
  open: boolean
  title: string
  submitLabel: string
  map: RoomMap
  characters: RoomCharacterEntry[]
  initialValues: RoomFormData
  onClose: () => void
  onSubmit: (data: RoomFormData) => void
  onDelete?: () => void
}) => {
  const { errors } = usePage<PageProps>().props
  const { data, setData, processing, reset } = useForm<RoomFormData>(initialValues)

  useEffect(() => {
    if (!open) return
    reset()
    setData({ ...initialValues })
  }, [open, initialValues, reset, setData])

  const handleSubmit = () => {
    onSubmit(data)
  }

  return (
    <Modal isOpen={open} onClose={onClose}>
      <ModalTitle>{title}</ModalTitle>
      <ModalContent>
        <Input
          errors={errors.name}
          placeholder="Room name"
          value={data.name}
          onChange={(e) => setData('name', e.target.value)}
        >
          Name
        </Input>
        <Select
          value={data.character_id ? String(data.character_id) : ''}
          onChange={(e) => setData('character_id', e.target.value ? Number(e.target.value) : null)}
        >
          <SelectLabel>Assigned character</SelectLabel>
          <SelectOptions>
            <option value="">Unassigned</option>
            {characters.map((character) => (
              <option key={character.id} value={character.id}>
                {buildCharacterLabel(character)}
              </option>
            ))}
          </SelectOptions>
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Input
            errors={errors.grid_x}
            type="number"
            min={0}
            max={map.grid_columns - 1}
            value={data.grid_x}
            onChange={(e) => setData('grid_x', Number(e.target.value))}
          >
            Grid X
          </Input>
          <Input
            errors={errors.grid_y}
            type="number"
            min={0}
            max={map.grid_rows - 1}
            value={data.grid_y}
            onChange={(e) => setData('grid_y', Number(e.target.value))}
          >
            Grid Y
          </Input>
          <Input
            errors={errors.grid_w}
            type="number"
            min={1}
            max={map.grid_columns}
            value={data.grid_w}
            onChange={(e) => setData('grid_w', Number(e.target.value))}
          >
            Grid W
          </Input>
          <Input
            errors={errors.grid_h}
            type="number"
            min={1}
            max={map.grid_rows}
            value={data.grid_h}
            onChange={(e) => setData('grid_h', Number(e.target.value))}
          >
            Grid H
          </Input>
        </div>
        <p className="text-xs text-base-content/60">Grid size: {map.grid_columns} x {map.grid_rows}</p>
        {onDelete ? (
          <div className="mt-4 flex justify-between">
            <Button variant="outline" color="error" onClick={onDelete} disabled={processing}>
              <Trash2 size={14} /> Delete
            </Button>
          </div>
        ) : null}
      </ModalContent>
      <ModalAction onClick={handleSubmit} disabled={processing}>
        {submitLabel}
      </ModalAction>
    </Modal>
  )
}

const RoomMapFormModal = ({
  open,
  mode,
  map,
  onClose,
}: {
  open: boolean
  mode: 'create' | 'edit'
  map?: RoomMap | null
  onClose: () => void
}) => {
  const { errors } = usePage<PageProps>().props
  const { data, setData, processing, reset, post, patch } = useForm<RoomMapFormData>({
    name: '',
    grid_columns: 38,
    grid_rows: 38,
    image: null,
  })

  useEffect(() => {
    if (!open) return
    reset()
    setData({
      name: map?.name ?? '',
      grid_columns: map?.grid_columns ?? 38,
      grid_rows: map?.grid_rows ?? 38,
      image: null,
    })
  }, [map, open, reset, setData])

  const handleSubmit = () => {
    if (mode === 'create') {
      post(route('admin.rooms.maps.store'), {
        forceFormData: true,
        onSuccess: () => onClose(),
      })
      return
    }

    if (!map) return
    patch(route('admin.rooms.maps.update', { roomMap: map.id }), {
      forceFormData: true,
      onSuccess: () => onClose(),
    })
  }

  return (
    <Modal isOpen={open} onClose={onClose}>
      <ModalTitle>{mode === 'create' ? 'Add floor' : 'Edit floor'}</ModalTitle>
      <ModalContent>
        <Input
          errors={errors.name}
          placeholder="Floor name"
          value={data.name}
          onChange={(e) => setData('name', e.target.value)}
        >
          Name
        </Input>
        <div className="grid grid-cols-2 gap-3">
          <Input
            errors={errors.grid_columns}
            type="number"
            min={1}
            max={200}
            value={data.grid_columns}
            onChange={(e) => setData('grid_columns', Number(e.target.value))}
          >
            Grid columns
          </Input>
          <Input
            errors={errors.grid_rows}
            type="number"
            min={1}
            max={200}
            value={data.grid_rows}
            onChange={(e) => setData('grid_rows', Number(e.target.value))}
          >
            Grid rows
          </Input>
        </div>
        <FileInput
          errors={errors.image ? `${errors.image} The file might be too large.` : ''}
          onChange={(e) => setData('image', e.target?.files?.[0] ?? null)}
        >
          {mode === 'create' ? 'Map image' : 'Replace image (optional)'}
        </FileInput>
        <p className="text-xs text-base-content/60">
          {mode === 'create'
            ? 'Upload a map and define the grid size for this floor.'
            : 'Update the floor details or upload a new map image.'}
        </p>
      </ModalContent>
      <ModalAction onClick={handleSubmit} disabled={processing}>
        {mode === 'create' ? 'Save' : 'Update'}
      </ModalAction>
    </Modal>
  )
}

export default function Rooms({
  roomMaps,
  roomMap,
  characters,
  adminMode = true,
}: {
  roomMaps: RoomMap[]
  roomMap: RoomMap | null
  characters: RoomCharacterEntry[]
  adminMode?: boolean
}) {
  const { auth, errors } = usePage<PageProps>().props
  const isAdmin = Boolean(auth?.user?.is_admin)
  const adminRouteActive = route().current('admin.rooms.index')
  const canManageRooms = isAdmin && (adminMode || adminRouteActive)
  const userId = auth?.user?.id
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null)
  const [draftSelection, setDraftSelection] = useState<RoomSelection | null>(null)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null)
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null)
  const [assetOverrides, setAssetOverrides] = useState<Record<number, Partial<RoomAsset>>>({})
  const [draggingAssetId, setDraggingAssetId] = useState<number | null>(null)
  const [scalingAssetId, setScalingAssetId] = useState<number | null>(null)
  const [rotatingAssetId, setRotatingAssetId] = useState<number | null>(null)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [libraryCategories, setLibraryCategories] = useState<LibraryCategory[]>([])
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([])
  const [libraryCategory, setLibraryCategory] = useState('')
  const [librarySearch, setLibrarySearch] = useState('')
  const [libraryPage, setLibraryPage] = useState(1)
  const [libraryTotal, setLibraryTotal] = useState(0)
  const [libraryLoading, setLibraryLoading] = useState(false)
  const [libraryError, setLibraryError] = useState<string | null>(null)
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [isMapModalOpen, setIsMapModalOpen] = useState(false)
  const [mapModalMode, setMapModalMode] = useState<'create' | 'edit'>('create')
  const [mapModalTarget, setMapModalTarget] = useState<RoomMap | null>(null)
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [zoom, setZoom] = useState(1)
  const [showOverlays, setShowOverlays] = useState(true)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [spacePressed, setSpacePressed] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const panStartRef = useRef<{ x: number; y: number } | null>(null)
  const panOriginRef = useRef<{ x: number; y: number } | null>(null)
  const panningPointerIdRef = useRef<number | null>(null)
  const isPanningRef = useRef(false)
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)
  const dragDistanceRef = useRef(0)
  const pointerRoomIdRef = useRef<number | null>(null)
  const assetDragOffsetRef = useRef<{ x: number; y: number } | null>(null)
  const assetScaleRef = useRef<{
    id: number
    handle: ResizeHandle
    startScaleX: number
    startScaleY: number
    center: { x: number; y: number }
    naturalWidth: number
    naturalHeight: number
    rotation: number
  } | null>(null)
  const assetRotateRef = useRef<{ id: number; startAngle: number; startRotation: number; center: { x: number; y: number } } | null>(
    null,
  )
  const panRef = useRef(pan)
  const zoomRef = useRef(zoom)
  const getInitials = useInitials()

  const {
    data: assetForm,
    setData: setAssetForm,
    post: postAsset,
    processing: assetUploading,
    reset: resetAssetForm,
  } = useForm<{ image: File | null }>({
    image: null,
  })

  const activeMap = roomMap ?? null

  const sortedCharacters = useMemo(
    () => [...characters].sort((a, b) => a.name.localeCompare(b.name)),
    [characters],
  )

  useEffect(() => {
    panRef.current = pan
  }, [pan])

  useEffect(() => {
    isPanningRef.current = isPanning
  }, [isPanning])

  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

  useEffect(() => {
    if (!activeMap?.image_path) return
    const image = new Image()
    image.src = activeMap.image_path
    image.onload = () => setMapImage(image)
  }, [activeMap?.image_path])

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      setCanvasSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!activeMap) return
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setEditingRoom(null)
    setSelectedRoomId(null)
    setSelectedAssetId(null)
    setDraftSelection(null)
    setSelectionStart(null)
    setSelectionEnd(null)
  }, [activeMap?.id])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return
      const activeElement = document.activeElement as HTMLElement | null
      const isTypingTarget =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'SELECT' ||
          activeElement.isContentEditable)
      if (isTypingTarget) return
      event.preventDefault()
      setSpacePressed(true)
    }
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return
      const activeElement = document.activeElement as HTMLElement | null
      const isTypingTarget =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'SELECT' ||
          activeElement.isContentEditable)
      if (!isTypingTarget) {
        event.preventDefault()
      }
      setSpacePressed(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const selection = useMemo(() => {
    if (!selectionStart) return null
    const end = selectionEnd ?? selectionStart
    const minX = Math.min(selectionStart.x, end.x)
    const minY = Math.min(selectionStart.y, end.y)
    const maxX = Math.max(selectionStart.x, end.x)
    const maxY = Math.max(selectionStart.y, end.y)
    return {
      grid_x: minX,
      grid_y: minY,
      grid_w: maxX - minX + 1,
      grid_h: maxY - minY + 1,
    }
  }, [selectionEnd, selectionStart])

  const resetSelection = () => {
    setSelectionStart(null)
    setSelectionEnd(null)
    setDraftSelection(null)
  }

  const handleCreateRoom = (data: RoomFormData) => {
    router.post(route('admin.rooms.store'), data, {
      preserveScroll: true,
      onSuccess: () => {
        resetSelection()
      },
    })
  }

  const handleUpdateRoom = (data: RoomFormData) => {
    if (!editingRoom) return
    router.patch(route('admin.rooms.update', { room: editingRoom.id }), data, {
      preserveScroll: true,
      onSuccess: () => {
        setEditingRoom(null)
      },
    })
  }

  const handleDeleteRoom = () => {
    if (!editingRoom) return
    if (!window.confirm('Delete this room assignment?')) return
    router.delete(route('admin.rooms.destroy', { room: editingRoom.id }), {
      preserveScroll: true,
      onSuccess: () => {
        setEditingRoom(null)
      },
    })
  }

  const openCreateMapModal = () => {
    setMapModalMode('create')
    setMapModalTarget(null)
    setIsMapModalOpen(true)
  }

  const openEditMapModal = () => {
    if (!activeMap) return
    setMapModalMode('edit')
    setMapModalTarget(activeMap)
    setIsMapModalOpen(true)
  }

  if (!activeMap) {
    return (
      <AppLayout>
        <Head title="Rooms" />
        <div className="container mx-auto max-w-5xl px-4 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">Rooms</h1>
              <p className="text-sm text-base-content/70">No room maps configured yet.</p>
            </div>
            {canManageRooms ? (
              <Button size="sm" variant="outline" onClick={openCreateMapModal}>
                Add floor
              </Button>
            ) : null}
          </div>
        </div>
        {canManageRooms ? (
          <RoomMapFormModal
            open={isMapModalOpen}
            mode={mapModalMode}
            map={mapModalTarget}
            onClose={() => setIsMapModalOpen(false)}
          />
        ) : null}
      </AppLayout>
    )
  }

  const gridColumns = activeMap.grid_columns
  const gridRows = activeMap.grid_rows
  const roomList = activeMap.rooms ?? []
  const selectedRoom = useMemo(
    () => roomList.find((room) => room.id === selectedRoomId) ?? null,
    [roomList, selectedRoomId],
  )
  const libraryPerPage = 18
  const libraryTotalPages = Math.max(1, Math.ceil(libraryTotal / libraryPerPage))

  useEffect(() => {
    if (canManageRooms || selectedRoomId) return
    const assignedRoom = roomList.find((room) => room.character?.user_id === userId) ?? null
    if (assignedRoom) {
      setSelectedRoomId(assignedRoom.id)
    }
  }, [canManageRooms, roomList, selectedRoomId, userId])

  useEffect(() => {
    setSelectedAssetId(null)
  }, [selectedRoomId])

  const getTransform = useCallback(() => {
    if (!mapImage || canvasSize.width === 0 || canvasSize.height === 0) return null
    const baseScale = Math.min(canvasSize.width / mapImage.width, canvasSize.height / mapImage.height)
    const scale = baseScale * zoom
    const offsetX = (canvasSize.width - mapImage.width * scale) / 2 + pan.x
    const offsetY = (canvasSize.height - mapImage.height * scale) / 2 + pan.y
    return { scale, offsetX, offsetY }
  }, [canvasSize, mapImage, pan.x, pan.y, zoom])

  const getGridFromScreen = useCallback(
    (screenX: number, screenY: number) => {
      if (!mapImage) return null
      const transform = getTransform()
      if (!transform) return null
      const worldX = (screenX - transform.offsetX) / transform.scale
      const worldY = (screenY - transform.offsetY) / transform.scale
      if (worldX < 0 || worldY < 0 || worldX > mapImage.width || worldY > mapImage.height) return null
      const cellWidth = mapImage.width / gridColumns
      const cellHeight = mapImage.height / gridRows
      const gridX = Math.min(Math.max(Math.floor(worldX / cellWidth), 0), gridColumns - 1)
      const gridY = Math.min(Math.max(Math.floor(worldY / cellHeight), 0), gridRows - 1)
      return { x: gridX, y: gridY }
    },
    [getTransform, gridColumns, gridRows, mapImage],
  )

  const getWorldFromScreen = useCallback(
    (screenX: number, screenY: number) => {
      if (!mapImage) return null
      const transform = getTransform()
      if (!transform) return null
      const worldX = (screenX - transform.offsetX) / transform.scale
      const worldY = (screenY - transform.offsetY) / transform.scale
      if (worldX < 0 || worldY < 0 || worldX > mapImage.width || worldY > mapImage.height) return null
      return { x: worldX, y: worldY }
    },
    [getTransform, mapImage],
  )

  const getWorldFromPointer = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      return getWorldFromScreen(event.clientX - rect.left, event.clientY - rect.top)
    },
    [getWorldFromScreen],
  )

  const normalizeRotation = useCallback((value: number) => {
    const normalized = ((value + 180) % 360 + 360) % 360 - 180
    return normalized
  }, [])

  const snapRotation = useCallback(
    (value: number, step: number) => normalizeRotation(Math.round(value / step) * step),
    [normalizeRotation],
  )

  const findRoomAt = useCallback(
    (gridX: number, gridY: number) =>
      roomList.find(
        (room) =>
          gridX >= room.grid_x &&
          gridX < room.grid_x + room.grid_w &&
          gridY >= room.grid_y &&
          gridY < room.grid_y + room.grid_h,
      ),
    [roomList],
  )

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !mapImage) return
    const { width: cssWidth, height: cssHeight } = canvasSize
    if (cssWidth === 0 || cssHeight === 0) return
    const context = canvas.getContext('2d')
    if (!context) return

    const dpr = window.devicePixelRatio || 1
    const targetWidth = Math.round(cssWidth * dpr)
    const targetHeight = Math.round(cssHeight * dpr)
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth
      canvas.height = targetHeight
    }

    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    context.clearRect(0, 0, cssWidth, cssHeight)

    const transform = getTransform()
    if (!transform) return
    const cellWidth = mapImage.width / gridColumns
    const cellHeight = mapImage.height / gridRows

    context.save()
    context.translate(transform.offsetX, transform.offsetY)
    context.scale(transform.scale, transform.scale)
    context.imageSmoothingEnabled = true
    context.drawImage(mapImage, 0, 0)

    context.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    context.lineWidth = 1 / transform.scale
    for (let col = 0; col <= gridColumns; col += 1) {
      const x = col * cellWidth
      context.beginPath()
      context.moveTo(x, 0)
      context.lineTo(x, mapImage.height)
      context.stroke()
    }
    for (let row = 0; row <= gridRows; row += 1) {
      const y = row * cellHeight
      context.beginPath()
      context.moveTo(0, y)
      context.lineTo(mapImage.width, y)
      context.stroke()
    }

    if (selection) {
      const selX = selection.grid_x * cellWidth
      const selY = selection.grid_y * cellHeight
      const selW = selection.grid_w * cellWidth
      const selH = selection.grid_h * cellHeight
      context.fillStyle = 'rgba(56, 189, 248, 0.2)'
      context.strokeStyle = 'rgba(56, 189, 248, 0.9)'
      context.lineWidth = 2 / transform.scale
      context.fillRect(selX, selY, selW, selH)
      context.strokeRect(selX, selY, selW, selH)
    }

    context.restore()
  }, [canvasSize, getTransform, gridColumns, gridRows, mapImage, selection])

  useEffect(() => {
    drawCanvas()
  }, [drawCanvas])

  const startPan = useCallback((event: React.PointerEvent<HTMLElement>) => {
    event.preventDefault()
    setIsPanning(true)
    panStartRef.current = { x: event.clientX, y: event.clientY }
    panOriginRef.current = { ...panRef.current }
    panningPointerIdRef.current = event.pointerId
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }, [])

  useEffect(() => {
    const handleGlobalPointerMove = (event: PointerEvent) => {
      if (!isPanningRef.current) return
      if (panningPointerIdRef.current !== null && event.pointerId !== panningPointerIdRef.current) return
      const start = panStartRef.current
      const origin = panOriginRef.current
      if (!start || !origin) return
      const deltaX = event.clientX - start.x
      const deltaY = event.clientY - start.y
      setPan({ x: origin.x + deltaX, y: origin.y + deltaY })
    }

    const handleGlobalPointerUp = (event: PointerEvent) => {
      if (!isPanningRef.current) return
      if (panningPointerIdRef.current !== null && event.pointerId !== panningPointerIdRef.current) return
      setIsPanning(false)
      panStartRef.current = null
      panOriginRef.current = null
      panningPointerIdRef.current = null
    }

    window.addEventListener('pointermove', handleGlobalPointerMove)
    window.addEventListener('pointerup', handleGlobalPointerUp)
    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove)
      window.removeEventListener('pointerup', handleGlobalPointerUp)
    }
  }, [])

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (event.button === 1 || event.button === 2 || spacePressed) {
      startPan(event)
      return
    }

    const rect = canvas.getBoundingClientRect()
    const gridPosition = getGridFromScreen(event.clientX - rect.left, event.clientY - rect.top)
    if (!gridPosition) return
    pointerStartRef.current = { x: event.clientX, y: event.clientY }
    dragDistanceRef.current = 0
    pointerRoomIdRef.current = findRoomAt(gridPosition.x, gridPosition.y)?.id ?? null
    if (!canManageRooms) {
      canvas.setPointerCapture(event.pointerId)
      return
    }
    setSelectionStart(gridPosition)
    setSelectionEnd(gridPosition)
    setDraftSelection(null)
    canvas.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (isPanning) return

    if (!selectionStart) return
    const rect = canvas.getBoundingClientRect()
    const gridPosition = getGridFromScreen(event.clientX - rect.left, event.clientY - rect.top)
    if (!gridPosition) return
    setSelectionEnd(gridPosition)

    if (pointerStartRef.current) {
      const deltaX = event.clientX - pointerStartRef.current.x
      const deltaY = event.clientY - pointerStartRef.current.y
      dragDistanceRef.current = Math.max(dragDistanceRef.current, Math.hypot(deltaX, deltaY))
    }
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (isPanning) {
      setIsPanning(false)
      panStartRef.current = null
      panOriginRef.current = null
      panningPointerIdRef.current = null
      canvas.releasePointerCapture(event.pointerId)
      return
    }

    if (!selectionStart && !canManageRooms) {
      const roomId = pointerRoomIdRef.current
      pointerRoomIdRef.current = null
      pointerStartRef.current = null
      dragDistanceRef.current = 0
      canvas.releasePointerCapture(event.pointerId)

      if (roomId) {
        const room = roomList.find((entry) => entry.id === roomId)
        if (room) {
          setSelectedRoomId(room.id)
          setSelectedAssetId(null)
        }
      }
      return
    }
    if (!selectionStart) return
    const rect = canvas.getBoundingClientRect()
    const endPosition =
      getGridFromScreen(event.clientX - rect.left, event.clientY - rect.top) ?? selectionEnd ?? selectionStart
    setSelectionEnd(endPosition)
    const minX = Math.min(selectionStart.x, endPosition.x)
    const minY = Math.min(selectionStart.y, endPosition.y)
    const maxX = Math.max(selectionStart.x, endPosition.x)
    const maxY = Math.max(selectionStart.y, endPosition.y)
    const currentSelection = {
      grid_x: minX,
      grid_y: minY,
      grid_w: maxX - minX + 1,
      grid_h: maxY - minY + 1,
    }
    const dragged = dragDistanceRef.current > 4
    const roomId = pointerRoomIdRef.current
    pointerRoomIdRef.current = null
    pointerStartRef.current = null
    dragDistanceRef.current = 0
    canvas.releasePointerCapture(event.pointerId)

    if (roomId && !dragged) {
      const room = roomList.find((entry) => entry.id === roomId)
      if (room) {
        setEditingRoom(room)
        setSelectedRoomId(room.id)
        setSelectedAssetId(null)
        resetSelection()
      }
      return
    }

    if (currentSelection) {
      setDraftSelection(currentSelection)
    }
  }

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault()
      const canvas = canvasRef.current
      if (!canvas || !mapImage) return
      const rect = canvas.getBoundingClientRect()
      const pointerX = event.clientX - rect.left
      const pointerY = event.clientY - rect.top
      const transform = getTransform()
      if (!transform) return
      const worldX = (pointerX - transform.offsetX) / transform.scale
      const worldY = (pointerY - transform.offsetY) / transform.scale
      const delta = event.deltaY > 0 ? -0.1 : 0.1
      const nextZoom = Math.min(Math.max(zoomRef.current + delta, 0.6), 3)
      const baseScale = Math.min(canvasSize.width / mapImage.width, canvasSize.height / mapImage.height)
      const nextScale = baseScale * nextZoom
      const nextOffsetX = pointerX - worldX * nextScale
      const nextOffsetY = pointerY - worldY * nextScale
      const baseOffsetX = (canvasSize.width - mapImage.width * nextScale) / 2
      const baseOffsetY = (canvasSize.height - mapImage.height * nextScale) / 2
      setZoom(nextZoom)
      setPan({ x: nextOffsetX - baseOffsetX, y: nextOffsetY - baseOffsetY })
    },
    [canvasSize.height, canvasSize.width, getTransform, mapImage],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const onWheel = (event: WheelEvent) => handleWheel(event)
    container.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      container.removeEventListener('wheel', onWheel)
    }
  }, [handleWheel])

  const handleZoomIn = () => {
    setZoom((value) => Math.min(value + 0.2, 3))
  }

  const handleZoomOut = () => {
    setZoom((value) => Math.max(value - 0.2, 0.6))
  }

  const handleResetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const getRoomBounds = useCallback(
    (room: Room) => {
      if (!mapImage) return null
      const cellWidth = mapImage.width / gridColumns
      const cellHeight = mapImage.height / gridRows
      const left = room.grid_x * cellWidth
      const top = room.grid_y * cellHeight
      return {
        left,
        top,
        right: left + room.grid_w * cellWidth,
        bottom: top + room.grid_h * cellHeight,
      }
    },
    [gridColumns, gridRows, mapImage],
  )

  const updateAssetOverride = useCallback((assetId: number, updates: Partial<RoomAsset>) => {
    setAssetOverrides((current) => ({
      ...current,
      [assetId]: {
        ...(current[assetId] ?? {}),
        ...updates,
      },
    }))
  }, [])

  const clampAssetPosition = useCallback(
    (room: Room, asset: RoomAsset, next: { x: number; y: number }) => {
      const bounds = getRoomBounds(room)
      if (!bounds) return next
      const scaleX = asset.scale_x ?? asset.scale ?? 1
      const scaleY = asset.scale_y ?? asset.scale ?? 1
      const scaledWidth = (asset.width ?? 64) * scaleX
      const scaledHeight = (asset.height ?? 64) * scaleY
      const halfWidth = scaledWidth / 2
      const halfHeight = scaledHeight / 2
      const minX = bounds.left - halfWidth * 0.5
      const maxX = bounds.right + halfWidth * 0.5
      const minY = bounds.top - halfHeight * 0.5
      const maxY = bounds.bottom + halfHeight * 0.5
      return {
        x: Math.min(Math.max(next.x, minX), maxX),
        y: Math.min(Math.max(next.y, minY), maxY),
      }
    },
    [getRoomBounds],
  )

  const handleAssetPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    asset: RoomAsset,
    room: Room,
  ) => {
    if (!canEditAssets(room)) return
    const canvas = canvasRef.current
    if (!canvas) return
    event.stopPropagation()
    setSelectedAssetId(asset.id)
    setDraggingAssetId(asset.id)
    setScalingAssetId(null)
    setRotatingAssetId(null)
    const rect = canvas.getBoundingClientRect()
    const world = getWorldFromScreen(event.clientX - rect.left, event.clientY - rect.top)
    if (!world) return
    const state = getAssetState(asset)
    assetDragOffsetRef.current = {
      x: state.pos_x - world.x,
      y: state.pos_y - world.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleAssetPointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
    asset: RoomAsset,
    room: Room,
  ) => {
    if (draggingAssetId !== asset.id) return
    if (!canEditAssets(room)) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const world = getWorldFromScreen(event.clientX - rect.left, event.clientY - rect.top)
    if (!world) return
    const offset = assetDragOffsetRef.current ?? { x: 0, y: 0 }
    const state = getAssetState(asset)
    const nextPos = clampAssetPosition(room, state, {
      x: world.x + offset.x,
      y: world.y + offset.y,
    })
    updateAssetOverride(asset.id, { pos_x: nextPos.x, pos_y: nextPos.y })
  }

  const handleAssetPointerUp = async (
    event: React.PointerEvent<HTMLDivElement>,
    asset: RoomAsset,
  ) => {
    if (draggingAssetId !== asset.id) return
    setDraggingAssetId(null)
    assetDragOffsetRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
    const state = getAssetState(asset)
    await persistAsset(asset.id, {
      pos_x: state.pos_x,
      pos_y: state.pos_y,
      scale_x: state.scale_x ?? state.scale ?? 1,
      scale_y: state.scale_y ?? state.scale ?? 1,
      scale: state.scale,
      rotation: state.rotation,
      z_index: state.z_index,
    })
  }

  const handleResizePointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    asset: RoomAsset,
    room: Room,
    handle: ResizeHandle,
  ) => {
    if (!canEditAssets(room)) return
    event.stopPropagation()
    setSelectedAssetId(asset.id)
    setDraggingAssetId(null)
    setRotatingAssetId(null)
    setScalingAssetId(asset.id)
    const state = getAssetState(asset)
    assetScaleRef.current = {
      id: asset.id,
      handle,
      startScaleX: state.scale_x ?? state.scale ?? 1,
      startScaleY: state.scale_y ?? state.scale ?? 1,
      center: { x: state.pos_x, y: state.pos_y },
      naturalWidth: state.width ?? 64,
      naturalHeight: state.height ?? 64,
      rotation: state.rotation ?? 0,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleResizePointerMove = (
    event: React.PointerEvent<HTMLButtonElement>,
    asset: RoomAsset,
    room: Room,
  ) => {
    if (scalingAssetId !== asset.id) return
    if (!canEditAssets(room)) return
    const world = getWorldFromPointer(event)
    if (!world) return
    const data = assetScaleRef.current
    if (!data) return
    const dx = world.x - data.center.x
    const dy = world.y - data.center.y
    const angle = (-data.rotation * Math.PI) / 180
    const localX = dx * Math.cos(angle) - dy * Math.sin(angle)
    const localY = dx * Math.sin(angle) + dy * Math.cos(angle)
    const affectsX = data.handle.includes('e') || data.handle.includes('w')
    const affectsY = data.handle.includes('n') || data.handle.includes('s')
    const clampScale = (value: number) => Math.min(3, Math.max(0.2, value))

    const rawScaleX = affectsX
      ? clampScale((Math.abs(localX) * 2) / Math.max(1, data.naturalWidth))
      : data.startScaleX
    const rawScaleY = affectsY
      ? clampScale((Math.abs(localY) * 2) / Math.max(1, data.naturalHeight))
      : data.startScaleY
    const shouldUniformScale = event.ctrlKey && data.handle.length === 2
    const uniformScale = shouldUniformScale ? clampScale(Math.max(rawScaleX, rawScaleY)) : null
    const nextScaleX = shouldUniformScale ? uniformScale! : rawScaleX
    const nextScaleY = shouldUniformScale ? uniformScale! : rawScaleY

    updateAssetOverride(asset.id, {
      scale_x: Number(nextScaleX.toFixed(3)),
      scale_y: Number(nextScaleY.toFixed(3)),
      scale: (nextScaleX + nextScaleY) / 2,
    })
  }

  const handleResizePointerUp = async (event: React.PointerEvent<HTMLButtonElement>, asset: RoomAsset) => {
    if (scalingAssetId !== asset.id) return
    setScalingAssetId(null)
    assetScaleRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
    const state = getAssetState(asset)
    await persistAsset(asset.id, {
      pos_x: state.pos_x,
      pos_y: state.pos_y,
      scale_x: state.scale_x ?? state.scale ?? 1,
      scale_y: state.scale_y ?? state.scale ?? 1,
      scale: state.scale,
      rotation: state.rotation,
      z_index: state.z_index,
    })
  }

  const handleRotatePointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    asset: RoomAsset,
    room: Room,
  ) => {
    if (!canEditAssets(room)) return
    event.stopPropagation()
    setSelectedAssetId(asset.id)
    setDraggingAssetId(null)
    setScalingAssetId(null)
    setRotatingAssetId(asset.id)
    const world = getWorldFromPointer(event)
    if (!world) return
    const center = { x: asset.pos_x, y: asset.pos_y }
    const startAngle = Math.atan2(world.y - center.y, world.x - center.x)
    assetRotateRef.current = {
      id: asset.id,
      startAngle,
      startRotation: asset.rotation,
      center,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleRotatePointerMove = (
    event: React.PointerEvent<HTMLButtonElement>,
    asset: RoomAsset,
    room: Room,
  ) => {
    if (rotatingAssetId !== asset.id) return
    if (!canEditAssets(room)) return
    const world = getWorldFromPointer(event)
    if (!world) return
    const data = assetRotateRef.current
    if (!data) return
    const currentAngle = Math.atan2(world.y - data.center.y, world.x - data.center.x)
    const delta = ((currentAngle - data.startAngle) * 180) / Math.PI
    const rawRotation = normalizeRotation(data.startRotation + delta)
    const nextRotation = event.shiftKey ? snapRotation(rawRotation, 15) : rawRotation
    updateAssetOverride(asset.id, { rotation: Number(nextRotation.toFixed(2)) })
  }

  const handleRotatePointerUp = async (event: React.PointerEvent<HTMLButtonElement>, asset: RoomAsset) => {
    if (rotatingAssetId !== asset.id) return
    setRotatingAssetId(null)
    assetRotateRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
    const state = getAssetState(asset)
    await persistAsset(asset.id, {
      pos_x: state.pos_x,
      pos_y: state.pos_y,
      scale_x: state.scale_x ?? state.scale ?? 1,
      scale_y: state.scale_y ?? state.scale ?? 1,
      scale: state.scale,
      rotation: state.rotation,
      z_index: state.z_index,
    })
  }

  const roomBoxes = useMemo(() => {
    if (!mapImage) return []
    const currentTransform = getTransform()
    if (!currentTransform) return []
    const cellWidth = mapImage.width / gridColumns
    const cellHeight = mapImage.height / gridRows
    return roomList.map((room) => ({
      room,
      left: currentTransform.offsetX + room.grid_x * cellWidth * currentTransform.scale,
      top: currentTransform.offsetY + room.grid_y * cellHeight * currentTransform.scale,
      width: room.grid_w * cellWidth * currentTransform.scale,
      height: room.grid_h * cellHeight * currentTransform.scale,
    }))
  }, [gridColumns, gridRows, getTransform, mapImage, roomList])

  const canEditRoom = useCallback(
    (room?: Room | null) => {
      if (!room) return false
      if (canManageRooms) return true
      return room.character?.user_id === userId
    },
    [canManageRooms, userId],
  )

  const canEditAssets = useCallback(
    (room?: Room | null) => {
      if (!room) return false
      if (canManageRooms) return false
      return room.character?.user_id === userId
    },
    [canManageRooms, userId],
  )

  const canViewRoomAssets = useCallback(
    (room?: Room | null) => {
      if (!room) return false
      if (canManageRooms) return true
      return room.character?.user_id === userId
    },
    [canManageRooms, userId],
  )

  const getAssetState = useCallback(
    (asset: RoomAsset) => {
      const overrides = assetOverrides[asset.id] ?? {}
      const baseScale = asset.scale ?? 1
      const scaleX = overrides.scale_x ?? asset.scale_x ?? baseScale
      const scaleY = overrides.scale_y ?? asset.scale_y ?? baseScale
      return {
        ...asset,
        ...overrides,
        scale: overrides.scale ?? asset.scale ?? (scaleX + scaleY) / 2,
        scale_x: scaleX,
        scale_y: scaleY,
      }
    },
    [assetOverrides],
  )

  const assetEntries = useMemo(
    () =>
      roomList.flatMap((room) => {
        if (!canViewRoomAssets(room)) {
          return []
        }
        return (room.assets ?? []).map((asset) => ({
          asset,
          room,
        }))
      }),
    [canViewRoomAssets, roomList],
  )

  const selectedRoomAssets =
    selectedRoom && canViewRoomAssets(selectedRoom) ? selectedRoom.assets ?? [] : []
  const selectedAssetEntry = useMemo(
    () => assetEntries.find((entry) => entry.asset.id === selectedAssetId) ?? null,
    [assetEntries, selectedAssetId],
  )
  const selectedAsset = selectedAssetEntry ? getAssetState(selectedAssetEntry.asset) : null
  const selectedAssetRoom = selectedAssetEntry?.room ?? null
  const canEditSelectedRoom = canEditAssets(selectedRoom)

  const assetBoxes = useMemo(() => {
    if (!mapImage) return []
    const currentTransform = getTransform()
    if (!currentTransform) return []

    return assetEntries.map(({ asset, room }) => {
      const state = getAssetState(asset)
      const naturalWidth = state.width ?? 64
      const naturalHeight = state.height ?? 64
      const scaleX = state.scale_x ?? state.scale ?? 1
      const scaleY = state.scale_y ?? state.scale ?? 1
      const width = naturalWidth * scaleX * currentTransform.scale
      const height = naturalHeight * scaleY * currentTransform.scale
      return {
        asset: state,
        room,
        left: currentTransform.offsetX + state.pos_x * currentTransform.scale,
        top: currentTransform.offsetY + state.pos_y * currentTransform.scale,
        width,
        height,
      }
    })
  }, [assetEntries, getAssetState, getTransform, mapImage])

  const resolveAvatarSrc = useCallback((avatar?: string | null) => {
    if (!avatar) return null
    return avatar.startsWith('http') ? avatar : `/storage/${avatar}`
  }, [])

  const getCsrfToken = useCallback(() => {
    if (typeof document === 'undefined') return ''
    const meta = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement | null
    return meta?.content ?? ''
  }, [])

  const fetchLibrary = useCallback(
    async (page: number, category: string, search: string) => {
      if (canManageRooms) return
      if (!isLibraryOpen) return
      setLibraryLoading(true)
      setLibraryError(null)
      try {
        const response = await fetch(
          route('rooms.assets.library.index', {
            page,
            per_page: libraryPerPage,
            category: category || undefined,
            search: search || undefined,
          }),
          {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
          },
        )

        if (!response.ok) {
          setLibraryError('Library could not be loaded.')
          setLibraryLoading(false)
          return
        }

        const payload = await response.json()
        setLibraryItems(payload.items ?? [])
        setLibraryCategories(payload.categories ?? [])
        setLibraryTotal(payload.total ?? 0)
      } catch {
        setLibraryError('Library could not be loaded.')
      } finally {
        setLibraryLoading(false)
      }
    },
    [canManageRooms, isLibraryOpen, libraryPerPage],
  )

  useEffect(() => {
    if (canManageRooms || !isLibraryOpen) return
    setLibraryPage(1)
  }, [canManageRooms, isLibraryOpen, libraryCategory, librarySearch])

  useEffect(() => {
    if (canManageRooms || !isLibraryOpen) return
    const handle = window.setTimeout(() => {
      fetchLibrary(libraryPage, libraryCategory, librarySearch)
    }, librarySearch ? 300 : 0)
    return () => window.clearTimeout(handle)
  }, [canManageRooms, fetchLibrary, isLibraryOpen, libraryCategory, libraryPage, librarySearch])

  const persistAsset = useCallback(
    async (
      assetId: number,
      payload: { pos_x: number; pos_y: number; scale_x: number; scale_y: number; rotation: number; z_index?: number; scale?: number },
    ) => {
      const csrfToken = getCsrfToken()
      if (!csrfToken) {
        toast.show('Missing CSRF token.', 'error')
        return false
      }

      try {
        const response = await fetch(route('rooms.assets.update', { roomAsset: assetId }), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRF-TOKEN': csrfToken,
          },
          credentials: 'same-origin',
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          toast.show('Asset could not be saved.', 'error')
          return false
        }

        return true
      } catch {
        toast.show('Asset could not be saved.', 'error')
        return false
      }
    },
    [getCsrfToken],
  )

  const handleAssetUpload = () => {
    if (!selectedRoom || !assetForm.image) return
    if (!canEditRoom(selectedRoom)) return

    postAsset(route('rooms.assets.store', { room: selectedRoom.id }), {
      forceFormData: true,
      onSuccess: () => {
        setIsUploadOpen(false)
        resetAssetForm()
        router.reload({ preserveScroll: true, preserveState: true })
      },
      onError: (errors) => {
        const message = errors.image || 'Upload failed.'
        toast.show(String(message), 'error')
      },
    })
  }

  const handleAssetDelete = (assetId: number, room?: Room | null) => {
    const targetRoom = room ?? selectedRoom
    if (!targetRoom || !canEditAssets(targetRoom)) return
    if (!window.confirm('Remove this asset?')) return

    router.delete(route('rooms.assets.destroy', { roomAsset: assetId }), {
      preserveScroll: true,
      onSuccess: () => {
        setSelectedAssetId((current) => (current === assetId ? null : current))
        router.reload({ preserveScroll: true, preserveState: true })
      },
      onError: () => {
        toast.show('Asset could not be removed.', 'error')
      },
    })
  }

  const handleLibraryAdd = async (item: LibraryItem) => {
    if (!selectedRoom) {
      toast.show('Select a room first.', 'error')
      return
    }
    if (!canEditAssets(selectedRoom)) {
      toast.show('You can only add assets to your own room.', 'error')
      return
    }

    const csrfToken = getCsrfToken()
    if (!csrfToken) {
      toast.show('Missing CSRF token.', 'error')
      return
    }

    try {
      const response = await fetch(route('rooms.assets.library.store', { room: selectedRoom.id }), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify({ library_path: item.path }),
      })

      if (!response.ok) {
        toast.show('Asset could not be added.', 'error')
        return
      }

      toast.show('Asset added.', 'info')
      router.reload({ preserveScroll: true, preserveState: true })
    } catch {
      toast.show('Asset could not be added.', 'error')
    }
  }

  const handleAdminClearAssets = () => {
    if (!canManageRooms || !selectedRoom) return
    if (!selectedRoom.assets || selectedRoom.assets.length === 0) return
    if (!window.confirm('Delete all assets for this room?')) return

    router.delete(route('admin.rooms.assets.destroy', { room: selectedRoom.id }), {
      preserveScroll: true,
      onSuccess: () => {
        setSelectedAssetId(null)
        router.reload({ preserveScroll: true, preserveState: true })
      },
      onError: () => {
        toast.show('Assets could not be removed.', 'error')
      },
    })
  }

  return (
    <AppLayout>
      <Head title="Rooms" />
      <div className="container mx-auto max-w-6xl space-y-6 px-4 py-6">
        <section className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">Rooms</h1>
            <p className="text-sm text-base-content/70">
              {canManageRooms
                ? 'Assign characters to rooms on the castle map. Drag a grid area to add a room.'
                : 'Place your room assets on the map.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <div className="min-w-[200px]">
              <Select
                value={String(activeMap.id)}
                onChange={(e) =>
                  router.get(route(canManageRooms ? 'admin.rooms.index' : 'rooms.index', { map: e.target.value }))
                }
                className="select-sm"
              >
                <SelectLabel className="sr-only">Floor</SelectLabel>
                <SelectOptions>
                  {roomMaps.map((map) => (
                    <option key={map.id} value={map.id}>
                      {map.name}
                    </option>
                  ))}
                </SelectOptions>
              </Select>
            </div>
            {canManageRooms ? (
              <>
                <Button size="sm" variant="outline" onClick={openCreateMapModal}>
                  <Plus size={14} /> Add floor
                </Button>
                <Button size="sm" variant="outline" onClick={openEditMapModal}>
                  <Pencil size={14} /> Edit floor
                </Button>
                {selection ? (
                  <Button size="sm" variant="outline" onClick={resetSelection}>
                    Clear selection
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>
        </section>

        <div className="rounded-box border border-base-200 bg-base-100 p-4">
          <div className="text-xs text-base-content/60 flex items-center gap-2">
            <MapPin size={14} />
            Grid: {gridColumns} x {gridRows} | Rooms: {roomList.length}
          </div>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row">
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <div className="relative w-full overflow-hidden rounded-xl border border-base-200 bg-neutral/70 lg:max-w-none">
                <div
                  ref={containerRef}
                  className="relative w-full aspect-square"
                  onContextMenu={(event) => event.preventDefault()}
                  onPointerDownCapture={(event) => {
                    if (event.button !== 1 && event.button !== 2) return
                    if (event.target === canvasRef.current) return
                    startPan(event)
                    event.stopPropagation()
                  }}
                >
                <canvas
                  ref={canvasRef}
                  className={cn(
                    'h-full w-full touch-none',
                    isPanning ? 'cursor-grabbing' : spacePressed ? 'cursor-grab' : 'cursor-crosshair',
                  )}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onContextMenu={(event) => event.preventDefault()}
                ></canvas>
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_55%,rgba(0,0,0,0.45))]" />
                <div className="pointer-events-none absolute inset-0 opacity-25 mix-blend-soft-light bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.04)_0,rgba(255,255,255,0.04)_1px,rgba(0,0,0,0.02)_1px,rgba(0,0,0,0.02)_2px)]" />
                <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-full border border-base-200 bg-base-100/90 px-2 py-1 text-xs shadow-sm">
                  <Button
                    size="xs"
                    variant={showOverlays ? 'soft' : 'ghost'}
                    color={showOverlays ? 'primary' : undefined}
                    onClick={() => setShowOverlays((value) => !value)}
                    aria-pressed={showOverlays}
                  >
                    {showOverlays ? 'Hide label' : 'Show label'}
                  </Button>
                  <span className="h-4 w-px bg-base-200/80" />
                  <Button size="xs" variant="ghost" onClick={handleZoomOut}>
                    <Minus size={12} />
                  </Button>
                  <span className="min-w-[48px] text-center text-[11px]">{Math.round(zoom * 100)}%</span>
                  <Button size="xs" variant="ghost" onClick={handleZoomIn}>
                    <Plus size={12} />
                  </Button>
                  <Button size="xs" variant="ghost" onClick={handleResetView}>
                    Reset
                  </Button>
                </div>
                <div className="absolute inset-0 pointer-events-none">
                  {assetBoxes.map(({ asset, room, left, top, width, height }) => {
                    const editable = canEditAssets(room)
                    const isSelected = selectedAssetId === asset.id
                    const showHandles = editable && isSelected
                    return (
                      <div
                        key={`asset-${asset.id}`}
                        className={cn(
                          'absolute flex items-center justify-center',
                          editable ? 'pointer-events-auto cursor-grab' : 'pointer-events-none opacity-80',
                          draggingAssetId === asset.id && 'cursor-grabbing',
                        )}
                        style={{
                          left,
                          top,
                          width,
                          height,
                          transform: 'translate(-50%, -50%)',
                          zIndex: 5 + (asset.z_index ?? 0),
                        }}
                        role={editable ? 'button' : undefined}
                        tabIndex={editable ? 0 : -1}
                        onPointerDown={(event) => handleAssetPointerDown(event, asset, room)}
                        onPointerMove={(event) => handleAssetPointerMove(event, asset, room)}
                        onPointerUp={(event) => handleAssetPointerUp(event, asset)}
                        onClick={(event) => {
                          event.stopPropagation()
                          setSelectedRoomId(room.id)
                          setSelectedAssetId(asset.id)
                        }}
                      >
                        <div className="relative h-full w-full" style={{ transform: `rotate(${asset.rotation}deg)` }}>
                          <img
                            src={asset.file_path}
                            alt={asset.original_name ?? 'Room asset'}
                            className="h-full w-full object-fill"
                            draggable={false}
                          />
                          {showHandles ? (
                            <>
                              <div className="absolute inset-0 border border-primary/60 pointer-events-none" />
                              <button
                                type="button"
                                className="absolute left-1/2 -top-7 z-20 h-3.5 w-3.5 rounded-full border border-primary/70 bg-base-100 shadow-sm cursor-grab"
                                style={{ transform: `translateX(-50%) rotate(${-asset.rotation}deg)` }}
                                onPointerDown={(event) => handleRotatePointerDown(event, asset, room)}
                                onPointerMove={(event) => handleRotatePointerMove(event, asset, room)}
                                onPointerUp={(event) => handleRotatePointerUp(event, asset)}
                                aria-label="Rotate asset"
                              />
                              {resizeHandlePositions.map((handle) => (
                                <button
                                  key={`${asset.id}-${handle.key}`}
                                  type="button"
                                  className={cn(
                                    'absolute h-3.5 w-3.5 rounded-sm border border-primary/70 bg-base-100 shadow-sm',
                                    resizeHandleCursor[handle.key],
                                    handle.className,
                                  )}
                                  onPointerDown={(event) => handleResizePointerDown(event, asset, room, handle.key)}
                                  onPointerMove={(event) => handleResizePointerMove(event, asset, room)}
                                  onPointerUp={(event) => handleResizePointerUp(event, asset)}
                                  aria-label="Resize asset"
                                />
                              ))}
                            </>
                          ) : null}
                        </div>
                        {showHandles ? (
                          <button
                            type="button"
                            className="absolute -left-7 -top-7 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-base-200 bg-base-100/95 text-base-content/70 shadow-sm hover:bg-base-200/70 hover:text-base-content"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                              event.stopPropagation()
                              handleAssetDelete(asset.id, room)
                            }}
                            aria-label="Remove asset"
                          >
                            <Trash2 size={12} />
                          </button>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
                <div className="absolute inset-0 pointer-events-none">
                  {roomBoxes.map(({ room, left, top, width, height }) => {
                    const character = room.character ?? null
                    const avatarSize = Math.max(20, Math.min(32, height * 0.6))
                    const labels: string[] = []
                    if (showOverlays) {
                      if (character?.name) {
                        labels.push(character.name)
                      } else {
                        labels.push(room.name)
                      }
                    }
                    const showLabel = labels.length > 0 && width > 40 && height > 28
                    const avatarSrc = resolveAvatarSrc(character?.avatar ?? null)
                    const isAssigned = Boolean(character?.id)
                    const isSelectedRoom = selectedRoomId === room.id
                    const hasRoomSelection = selectedRoomId !== null
                    return (
                      <button
                        key={room.id}
                        type="button"
                        className={cn(
                          'pointer-events-auto absolute flex flex-col items-center justify-center gap-1 rounded-lg border text-[12px] text-base-content shadow-md',
                          (spacePressed || isPanning) && 'pointer-events-none',
                          isSelectedRoom
                            ? 'border-primary/80 ring-2 ring-primary/40'
                            : isAssigned
                              ? 'border-primary/60'
                              : 'border-base-200/60',
                          'bg-transparent',
                        )}
                        style={{ left, top, width, height }}
                        onClick={(event) => {
                          event.stopPropagation()
                          setSelectedRoomId(room.id)
                          setSelectedAssetId(null)
                          if (canManageRooms) {
                            setEditingRoom(room)
                            resetSelection()
                          }
                        }}
                      >
                        <div
                          className={cn(
                            'flex flex-col items-center justify-center gap-1',
                            hasRoomSelection && !isSelectedRoom && 'opacity-60',
                          )}
                        >
                          {showOverlays && isAssigned && avatarSrc ? (
                            <img
                              src={avatarSrc}
                              alt={character.name}
                              className="relative z-20 rounded-full border border-base-100 object-cover shadow-sm ring-1 ring-base-100/60"
                              style={{ width: avatarSize, height: avatarSize }}
                            />
                          ) : showOverlays && isAssigned ? (
                            <div
                              className="relative z-20 rounded-full bg-base-200 text-[11px] font-semibold flex items-center justify-center shadow-sm ring-1 ring-base-100/60"
                              style={{ width: avatarSize, height: avatarSize }}
                            >
                              {getInitials(character?.name ?? room.name)}
                            </div>
                          ) : null}
                          {showLabel ? (
                            <span className="relative z-20 truncate max-w-full rounded-full bg-base-100/90 px-2 py-0.5 text-[11px] font-semibold text-base-content shadow-sm ring-1 ring-base-100/70">
                              {labels[0]}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
            </div>
            <div className="w-full lg:w-80 shrink-0 space-y-3">
              {canManageRooms ? (
                <div className="rounded-xl border border-base-200 p-4">
                  <h2 className="text-sm font-semibold">Assign rooms</h2>
                  <p className="mt-1 text-xs text-base-content/60">
                    Drag across the grid to create a room. Click a room to edit or assign a character.
                  </p>
                  {selection ? (
                    <div className="mt-3 flex items-center gap-2 text-xs text-base-content/70">
                      <Check size={14} />
                      Selected area: X{selection.grid_x} Y{selection.grid_y} x {selection.grid_w}x{selection.grid_h}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-base-content/50">No selection yet.</p>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-base-200 p-4 h-[120px] flex flex-col">
                  <div>
                    <h2 className="text-sm font-semibold">Your room</h2>
                    <p className="mt-1 text-xs text-base-content/60">
                      Select your room on the map to manage your assets.
                    </p>
                  </div>
                  <div className="mt-auto min-h-[18px] truncate text-xs text-base-content/70">
                    {selectedRoom ? (
                      selectedRoom.character?.name ?? selectedRoom.name
                    ) : (
                      <span className="text-base-content/50">No room selected.</span>
                    )}
                  </div>
                </div>
              )}
              {!canManageRooms ? (
                <div className="rounded-xl border border-base-200 p-4 h-[140px] flex flex-col">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold">Asset library</h3>
                      <p className="mt-1 text-xs text-base-content/60">Browse furniture and add it to your room.</p>
                    </div>
                    <Button size="xs" variant="outline" onClick={() => setIsLibraryOpen(true)} className="gap-2">
                      <Search size={14} />
                      Browse
                    </Button>
                  </div>
                  <div className="mt-auto space-y-2">
                    <div className="text-xs text-base-content/50">
                      {libraryTotal > 0
                        ? `${libraryTotal} assets | ${libraryCategories.length} categories`
                        : 'Open the library to load available assets.'}
                    </div>
                    <p className="text-[11px] text-base-content/45">
                      Assets by{' '}
                      <a
                        href="https://2minutetabletop.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2"
                      >
                        2-Minute Tabletop
                      </a>
                      .
                    </p>
                  </div>
                </div>
              ) : null}
              <div className="rounded-xl border border-base-200 p-4 h-[420px] flex flex-col">
                <div className="flex min-h-[32px] items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold">Room assets</h3>
                    <p className="mt-1 text-xs text-base-content/60 line-clamp-1">
                      {selectedRoom ? `Assets for ${selectedRoom.name}.` : 'Select a room to view assets.'}
                    </p>
                  </div>
                  <div className="flex min-h-[28px] items-center gap-2">
                    <div className="w-24">
                      {selectedRoom && canEditSelectedRoom ? (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => setIsUploadOpen(true)}
                          className="w-24 justify-center gap-2"
                        >
                          <ImagePlus size={14} />
                          Upload
                        </Button>
                      ) : (
                        <span className="inline-block h-7 w-24" />
                      )}
                    </div>
                    {canManageRooms ? (
                      <div className="w-28">
                        {selectedRoom ? (
                          <Button
                            size="xs"
                            variant="outline"
                            color="error"
                            onClick={handleAdminClearAssets}
                            disabled={!selectedRoom.assets || selectedRoom.assets.length === 0}
                            className="w-28 justify-center gap-2"
                          >
                            <Trash2 size={12} />
                            Clear assets
                          </Button>
                        ) : (
                          <span className="inline-block h-7 w-28" />
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div
                  className="mt-3 flex-1 overflow-y-scroll space-y-2 text-xs text-base-content/70"
                  style={{ scrollbarGutter: 'stable' }}
                >
                  {!selectedRoom ? (
                    <p className="text-base-content/50">Select a room to view assets.</p>
                  ) : !canViewRoomAssets(selectedRoom) ? (
                    <p className="text-base-content/50">Assets are private to the room owner.</p>
                  ) : canManageRooms ? (
                    <p className="text-base-content/50">Assets are read-only here. Manage them in /rooms.</p>
                  ) : selectedRoomAssets.length === 0 ? (
                    <p className="text-base-content/50">No assets yet.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {selectedRoomAssets.map((asset) => (
                        <button
                          key={`asset-list-${asset.id}`}
                          type="button"
                          title={asset.original_name ?? `Asset #${asset.id}`}
                          className={cn(
                            'group relative aspect-square w-full overflow-hidden rounded-lg border border-base-200 bg-base-100',
                            selectedAssetId === asset.id ? 'border-primary/60 ring-2 ring-primary/30' : '',
                          )}
                          onClick={() => setSelectedAssetId(asset.id)}
                        >
                          <img
                            src={asset.file_path}
                            alt={asset.original_name ?? `Asset #${asset.id}`}
                            className="h-full w-full object-contain p-2"
                            draggable={false}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-4 h-[18px] overflow-hidden border-t border-base-200 pt-3 text-xs text-base-content/60">
                  {selectedAsset && selectedAssetRoom?.id === selectedRoom?.id ? (
                    <span className="line-clamp-1">
                      Use the on-map handles to rotate, resize, or delete the selected asset.
                    </span>
                  ) : (
                    <span className="line-clamp-1 text-base-content/40">Select an asset to see controls.</span>
                  )}
                </div>
              </div>
              {canManageRooms ? (
                <div className="rounded-xl border border-base-200 p-4">
                  <h3 className="text-sm font-semibold">Assigned characters</h3>
                  <p className="mt-1 text-xs text-base-content/60">
                    {roomList.filter((room) => room.character_id).length} of {roomList.length} rooms occupied.
                  </p>
                  <div className="mt-3 space-y-2 text-xs text-base-content/70 max-h-64 overflow-y-auto">
                    {roomList.length === 0 ? (
                      <p className="text-base-content/50">No rooms created yet.</p>
                    ) : (
                      roomList.map((room) => (
                        <div key={`list-${room.id}`} className="flex items-center justify-between gap-2">
                          <span className="truncate">{room.name}</span>
                          <span className="truncate text-base-content/50">
                            {room.character?.name ?? 'Unassigned'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {canManageRooms && draftSelection ? (
        <RoomFormModal
          open
          title="Add room"
          submitLabel="Save"
          map={activeMap}
          characters={sortedCharacters}
          initialValues={mapSelectionToForm(draftSelection, activeMap.id)}
          onClose={() => {
            setDraftSelection(null)
            resetSelection()
          }}
          onSubmit={handleCreateRoom}
        />
      ) : null}

      {canManageRooms && editingRoom ? (
        <RoomFormModal
          open
          title="Edit room"
          submitLabel="Save"
          map={activeMap}
          characters={sortedCharacters}
          initialValues={{
            room_map_id: editingRoom.room_map_id,
            name: editingRoom.name,
            grid_x: editingRoom.grid_x,
            grid_y: editingRoom.grid_y,
            grid_w: editingRoom.grid_w,
            grid_h: editingRoom.grid_h,
            character_id: editingRoom.character_id ?? null,
          }}
          onClose={() => setEditingRoom(null)}
          onSubmit={handleUpdateRoom}
          onDelete={handleDeleteRoom}
        />
      ) : null}

      <Modal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)}>
        <ModalTitle>Upload asset</ModalTitle>
        <ModalContent>
          <FileInput
            errors={errors?.image ? String(errors.image) : ''}
            onChange={(event) => setAssetForm('image', event.target?.files?.[0] ?? null)}
          >
            Asset image
          </FileInput>
          <p className="text-xs text-base-content/60">Images only. Place it by dragging on the map.</p>
        </ModalContent>
        <ModalAction onClick={handleAssetUpload} disabled={assetUploading || !assetForm.image}>
          Upload
        </ModalAction>
      </Modal>

      {!canManageRooms ? (
        <Modal isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)}>
          <ModalTitle>Asset library</ModalTitle>
          <ModalContent>
            <div className="space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
                <label className="label sr-only" htmlFor="asset-library-search">
                  Search
                </label>
                <input
                  id="asset-library-search"
                  className="input w-full pl-9"
                  value={librarySearch}
                  onChange={(event) => setLibrarySearch(event.target.value)}
                  placeholder="Search assets..."
                  type="search"
                />
              </div>
              <Select value={libraryCategory} onChange={(event) => setLibraryCategory(event.target.value)}>
                <SelectLabel>Category</SelectLabel>
                <SelectOptions>
                  <option value="">All categories</option>
                  {libraryCategories.map((category) => (
                    <option key={category.key} value={category.key}>
                      {category.label}
                    </option>
                  ))}
                </SelectOptions>
              </Select>
            </div>
            <div className="mt-4 max-h-[60vh] overflow-y-auto pr-1">
              {libraryLoading ? (
                <div className="flex items-center gap-2 text-xs text-base-content/60">
                  <Loader2 size={14} className="animate-spin" />
                  Loading assets...
                </div>
              ) : libraryError ? (
                <p className="text-xs text-error">{libraryError}</p>
              ) : libraryItems.length === 0 ? (
                <p className="text-xs text-base-content/50">No assets found.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {libraryItems.map((item) => (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => handleLibraryAdd(item)}
                      disabled={!selectedRoom || !canEditSelectedRoom}
                      className="group flex flex-col items-start gap-2 rounded-lg border border-base-200 bg-base-100 p-2 text-left transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <img
                        src={item.url}
                        alt={item.label}
                        className="h-20 w-full rounded-md object-contain bg-base-200/40"
                      />
                      <span className="line-clamp-2 text-xs font-semibold text-base-content/80">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-base-content/60">
              <span>
                Page {libraryPage} / {libraryTotalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setLibraryPage((page) => Math.max(page - 1, 1))}
                  disabled={libraryPage <= 1}
                >
                  <ChevronLeft size={12} />
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setLibraryPage((page) => Math.min(page + 1, libraryTotalPages))}
                  disabled={libraryPage >= libraryTotalPages}
                >
                  <ChevronRight size={12} />
                </Button>
              </div>
            </div>
          </ModalContent>
        </Modal>
      ) : null}

      {canManageRooms ? (
        <RoomMapFormModal
          open={isMapModalOpen}
          mode={mapModalMode}
          map={mapModalTarget}
          onClose={() => setIsMapModalOpen(false)}
        />
      ) : null}
    </AppLayout>
  )
}


