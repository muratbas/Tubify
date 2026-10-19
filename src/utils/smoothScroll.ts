/**
 * Buttery Smooth Momentum Wheel Scroller
 * Intercepts discrete mouse wheel steps and applies physics-based lerp interpolation
 * to provide a fluid, silky-smooth gliding experience ("yağ gibi kayma").
 */

export function initSmoothScroll(): () => void {
  let activeContainer: HTMLElement | null = null;
  let targetY = 0;
  let currentY = 0;
  let isRunning = false;
  let rafId = 0;

  function findScrollableParent(target: EventTarget | null): HTMLElement | null {
    let curr = target as HTMLElement | null;
    while (curr && curr !== document.body && curr !== document.documentElement) {
      const style = window.getComputedStyle(curr);
      const overflowY = style.overflowY;
      if (
        (overflowY === "auto" || overflowY === "scroll") &&
        curr.scrollHeight > curr.clientHeight
      ) {
        return curr;
      }
      curr = curr.parentElement;
    }
    return null;
  }

  function tick() {
    if (!activeContainer) {
      isRunning = false;
      return;
    }

    const diff = targetY - currentY;
    if (Math.abs(diff) < 0.3) {
      currentY = targetY;
      activeContainer.scrollTop = targetY;
      isRunning = false;
      return;
    }

    // 0.12 interpolation factor creates an ultra-smooth silk momentum curve
    currentY += diff * 0.12;
    activeContainer.scrollTop = currentY;
    rafId = requestAnimationFrame(tick);
  }

  function handleWheel(e: WheelEvent) {
    // Pass-through for zoom, horizontal tilt, or default key combinations
    if (e.ctrlKey || e.shiftKey) return;

    const container = findScrollableParent(e.target);
    if (!container) return;

    const maxScroll = container.scrollHeight - container.clientHeight;
    if (maxScroll <= 0) return;

    // Normalize wheel delta across mouse drivers and delta modes
    let delta = e.deltaY;
    if (e.deltaMode === 1) {
      delta *= 33; // DOM_DELTA_LINE
    } else if (e.deltaMode === 2) {
      delta *= container.clientHeight; // DOM_DELTA_PAGE
    }

    // Prevent default instantaneous browser snapping
    e.preventDefault();

    // Re-sync if user changed container or dragged scrollbar thumb directly
    if (activeContainer !== container || Math.abs(container.scrollTop - currentY) > 6) {
      if (isRunning) cancelAnimationFrame(rafId);
      activeContainer = container;
      currentY = container.scrollTop;
      targetY = container.scrollTop;
    }

    // Accumulate target scroll with boundaries
    targetY = Math.max(0, Math.min(maxScroll, targetY + delta));

    if (!isRunning) {
      isRunning = true;
      rafId = requestAnimationFrame(tick);
    }
  }

  window.addEventListener("wheel", handleWheel, { passive: false });

  return () => {
    window.removeEventListener("wheel", handleWheel);
    if (rafId) cancelAnimationFrame(rafId);
  };
}
