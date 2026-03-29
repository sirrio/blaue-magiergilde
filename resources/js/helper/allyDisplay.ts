import { Ally, Character } from '@/types'

export const getAllyDisplayName = (ally: Ally) => {
  const linkedName = ally.linked_character?.name?.trim()
  const allyName = ally.name?.trim()
  if (linkedName && allyName && linkedName.toLowerCase() !== allyName.toLowerCase()) {
    return `${linkedName} (${allyName})`
  }
  return linkedName || allyName || 'Unnamed Ally'
}

export const getAllyOwnerName = (ally: Ally) => {
  return getCharacterOwnerName(ally.linked_character)
}

export const getCharacterOwnerName = (character?: Character | null) => {
  return character?.user?.discord_display_name?.trim()
    || character?.user?.discord_username?.trim()
    || character?.user?.name?.trim()
    || ''
}

export const getGuildCharacterOptionLabel = (character: Character) => {
  const ownerName = getCharacterOwnerName(character)

  if (!ownerName) {
    return character.name || 'Unnamed Character'
  }

  return `${character.name} · ${ownerName}`
}
