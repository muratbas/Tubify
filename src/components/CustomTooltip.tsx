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

      const el = target.closest<HTMLElement>("[data-tooltip]");
      if (!el) {
        if (activeElRef.current) {
          activeElRef.current = null;
          if (timerRef.current) window.clearTimeout(timerRef.current);
          setTooltip((prev) => ({ ...prev, visible: false }));
        }
        return;
      }

      if (activeElRef.current === el) return;
      activeElRef.current = el;

      const text = el.getAttribute("data-tooltip");
      if (!text) {
        setTooltip((prev) => ({ ...prev, visible: false }));
        return;
      }

      if (timerRef.current) window.clearTimeout(timerRef.current);

      // 1-second delay so tooltips only show when intentionally hovering for 1s
      timerRef.current = window.setTimeout(() => {
        if (!activeElRef.current) return;

        const rect = activeElRef.current.getBoundingClientRect();
        const attrSide = activeElRef.current.getAttribute("data-tooltip-side") as "top" | "bottom" | "right" | null;
        const preferredSide: "top" | "bottom" | "right" = attrSide || (rect.top < 100 ? "bottom" : "top");

        let x = 0;
        let y = 0;
        if (preferredSide === "right") {
          x = rect.right + 10;
          y = rect.top + rect.height / 2;
        } else {
          x = Math.max(16, Math.min(window.innerWidth - 16, rect.left + rect.width / 2));
          y = preferredSide === "bottom" ? rect.bottom + 8 : rect.top - 8;
        }

        setTooltip({
          text,
          x,
          y,
          side: preferredSide,
          visible: true,
        });
      }, 1000);
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const el = target.closest<HTMLElement>("[data-tooltip]");
      if (el && activeElRef.current === el) {
        const related = e.relatedTarget as HTMLElement | null;
        if (related && el.contains(related)) return;

        activeElRef.current = null;
        if (timerRef.current) window.clearTimeout(timerRef.current);
        setTooltip((prev) => ({ ...prev, visible: false }));
      }
    };

    const handleMouseDown = () => {
      // Instantly dismiss tooltip on click
      if (timerRef.current) window.clearTimeout(timerRef.current);
      setTooltip((prev) => ({ ...prev, visible: false }));
      activeElRef.current = null;
    };

    window.addEventListener("mouseover", handleMouseOver, { passive: true });
    window.addEventListener("mouseout", handleMouseOut, { passive: true });
    window.addEventListener("mousedown", handleMouseDown, { passive: true });

    return () => {
      window.removeEventListener("mouseover", handleMouseOver);
      window.removeEventListener("mouseout", handleMouseOut);
      window.removeEventListener("mousedown", handleMouseDown);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  if (!tooltip.visible || !tooltip.text) return null;

  return (
    <div
      style={{
        left: `${tooltip.x}px`,
        top: tooltip.side === "right" ? `${tooltip.y}px` : tooltip.side === "bottom" ? `${tooltip.y}px` : undefined,
        bottom: tooltip.side === "top" ? `${window.innerHeight - tooltip.y}px` : undefined,
      }}
      className={`fixed z-[999999] pointer-events-none px-3.5 py-1.5 rounded-xl shadow-xl text-xs font-semibold select-none animate-in fade-in zoom-in-95 duration-100 whitespace-nowrap transition-transform ${
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
