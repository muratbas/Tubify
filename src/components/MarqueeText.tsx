import { useState, useEffect, useRef, type FC, type MouseEvent } from "react";

export interface MarqueeTextProps {
  text: string;
  children?: React.ReactNode;
  className?: string;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  title?: string;
  speed?: number; // pixels per second (default 24)
  hoverOnly?: boolean; // whether to scroll only on hover (default true)
}

export const MarqueeText: FC<MarqueeTextProps> = ({
  text,
  children,
  className = "",
  onClick,
  title,
  speed = 24,
  hoverOnly = true,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);

  const [overflowDistance, setOverflowDistance] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [animId] = useState(() => Math.random().toString(36).substring(2, 9));

  useEffect(() => {
    const measure = () => {
      if (!containerRef.current || !textRef.current) return;
      const containerWidth = containerRef.current.clientWidth;
      const textWidth = textRef.current.scrollWidth;
      const diff = textWidth - containerWidth;
      // Add a 4px cushion so the last characters are fully revealed before pause
      setOverflowDistance(diff > 1 ? diff + 4 : 0);
    };

    measure();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      ro = new ResizeObserver(() => {
        measure();
      });
      ro.observe(containerRef.current);
    }

    return () => {
      ro?.disconnect();
    };
  }, [text]);

  const isOverflowing = overflowDistance > 0;
  const shouldAnimate = isOverflowing && (!hoverOnly || isHovered);

  // Animation timing calculation
  // When hovering: 0.6s initial pause, scroll duration based on distance, 1.2s end pause, 0.6s return
  const initialPause = hoverOnly ? 0.6 : 1.8;
  const scrollDuration = Math.max(1.6, overflowDistance / speed);
  const endPause = hoverOnly ? 1.2 : 1.5;
  const returnDuration = 0.6;
  const totalDuration = initialPause + scrollDuration + endPause + returnDuration;

  const p1 = (initialPause / totalDuration) * 100;
  const p2 = ((initialPause + scrollDuration) / totalDuration) * 100;
  const p3 = ((initialPause + scrollDuration + endPause) / totalDuration) * 100;

  const animationName = `marquee_${animId}`;

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={title}
      style={
        isOverflowing
          ? shouldAnimate
            ? {
                maskImage:
                  "linear-gradient(to right, transparent, black 8px, black calc(100% - 8px), transparent)",
                WebkitMaskImage:
                  "linear-gradient(to right, transparent, black 8px, black calc(100% - 8px), transparent)",
              }
            : {
                maskImage:
                  "linear-gradient(to right, black calc(100% - 16px), transparent)",
                WebkitMaskImage:
                  "linear-gradient(to right, black calc(100% - 16px), transparent)",
              }
          : undefined
      }
      className={`overflow-hidden relative whitespace-nowrap w-full ${className}`}
    >
      {shouldAnimate && (
        <style>{`
          @keyframes ${animationName} {
            0% {
              transform: translateX(0);
              animation-timing-function: ease-in-out;
            }
            ${p1.toFixed(2)}% {
              transform: translateX(0);
              animation-timing-function: linear;
            }
            ${p2.toFixed(2)}% {
              transform: translateX(-${overflowDistance}px);
              animation-timing-function: ease-in-out;
            }
            ${p3.toFixed(2)}% {
              transform: translateX(-${overflowDistance}px);
              animation-timing-function: ease-in-out;
            }
            100% {
              transform: translateX(0);
            }
          }
        `}</style>
      )}

      <span
        ref={textRef}
        style={
          shouldAnimate
            ? {
                display: "inline-block",
                animation: `${animationName} ${totalDuration}s infinite`,
                willChange: "transform",
              }
            : {
                display: "inline-block",
                transform: "translateX(0)",
                transition: "transform 0.35s ease-out",
              }
        }
      >
        {children || text}
      </span>
    </div>
  );
};

export default MarqueeText;
