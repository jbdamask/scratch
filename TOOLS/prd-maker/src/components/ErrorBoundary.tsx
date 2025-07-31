import { Component, ErrorInfo, ReactNode } from 'react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ error, errorInfo })
  }

  private handleReload = () => {
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gray-900 border border-gray-700 rounded-lg p-6 text-center">
            <div className="flex justify-center mb-4">
              <ExclamationTriangleIcon className="w-12 h-12 text-red-500" />
            </div>
            
            <h2 className="text-xl font-semibold text-gray-100 mb-2">
              Something went wrong
            </h2>
            
            <p className="text-gray-400 mb-4">
              The application encountered an unexpected error. This might be due to a database issue or another technical problem.
            </p>
            
            {this.state.error && (
              <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 mb-4 text-left">
                <h3 className="text-sm font-medium text-gray-300 mb-2">Error Details:</h3>
                <p className="text-xs text-red-400 font-mono">
                  {this.state.error.name}: {this.state.error.message}
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <button
                onClick={this.handleReload}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
              >
                Reload Application
              </button>
              
              <p className="text-xs text-gray-500">
                If the problem persists, please check the browser console for more details.
              </p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary