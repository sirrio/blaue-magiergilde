import '@inertiajs/core'

declare module '@inertiajs/core' {
  interface ReloadOptions {
    preserveScroll?: boolean
    preserveState?: boolean
  }
}
