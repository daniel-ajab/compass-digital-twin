/** Dispatched by UI controls; handled by the active Three scene hook. */
export const ZOOM_NUDGE_EVENT = "compass:nudge-zoom";

export function emitZoomNudge(deltaZ: number) {
  window.dispatchEvent(
    new CustomEvent(ZOOM_NUDGE_EVENT, { detail: { deltaZ } }),
  );
}
