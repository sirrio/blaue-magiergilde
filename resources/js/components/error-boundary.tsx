import { reportFrontendError } from '@/lib/frontend-error-reporting'
import { AlertTriangle, RefreshCcw } from 'lucide-react'
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
                <h1 className="text-xl font-semibold text-base-content">Something went wrong</h1>
                <p className="text-sm text-base-content/70">
                  The error was reported automatically. Reload the page and try again.
                </p>
              </div>
              <button
                className="btn btn-error btn-sm"
                onClick={() => window.location.reload()}
                type="button"
              >
                <RefreshCcw className="h-4 w-4" />
                Reload page
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
