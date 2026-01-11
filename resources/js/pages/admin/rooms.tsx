import { Button } from '@/components/ui/button'
import { FileInput } from '@/components/ui/file-input'
import { Input } from '@/components/ui/input'
import { Modal, ModalAction, ModalContent, ModalTitle } from '@/components/ui/modal'
import { Select, SelectLabel, SelectOptions } from '@/components/ui/select'
import AppLayout from '@/layouts/app-layout'
import { cn } from '@/lib/utils'
import { PageProps, Room, RoomCharacter, RoomMap } from '@/types'
import { Head, router, useForm, usePage } from '@inertiajs/react'
import { Check, MapPin, Minus, Pencil, Plus, Trash2 } from 'lucide-react'
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
}: {
  roomMaps: RoomMap[]
  roomMap: RoomMap | null
  characters: RoomCharacterEntry[]
}) {
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null)
  const [draftSelection, setDraftSelection] = useState<RoomSelection | null>(null)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [isMapModalOpen, setIsMapModalOpen] = useState(false)
  const [mapModalMode, setMapModalMode] = useState<'create' | 'edit'>('create')
  const [mapModalTarget, setMapModalTarget] = useState<RoomMap | null>(null)
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [spacePressed, setSpacePressed] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const panStartRef = useRef<{ x: number; y: number } | null>(null)
  const panOriginRef = useRef<{ x: number; y: number } | null>(null)
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)
  const dragDistanceRef = useRef(0)
  const pointerRoomIdRef = useRef<number | null>(null)
  const panRef = useRef(pan)
  const zoomRef = useRef(zoom)
  const getInitials = useInitials()

  const activeMap = roomMap ?? null

  const sortedCharacters = useMemo(
    () => [...characters].sort((a, b) => a.name.localeCompare(b.name)),
    [characters],
  )

  useEffect(() => {
    panRef.current = pan
  }, [pan])

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
    setDraftSelection(null)
    setSelectionStart(null)
    setSelectionEnd(null)
  }, [activeMap?.id])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return
      const target = event.target as HTMLElement | null
      const isTypingTarget =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      if (isTypingTarget) return
      event.preventDefault()
      setSpacePressed(true)
    }
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return
      const target = event.target as HTMLElement | null
      const isTypingTarget =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
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
            <Button size="sm" variant="outline" onClick={openCreateMapModal}>
              Add floor
            </Button>
          </div>
        </div>
        <RoomMapFormModal
          open={isMapModalOpen}
          mode={mapModalMode}
          map={mapModalTarget}
          onClose={() => setIsMapModalOpen(false)}
        />
      </AppLayout>
    )
  }

  const gridColumns = activeMap.grid_columns
  const gridRows = activeMap.grid_rows
  const roomList = activeMap.rooms ?? []

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

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (event.button === 1 || event.button === 2 || spacePressed) {
      event.preventDefault()
      setIsPanning(true)
      panStartRef.current = { x: event.clientX, y: event.clientY }
      panOriginRef.current = { ...panRef.current }
      canvas.setPointerCapture(event.pointerId)
      return
    }

    const rect = canvas.getBoundingClientRect()
    const gridPosition = getGridFromScreen(event.clientX - rect.left, event.clientY - rect.top)
    if (!gridPosition) return
    pointerStartRef.current = { x: event.clientX, y: event.clientY }
    dragDistanceRef.current = 0
    pointerRoomIdRef.current = findRoomAt(gridPosition.x, gridPosition.y)?.id ?? null
    setSelectionStart(gridPosition)
    setSelectionEnd(gridPosition)
    setDraftSelection(null)
    canvas.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (isPanning) {
      const start = panStartRef.current
      const origin = panOriginRef.current
      if (!start || !origin) return
      const deltaX = event.clientX - start.x
      const deltaY = event.clientY - start.y
      setPan({ x: origin.x + deltaX, y: origin.y + deltaY })
      return
    }

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
      canvas.releasePointerCapture(event.pointerId)
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

  const resolveAvatarSrc = useCallback((avatar?: string | null) => {
    if (!avatar) return null
    return avatar.startsWith('http') ? avatar : `/storage/${avatar}`
  }, [])

  return (
    <AppLayout>
      <Head title="Rooms" />
      <div className="container mx-auto max-w-6xl space-y-6 px-4 py-6">
        <section className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">Rooms</h1>
            <p className="text-sm text-base-content/70">
              Assign characters to rooms on the castle map. Drag a grid area to add a room.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <div className="min-w-[200px]">
              <Select
                value={String(activeMap.id)}
                onChange={(e) => router.get(route('admin.rooms.index', { map: e.target.value }))}
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
          </div>
        </section>

        <div className="rounded-box border border-base-200 bg-base-100 p-4">
          <div className="text-xs text-base-content/60 flex items-center gap-2">
            <MapPin size={14} />
            Grid: {gridColumns} x {gridRows} | Rooms: {roomList.length}
          </div>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row">
            <div className="relative w-full max-w-4xl overflow-hidden rounded-xl border border-base-200 bg-neutral/70">
              <div ref={containerRef} className="relative w-full aspect-square">
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
                />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_55%,rgba(0,0,0,0.45))]" />
                <div className="pointer-events-none absolute inset-0 opacity-25 mix-blend-soft-light bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.04)_0,rgba(255,255,255,0.04)_1px,rgba(0,0,0,0.02)_1px,rgba(0,0,0,0.02)_2px)]" />
                <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-full border border-base-200 bg-base-100/90 px-2 py-1 text-xs shadow-sm">
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
                  {roomBoxes.map(({ room, left, top, width, height }) => {
                    const character = room.character ?? null
                    const avatarSize = Math.max(20, Math.min(32, height * 0.6))
                    const showLabel = width > 40 && height > 28
                    const avatarSrc = resolveAvatarSrc(character?.avatar ?? null)
                    const isAssigned = Boolean(character?.id)
                    return (
                      <button
                        key={room.id}
                        type="button"
                        className={cn(
                          'pointer-events-auto absolute flex flex-col items-center justify-center gap-1 rounded-lg border text-[12px] text-base-content shadow-md backdrop-blur-[1px]',
                          isAssigned ? 'border-primary/60 bg-primary/15' : 'border-base-200/30 bg-base-100/5',
                        )}
                        style={{ left, top, width, height }}
                        onClick={(event) => {
                          event.stopPropagation()
                          setEditingRoom(room)
                          resetSelection()
                        }}
                      >
                        {isAssigned && avatarSrc ? (
                          <img
                            src={avatarSrc}
                            alt={character.name}
                            className="rounded-full border border-base-100 object-cover shadow-sm ring-1 ring-base-100/60"
                            style={{ width: avatarSize, height: avatarSize }}
                          />
                        ) : isAssigned ? (
                          <div
                            className="rounded-full bg-base-200 text-[11px] font-semibold flex items-center justify-center shadow-sm ring-1 ring-base-100/60"
                            style={{ width: avatarSize, height: avatarSize }}
                          >
                            {getInitials(character?.name ?? room.name)}
                          </div>
                        ) : null}
                        {showLabel ? (
                          <span className="truncate max-w-full rounded-full bg-base-100/90 px-2 py-0.5 text-[11px] font-semibold text-base-content shadow-sm ring-1 ring-base-100/70">
                            {character?.name ?? room.name}
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-3">
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
            </div>
          </div>
        </div>
      </div>

      {draftSelection ? (
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

      {editingRoom ? (
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

      <RoomMapFormModal
        open={isMapModalOpen}
        mode={mapModalMode}
        map={mapModalTarget}
        onClose={() => setIsMapModalOpen(false)}
      />
    </AppLayout>
  )
}
