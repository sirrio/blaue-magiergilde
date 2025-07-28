import createRandomString from '@/helper/createRandomString'
import { CharacterClass } from '@/types'
import React from 'react'

interface CharacterClassToggleProps {
  classes: CharacterClass[]
  data: { class: number[] }
  errors: { class?: string }
  setData: (key: string, value: number[]) => void
}

const CharacterClassToggle: React.FC<CharacterClassToggleProps> = ({ classes, data, errors, setData }) => {
  const toggleCharacterClass = (classId: number) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const updatedClasses = e.target.checked ? [...data.class, classId] : data.class.filter((id: number) => id !== classId)
      setData('class', updatedClasses)
    }
  }

  return (
    <>
      <label className={'label'}>Classes</label>
      <div className={'grid grid-cols-4 gap-1 rounded border p-1 text-xs'}>
        {classes.map((cc: CharacterClass) => {
          const id = createRandomString(24)

          return (
            <div className={'flex items-center gap-1'} key={cc.id}>
              <input
                type={'checkbox'}
                className={'checkbox checkbox-xs'}
                id={id}
                checked={data.class.includes(cc.id)}
                onChange={toggleCharacterClass(cc.id)}
              />
              <label htmlFor={id} className={'label cursor-pointer'}>
                {cc.name}
              </label>
            </div>
          )
        })}
      </div>
      {errors.class && <p className={'fieldset-label text-error'}>{errors.class}</p>}
    </>
  )
}

export { CharacterClassToggle }
