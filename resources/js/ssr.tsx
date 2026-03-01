import { createInertiaApp } from '@inertiajs/react'
import createServer from '@inertiajs/react/server'
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers'
import ReactDOMServer from 'react-dom/server'
import { type RouteName, route } from 'ziggy-js'

const appName = import.meta.env.VITE_APP_NAME || 'Laravel'

createServer(async (page) => {
  try {
    return await createInertiaApp({
      page,
      render: ReactDOMServer.renderToString,
      title: (title) => `${title} - ${appName}`,
      resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
      setup: ({ App, props }) => {
        /* eslint-disable */
        // @ts-expect-error
        global.route<RouteName> = (name, params, absolute) =>
          route(name, params as any, absolute, {
            // @ts-expect-error
            ...page.props.ziggy,
            // @ts-expect-error
            location: new URL(page.props.ziggy.location),
          })
        /* eslint-enable */

        return <App {...props} />
      },
    })
  } catch (error) {
    await reportSsrError(error, page)
    throw error
  }
})

async function reportSsrError(error: unknown, page: unknown): Promise<void> {
  const errorObject = error instanceof Error ? error : new Error('Unknown SSR render error')
  const endpoint = resolveMonitoringEndpoint(page)

  if (!endpoint) {
    return
  }

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'ssr_render_error',
        message: errorObject.message || 'SSR render error',
        stack: errorObject.stack || null,
        component: resolvePageComponentName(page),
        url: resolvePageUrl(page),
      }),
    })
  } catch {
    //
  }
}

function resolveMonitoringEndpoint(page: unknown): string | null {
  const pageUrl = resolvePageUrl(page)

  if (!pageUrl) {
    return null
  }

  try {
    return new URL('/monitoring/frontend-errors', pageUrl).toString()
  } catch {
    return null
  }
}

function resolvePageUrl(page: unknown): string | null {
  const location = (page as { props?: { ziggy?: { location?: string } } })?.props?.ziggy?.location

  return typeof location === 'string' && location !== '' ? location : null
}

function resolvePageComponentName(page: unknown): string | null {
  const component = (page as { component?: string })?.component

  return typeof component === 'string' && component !== '' ? component : null
}
