import RoomsView from '@/pages/admin/rooms'
import { RoomMap, RoomCharacter } from '@/types'

export default function Rooms({
  roomMaps,
  roomMap,
  characters,
  adminMode,
}: {
  roomMaps: RoomMap[]
  roomMap: RoomMap | null
  characters: RoomCharacter[]
  adminMode?: boolean
}) {
  return (
    <RoomsView
      roomMaps={roomMaps}
      roomMap={roomMap}
      characters={characters}
      adminMode={adminMode ?? false}
    />
  )
}
