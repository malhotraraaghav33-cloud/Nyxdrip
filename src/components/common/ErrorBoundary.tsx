import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  resetKey?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('View rendering error caught by ErrorBoundary:', error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] bg-[#0A0A0D] text-[#F5F5F7] flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full bg-[#15151B] border border-[#2A2A32] p-8 text-center space-y-4">
            <h2 className="font-display text-xl font-bold uppercase tracking-wider text-[#F5F5F7]">
              Something went wrong
            </h2>
            <p className="text-xs text-[#9A9AA3] leading-relaxed">
              We encountered a temporary display issue while loading this view.
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false });
                if (this.props.onReset) {
                  this.props.onReset();
                } else {
                  window.location.href = '/';
                }
              }}
              className="px-6 py-2.5 bg-[#8B5CF6] hover:bg-[#7c4def] text-white text-xs font-bold uppercase tracking-wider transition-colors"
            >
              Return Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
