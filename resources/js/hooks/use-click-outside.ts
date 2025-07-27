import * as React from "react"

/**
 * Hook that invokes a callback when a click occurs outside the given element.
 *
 * @param ref - React ref of the element to detect outside clicks for
 * @param handler - Function invoked on outside click
 */
export function useClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  handler: () => void
) {
  React.useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(event.target as Node)) {
        handler()
      }
    }

    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [ref, handler])
}
