import { useState, useEffect, useRef, type FC } from "react";
import { useTheme } from "../context/ThemeContext";

interface TooltipState {
  text: string;
  x: number;
  y: number;
  side: "top" | "bottom" | "right";
  visible: boolean;
}

export const CustomTooltip: FC = () => {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [tooltip, setTooltip] = useState<TooltipState>({
    text: "",
    x: 0,
    y: 0,
    side: "bottom",
    visible: false,
  });

  const timerRef = useRef<number | null>(null);
  const activeElRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // 1. Check for explicit data-tooltip element
      const explicitEl = target.closest<HTMLElement>("[data-tooltip]");

      // 2. Check for auto-truncate candidate (.truncate, line-clamp, etc.)
      const truncateEl = target.closest<HTMLElement>(
        '.truncate, [class*="truncate"], [class*="line-clamp"], [data-tooltip-truncate]'
      );

      let elToUse: HTMLElement | null = null;
      let textToUse = "";
      let isTruncateTooltip = false;

      if (explicitEl) {
        elToUse = explicitEl;
        textToUse = explicitEl.getAttribute("data-tooltip") || "";
      } else if (truncateEl) {
        // Smart Truncation Detection:
        // Only trigger if text actually overflows horizontally or vertically
        const isHorizontallyTruncated =
          truncateEl.scrollWidth > truncateEl.clientWidth + 1 ||
          target.scrollWidth > target.clientWidth + 1;
        const isVerticallyTruncated =
          truncateEl.scrollHeight > truncateEl.clientHeight + 1;

        if (isHorizontallyTruncated || isVerticallyTruncated) {
          elToUse = truncateEl;
          isTruncateTooltip = true;

          // Retrieve text from title or textContent
          const rawTitle =
            truncateEl.getAttribute("title") ||
            truncateEl.getAttribute("data-orig-title") ||
            target.getAttribute("title") ||
            target.getAttribute("data-orig-title");

          if (rawTitle && rawTitle.trim()) {
            textToUse = rawTitle.trim();
          } else {
            textToUse = (truncateEl.textContent || "").replace(/\s+/g, " ").trim();
          }

          // Temporarily remove native title to prevent default yellow browser tooltip
          if (truncateEl.hasAttribute("title")) {
            truncateEl.setAttribute("data-orig-title", truncateEl.getAttribute("title") || "");
            truncateEl.removeAttribute("title");
          }
          if (target.hasAttribute("title")) {
            target.setAttribute("data-orig-title", target.getAttribute("title") || "");
            target.removeAttribute("title");
          }
        }
      }

      if (!elToUse || !textToUse) {
        if (activeElRef.current) {
          restoreOriginalTitle(activeElRef.current);
          activeElRef.current = null;
          if (timerRef.current) window.clearTimeout(timerRef.current);
          setTooltip((prev) => ({ ...prev, visible: false }));
        }
        return;
      }

      if (activeElRef.current === elToUse) return;

      if (activeElRef.current) {
        restoreOriginalTitle(activeElRef.current);
      }
      activeElRef.current = elToUse;

      if (timerRef.current) window.clearTimeout(timerRef.current);

      // Snappy, desktop-grade delay (~350ms for truncate, ~450ms for action buttons)
      const delay = isTruncateTooltip ? 350 : 450;

      timerRef.current = window.setTimeout(() => {
        if (!activeElRef.current) return;

        const rect = activeElRef.current.getBoundingClientRect();
        const attrSide = activeElRef.current.getAttribute("data-tooltip-side") as
          | "top"
          | "bottom"
          | "right"
          | null;
        const preferredSide: "top" | "bottom" | "right" =
          attrSide || (rect.top < 65 ? "bottom" : "top");

        let x = 0;
        let y = 0;
        if (preferredSide === "right") {
          x = rect.right + 10;
          y = rect.top + rect.height / 2;
        } else {
          // Clamp x so centered tooltip stays comfortably within viewport
          x = Math.max(120, Math.min(window.innerWidth - 120, rect.left + rect.width / 2));
          y = preferredSide === "bottom" ? rect.bottom + 8 : rect.top - 8;
        }

        setTooltip({
          text: textToUse,
          x,
          y,
          side: preferredSide,
          visible: true,
        });
      }, delay);
    };

    const restoreOriginalTitle = (el: HTMLElement) => {
      const orig = el.getAttribute("data-orig-title");
      if (orig) {
        el.setAttribute("title", orig);
        el.removeAttribute("data-orig-title");
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      if (activeElRef.current) {
        const related = e.relatedTarget as HTMLElement | null;
        if (related && activeElRef.current.contains(related)) return;

        restoreOriginalTitle(activeElRef.current);
        activeElRef.current = null;
        if (timerRef.current) window.clearTimeout(timerRef.current);
        setTooltip((prev) => ({ ...prev, visible: false }));
      }
    };

    const dismissTooltip = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (activeElRef.current) {
        restoreOriginalTitle(activeElRef.current);
        activeElRef.current = null;
      }
      setTooltip((prev) => ({ ...prev, visible: false }));
    };

    window.addEventListener("mouseover", handleMouseOver, { passive: true });
    window.addEventListener("mouseout", handleMouseOut, { passive: true });
    window.addEventListener("mousedown", dismissTooltip, { passive: true });
    window.addEventListener("wheel", dismissTooltip, { passive: true });
    window.addEventListener("scroll", dismissTooltip, { passive: true });

    return () => {
      window.removeEventListener("mouseover", handleMouseOver);
      window.removeEventListener("mouseout", handleMouseOut);
      window.removeEventListener("mousedown", dismissTooltip);
      window.removeEventListener("wheel", dismissTooltip);
      window.removeEventListener("scroll", dismissTooltip);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  if (!tooltip.visible || !tooltip.text) return null;

  return (
    <div
      style={{
        left: `${tooltip.x}px`,
        top:
          tooltip.side === "right"
            ? `${tooltip.y}px`
            : tooltip.side === "bottom"
            ? `${tooltip.y}px`
            : undefined,
        bottom: tooltip.side === "top" ? `${window.innerHeight - tooltip.y}px` : undefined,
      }}
      className={`fixed z-[999999] pointer-events-none px-3.5 py-1.5 rounded-xl shadow-xl text-xs font-semibold select-none animate-in fade-in zoom-in-95 duration-100 max-w-[420px] break-words text-center transition-transform ${
        tooltip.side === "right" ? "-translate-y-1/2" : "-translate-x-1/2"
      } ${
        isLight
          ? "bg-white text-neutral-900 border border-neutral-200/90 shadow-neutral-900/10"
          : "bg-[#202020] text-white border border-white/15 shadow-black/80"
      }`}
    >
      {tooltip.text}
    </div>
  );
};

export default CustomTooltip;
