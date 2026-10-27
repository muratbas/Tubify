/**
 * Scroll Restoration Utility
 * Preserves and restores scroll positions across view navigation in Tubify.
 */

export const scrollMap = new Map<string, number>();

let keyCounter = 0;
export function generateHistoryKey(prefix = "view"): string {
  keyCounter = (keyCounter + 1) % 1000000;
  return `${prefix}_${Date.now()}_${keyCounter}`;
}

export function saveScrollPosition(key: string, pos: number): void {
  if (!key) return;
  scrollMap.set(key, Math.max(0, Math.round(pos)));
}

export function getScrollPosition(key: string): number {
  if (!key) return 0;
  return scrollMap.get(key) ?? 0;
}

/**
 * Restores the vertical scroll position of a container element.
 * If the element's scrollable height has not yet expanded to accommodate targetPos,
 * it retries across animation frames until layout stabilizes or maxFrames is reached.
 * Automatically cancels if the user interacts (wheel, touch, or pointer down).
 */
export function restoreScroll(
  container: HTMLElement,
  targetPos: number,
  onScrolledChange?: (isScrolled: boolean) => void
): () => void {
  let isCancelled = false;
  let rafId: number | null = null;
  let frameCount = 0;
  const maxFrames = 25; // ~400ms max check window

  const cleanTarget = Math.max(0, Math.round(targetPos));

  // If target is 0, reset immediately and exit
  if (cleanTarget === 0) {
    container.scrollTop = 0;
    onScrolledChange?.(false);
    return () => {};
  }

  // Cancel restoration if the user initiates manual interaction
  const cancelOnUserInteraction = () => {
    isCancelled = true;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  container.addEventListener("wheel", cancelOnUserInteraction, { passive: true, once: true });
  container.addEventListener("touchstart", cancelOnUserInteraction, { passive: true, once: true });
  container.addEventListener("pointerdown", cancelOnUserInteraction, { passive: true, once: true });

  // Immediate attempt
  container.scrollTop = cleanTarget;
  onScrolledChange?.(cleanTarget > 10);

  // If already at target within 2px tolerance, finish early
  if (Math.abs(container.scrollTop - cleanTarget) <= 2) {
    return () => {
      cancelOnUserInteraction();
    };
  }

  // Retry on subsequent animation frames while children / layout settle
  const step = () => {
    if (isCancelled) return;
    container.scrollTop = cleanTarget;
    onScrolledChange?.(cleanTarget > 10);
    frameCount++;

    if (Math.abs(container.scrollTop - cleanTarget) <= 2 || frameCount >= maxFrames) {
      return;
    }

    rafId = requestAnimationFrame(step);
  };

  rafId = requestAnimationFrame(step);

  return () => {
    cancelOnUserInteraction();
    container.removeEventListener("wheel", cancelOnUserInteraction);
    container.removeEventListener("touchstart", cancelOnUserInteraction);
    container.removeEventListener("pointerdown", cancelOnUserInteraction);
  };
}
