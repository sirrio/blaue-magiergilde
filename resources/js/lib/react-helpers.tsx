import React, { ReactNode } from 'react'

export function findChildByType<T>(children: ReactNode, componentType: React.FC<T>): ReactNode | null {
  return React.Children.toArray(children).find((child) => React.isValidElement(child) && child.type === componentType) || null
}
