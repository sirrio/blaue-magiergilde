import '../css/app.css'

import { FrontendErrorBoundary } from '@/components/error-boundary'
import { setLevelProgressionTotals } from '@/helper/levelProgression'
import { installFrontendErrorReporting, installInertiaErrorReporting, setCurrentPageComponent } from '@/lib/frontend-error-reporting'
import { ToastProvider } from '@/components/ui/toast'
import { createInertiaApp } from '@inertiajs/react'
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers'
import { createRoot } from 'react-dom/client'

const appName = import.meta.env.VITE_APP_NAME || 'Laravel'

createInertiaApp({
  title: (title) => `${title} - ${appName}`,
  resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
  setup({ el, App, props }) {
    installFrontendErrorReporting()
    installInertiaErrorReporting()
    setCurrentPageComponent((props as { initialPage?: { component?: string } }).initialPage?.component || null)
    setLevelProgressionTotals((props as { initialPage?: { props?: { levelProgressionTotals?: Record<number, number> } } }).initialPage?.props?.levelProgressionTotals)

    const root = createRoot(el)

    root.render(
      <ToastProvider>
        <FrontendErrorBoundary>
          <App {...props} />
        </FrontendErrorBoundary>
      </ToastProvider>,
    )
  },
  progress: {
    color: 'oklch(var(--p))',
  },
})
