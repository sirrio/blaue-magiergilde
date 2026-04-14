import { reportFrontendError } from '@/lib/frontend-error-reporting'
import { AlertTriangle, ArrowLeft, RefreshCcw } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface FrontendErrorBoundaryProps {
  children: ReactNode
}

interface FrontendErrorBoundaryState {
  hasError: boolean
}

export class FrontendErrorBoundary extends Component<FrontendErrorBoundaryProps, FrontendErrorBoundaryState> {
  public override state: FrontendErrorBoundaryState = {
    hasError: false,
  }

  public static getDerivedStateFromError(): FrontendErrorBoundaryState {
    return { hasError: true }
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    reportFrontendError({
      source: 'react_error_boundary',
      message: error.message || 'React render error',
      stack: error.stack || null,
      url: window.location.href,
      context: {
        componentStack: errorInfo.componentStack,
      },
    })
  }

  private goBack = (): void => {
    if (typeof window === 'undefined') {
      return
    }

    if (window.history.length > 1) {
      window.history.back()
      return
    }

    window.location.assign('/')
  }

  public override render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-base-200 px-6">
        <div className="w-full max-w-lg rounded-2xl border border-error/25 bg-base-100 p-8 shadow-xl">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-error/10 p-3 text-error">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <h1 className="text-xl font-semibold text-base-content">This view ran into a problem</h1>
                <p className="text-sm text-base-content/70">
                  The error was reported automatically. Try reopening the view first. If it still fails, reload the page.
                </p>
                <p className="text-xs text-base-content/50">
                  Saved server data was not changed by this fallback screen.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn btn-error btn-sm"
                  onClick={() => window.location.reload()}
                  type="button"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Reload page
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={this.goBack}
                  type="button"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Go back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
