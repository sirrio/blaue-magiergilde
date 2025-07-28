declare module 'ziggy-js' {
  export function route(
    name?: string,
    params?: Record<string, any>,
    absolute?: boolean,
    config?: any,
  ): string
  export type RouteName = string
}
