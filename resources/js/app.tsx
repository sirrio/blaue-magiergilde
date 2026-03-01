import '../css/app.css'

import { FrontendErrorBoundary } from '@/components/error-boundary'
import { installFrontendErrorReporting, installInertiaErrorReporting, setCurrentPageComponent } from '@/lib/frontend-error-reporting'
import type { PageProps } from '@/types'
import { ToastProvider } from '@/components/ui/toast'
import { createInertiaApp, usePage } from '@inertiajs/react'
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers'
import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'

const appName = import.meta.env.VITE_APP_NAME || 'Laravel'

function FrontendErrorReportingBridge(): null {
  const page = usePage<PageProps>()

  useEffect(() => {
    setCurrentPageComponent(page.component)
  }, [page.component])

  return null
}

createInertiaApp({
  title: (title) => `${title} - ${appName}`,
  resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
  setup({ el, App, props }) {
    installFrontendErrorReporting()
    installInertiaErrorReporting()
    setCurrentPageComponent((props as { initialPage?: { component?: string } }).initialPage?.component || null)

    const root = createRoot(el)

    root.render(
      <ToastProvider>
        <FrontendErrorBoundary>
          <FrontendErrorReportingBridge />
          <App {...props} />
        </FrontendErrorBoundary>
      </ToastProvider>,
    )
  },
  progress: {
    color: 'oklch(var(--p))',
  },
})
