import { Component, type ReactNode } from "react";
import { clearState } from "../lib/storage";

interface ErrorBoundaryProps {
  children: ReactNode;
}

// Saved state is persisted, so an error it causes would recur on every load;
// without a way out the PWA would stay blank until site data was cleared.
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="crash">
        <div role="alert">
          <h1>Something went wrong</h1>
          <p>
            Fivefold hit an error it couldn&apos;t recover from. Try again, and
            if it keeps happening, resetting clears your saved game, stats and
            achievements.
          </p>
        </div>
        <div className="modal-actions">
          <button
            type="button"
            className="primary"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              clearState();
              window.location.reload();
            }}
          >
            Reset game data
          </button>
        </div>
      </main>
    );
  }
}
