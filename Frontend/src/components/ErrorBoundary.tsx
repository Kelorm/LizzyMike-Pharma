import React, { Component, ReactNode } from 'react';

interface State {
  hasError: boolean;
  errorInfo: string;
}

interface Props {
  children: ReactNode;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorInfo: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorInfo: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error monitoring service
    console.error('React Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 rounded-lg">
          <h2 className="text-xl font-bold text-red-800">Something went wrong</h2>
          <p className="mt-2 text-red-600">{this.state.errorInfo}</p>
          <button 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
            onClick={() => window.location.reload()}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;