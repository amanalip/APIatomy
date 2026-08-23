import React from 'react';

interface Props { children: React.ReactNode }
interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error('ErrorBoundary caught', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-50 dark:bg-slate-950">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Something went wrong</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md">{this.state.error?.message || 'Unexpected error. Try reloading or loading a sample spec.'}</p>
          <button onClick={() => { this.setState({ hasError: false }); window.location.hash=''; window.location.reload(); }} className="mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg">Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}
