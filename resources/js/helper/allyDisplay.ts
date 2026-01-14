import { Ally } from '@/types'

export const getAllyDisplayName = (ally: Ally) => {
  const linkedName = ally.linked_character?.name?.trim()
  const allyName = ally.name?.trim()
  if (linkedName && allyName && linkedName.toLowerCase() !== allyName.toLowerCase()) {
    return `${linkedName} (${allyName})`
  }
  return linkedName || allyName || 'Unnamed Ally'
}

export const getAllyOwnerName = (ally: Ally) => {
  return ally.linked_character?.user?.name?.trim() || ''
}
