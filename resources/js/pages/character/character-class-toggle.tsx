import createRandomString from '@/helper/createRandomString'
import { useTranslate } from '@/lib/i18n'
import { CharacterClass } from '@/types'
import React from 'react'

interface CharacterClassToggleProps {
  classes: CharacterClass[]
  data: { class: number[] }
  errors: { class?: string }
  setData: (key: string, value: number[]) => void
}

const CharacterClassToggle: React.FC<CharacterClassToggleProps> = ({ classes, data, errors, setData }) => {
  const t = useTranslate()

  const visibleClasses = classes
    .filter((characterClass) => (characterClass.guild_enabled ?? true) || data.class.includes(characterClass.id))
    .sort((firstClass, secondClass) => Number(secondClass.guild_enabled ?? true) - Number(firstClass.guild_enabled ?? true) || firstClass.name.localeCompare(secondClass.name))

  const toggleCharacterClass = (characterClass: CharacterClass) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
        if (characterClass.guild_enabled === false) {
          return
        }

        const updatedClasses = Array.from(new Set([...data.class, characterClass.id]))
        setData('class', updatedClasses)
        return
      }

      const updatedClasses = data.class.filter((id: number) => id !== characterClass.id)
      setData('class', updatedClasses)
    }
  }

  return (
    <>
      <label className={'label'}>
        <span className="label-text">{t('characters.classesLabel')}</span>
      </label>
      <div className={'grid grid-cols-4 gap-1 rounded border p-1 text-xs'}>
        {visibleClasses.map((cc: CharacterClass) => {
          const id = createRandomString(24)
          const isGuildEnabled = cc.guild_enabled ?? true

          return (
            <div className={'flex items-center gap-1'} key={cc.id}>
              <input
                type={'checkbox'}
                className={'checkbox checkbox-xs'}
                id={id}
                checked={data.class.includes(cc.id)}
                onChange={toggleCharacterClass(cc)}
              />
              <label htmlFor={id} className={isGuildEnabled ? 'cursor-pointer' : 'cursor-pointer text-base-content/50'}>
                {cc.name}
                {!isGuildEnabled ? <span className="ml-1 text-[10px] text-base-content/50">({t('characters.guildDisabledClassLabel')})</span> : null}
              </label>
            </div>
          )
        })}
      </div>
      {errors.class ? (
        <label className="label pt-1">
          <span className="label-text-alt text-error">{errors.class}</span>
        </label>
      ) : null}
    </>
  )
}

export { CharacterClassToggle }
