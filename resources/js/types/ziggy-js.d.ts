declare module 'ziggy-js' {
  export interface ZiggyRoute {
    current(name: string): boolean
    params: Record<string, unknown>
  }

  export function route(): ZiggyRoute
  export function route(
    name: string,
    params?: number | string | Record<string, unknown>,
    absolute?: boolean,
    config?: unknown,
  ): string

  export type RouteName = string
}
