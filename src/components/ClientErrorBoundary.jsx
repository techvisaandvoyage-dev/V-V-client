import { Component } from "react";

/**
 * Catches lazy-route chunk failures and render errors so deploy issues show a message
 * instead of a blank dark screen (body background is #0a0a0a).
 */
export default class ClientErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[ClientErrorBoundary]", error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      const msg = String(this.state.error?.message || this.state.error || "Unknown error");
      return (
        <div className="min-h-screen bg-[#0a0a0a] text-left px-6 py-10 max-w-lg mx-auto font-sans">
          <h1 className="text-xl font-semibold text-white mb-2">This page couldn’t load</h1>
          <p className="text-sm text-gray-400 mb-4">
            Often happens when the browser loads an old cached site after a new deploy, or when{" "}
            <code className="text-cyan-400">/assets/*.js</code> returns HTML instead of JavaScript.
          </p>
          <pre className="text-xs text-red-300 whitespace-pre-wrap break-words mb-6 bg-black/40 p-3 rounded-lg border border-white/10">
            {msg}
          </pre>
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-500"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
          <p className="text-xs text-gray-500 mt-6">
            Try a hard refresh (Ctrl+Shift+R) or open DevTools → Network → disable cache → reload.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
