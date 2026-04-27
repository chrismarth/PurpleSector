import { createContext } from 'react';

/**
 * Context for synchronizing hover state across telemetry plots.
 * This avoids re-rendering the entire panel grid on every hover change.
 * Panels read from this context to get the synced hover index.
 */
export const TelemetryHoverContext = createContext<{
  hoverIndex: number | null;
  setHoverIndex: (index: number | null) => void;
}>({ hoverIndex: null, setHoverIndex: () => {} });
