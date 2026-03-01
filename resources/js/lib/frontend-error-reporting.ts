import { router } from '@inertiajs/react'

let currentPageComponent: string | null = null
let installed = false
let originalFetch: typeof window.fetch | null = null

const recentSignatures = new Map<string, number>()
const DEDUPE_WINDOW_MS = 60_000
const REPORT_ENDPOINT = '/monitoring/frontend-errors'

type FrontendErrorSource =
  | 'window_error'
  | 'unhandled_rejection'
  | 'react_error_boundary'
  | 'fetch_response_error'
  | 'fetch_network_error'
  | 'inertia_invalid_response'
  | 'inertia_exception'
  | 'ssr_render_error'

interface FrontendErrorPayload {
  source: FrontendErrorSource
  message: string
  stack?: string | null
  component?: string | null
  url?: string | null
  file?: string | null
  line?: number | null
  column?: number | null
  context?: Record<string, unknown>
}

export function installFrontendErrorReporting(): void {
  if (installed || typeof window === 'undefined') {
    return
  }

  installed = true
  installFetchReporting()

  window.addEventListener('error', (event) => {
    if (!(event instanceof ErrorEvent)) {
      return
    }

    const error = event.error instanceof Error ? event.error : null
    reportFrontendError({
      source: 'window_error',
      message: error?.message || event.message || 'Unknown window error',
      stack: error?.stack || null,
      component: currentPageComponent,
      url: window.location.href,
      file: event.filename || null,
      line: event.lineno || null,
      column: event.colno || null,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason

    if (reason instanceof Error) {
      reportFrontendError({
        source: 'unhandled_rejection',
        message: reason.message || 'Unhandled promise rejection',
        stack: reason.stack || null,
        component: currentPageComponent,
        url: window.location.href,
      })

      return
    }

    reportFrontendError({
      source: 'unhandled_rejection',
      message: typeof reason === 'string' ? reason : 'Unhandled promise rejection',
      component: currentPageComponent,
      url: window.location.href,
      context: reason && typeof reason === 'object' ? { reason } : undefined,
    })
  })
}

interface InertiaErrorEvent {
  detail?: {
    response?: {
      status?: number
      config?: { url?: string }
    }
    exception?: Error
  }
}

export function installInertiaErrorReporting(): void {
  router.on('invalid', (event) => {
    const status = Number(event.detail?.response?.status ?? 0)
    if (status < 500) {
      return
    }

    reportFrontendError({
      source: 'inertia_invalid_response',
      message: `Inertia received invalid ${status} response`,
      component: currentPageComponent,
      url: resolveAbsoluteUrl(event.detail?.response?.config?.url),
      context: {
        status,
      },
    })
  })

  router.on('exception', (event) => {
    const exception = event.detail?.exception
    if (!exception) {
      return
    }

    reportFrontendError({
      source: 'inertia_exception',
      message: exception.message || 'Inertia request exception',
      stack: exception.stack || null,
      component: currentPageComponent,
      url: window.location.href,
    })
  })
}

export function setCurrentPageComponent(component: string | null | undefined): void {
  currentPageComponent = component || null
}

export function reportFrontendError(payload: FrontendErrorPayload): void {
  if (typeof window === 'undefined') {
    return
  }

  const normalizedPayload = normalizePayload(payload)
  if (!normalizedPayload) {
    return
  }

  const signature = buildSignature(normalizedPayload)
  const now = Date.now()
  const previous = recentSignatures.get(signature)

  if (previous && now - previous < DEDUPE_WINDOW_MS) {
    return
  }

  recentSignatures.set(signature, now)
  pruneRecentSignatures(now)

  void fetch(REPORT_ENDPOINT, {
    method: 'POST',
    credentials: 'same-origin',
    keepalive: true,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-CSRF-TOKEN': resolveCsrfToken(),
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify(normalizedPayload),
  }).catch(() => {})
}

function normalizePayload(payload: FrontendErrorPayload): FrontendErrorPayload | null {
  const message = payload.message.trim()
  const stack = payload.stack?.trim() || null

  if (message === '') {
    return null
  }

  const haystack = `${message}\n${stack || ''}`.toLowerCase()
  if (
    haystack.includes('resizeobserver loop limit exceeded') ||
    haystack.includes('resizeobserver loop completed with undelivered notifications') ||
    haystack.includes('script error') ||
    haystack.includes('aborterror') ||
    haystack.includes('the operation was aborted') ||
    haystack.includes('chrome-extension://') ||
    haystack.includes('moz-extension://') ||
    haystack.includes('safari-extension://')
  ) {
    return null
  }

  return {
    ...payload,
    message,
    stack,
    component: payload.component || currentPageComponent,
    url: payload.url || window.location.href,
    file: payload.file || null,
    line: payload.line ?? null,
    column: payload.column ?? null,
    context: normalizeContext(payload.context),
  }
}

function normalizeContext(context: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!context) {
    return undefined
  }

  try {
    return JSON.parse(JSON.stringify(context)) as Record<string, unknown>
  } catch {
    return undefined
  }
}

function buildSignature(payload: FrontendErrorPayload): string {
  return [payload.source, payload.component || '', payload.message, payload.file || '', payload.line || '', payload.url || '']
    .join('|')
    .toLowerCase()
}

function pruneRecentSignatures(now: number): void {
  for (const [signature, timestamp] of recentSignatures.entries()) {
    if (now - timestamp > DEDUPE_WINDOW_MS) {
      recentSignatures.delete(signature)
    }
  }
}

function resolveCsrfToken(): string {
  return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || ''
}

function installFetchReporting(): void {
  if (typeof window === 'undefined' || originalFetch) {
    return
  }

  originalFetch = window.fetch.bind(window)

  window.fetch = async (...args: Parameters<typeof window.fetch>): Promise<Response> => {
    const requestUrl = resolveFetchUrl(args[0])
    const isMonitoringRequest = isMonitoringEndpoint(requestUrl)

    try {
      const response = await originalFetch!(...args)

      if (!isMonitoringRequest && response.status >= 500) {
        reportFrontendError({
          source: 'fetch_response_error',
          message: `Fetch request failed with ${response.status}`,
          component: currentPageComponent,
          url: response.url || requestUrl || window.location.href,
          context: {
            status: response.status,
            request_url: requestUrl,
          },
        })
      }

      return response
    } catch (error) {
      if (!isMonitoringRequest && error instanceof Error && error.name !== 'AbortError') {
        reportFrontendError({
          source: 'fetch_network_error',
          message: error.message || 'Fetch request failed',
          stack: error.stack || null,
          component: currentPageComponent,
          url: requestUrl || window.location.href,
        })
      }

      throw error
    }
  }
}

function resolveFetchUrl(input: RequestInfo | URL): string | null {
  if (typeof input === 'string') {
    return resolveAbsoluteUrl(input)
  }

  if (input instanceof URL) {
    return input.toString()
  }

  if (typeof Request !== 'undefined' && input instanceof Request) {
    return input.url
  }

  return null
}

function resolveAbsoluteUrl(url: string | undefined): string | null {
  if (!url) {
    return null
  }

  try {
    return new URL(url, window.location.origin).toString()
  } catch {
    return url
  }
}

function isMonitoringEndpoint(url: string | null): boolean {
  if (!url) {
    return false
  }

  try {
    const resolved = new URL(url, window.location.origin)
    return resolved.pathname === REPORT_ENDPOINT
  } catch {
    return url === REPORT_ENDPOINT
  }
}
