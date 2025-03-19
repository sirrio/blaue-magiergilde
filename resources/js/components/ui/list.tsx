import React, { PropsWithChildren } from 'react'

export const List = ({ children }: PropsWithChildren) => {
  return (
    <ul className="list bg-base-100 rounded-box shadow-md">
      {children}
    </ul>
  )
}

export const ListRow = ({ children }: PropsWithChildren) => <li className="list-row items-center">{children}</li>
