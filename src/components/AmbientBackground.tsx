import type { FC } from "react";
import { useTheme } from "../context/ThemeContext";

interface AmbientBackgroundProps {
  thumbnail?: string | null;
}

export const AmbientBackground: FC<AmbientBackgroundProps> = () => {
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <div
      className="absolute inset-0 pointer-events-none z-0 transition-colors duration-700 ease-out overflow-hidden"
      style={{
        background: isLight
          ? "linear-gradient(180deg, rgba(var(--ambient-rgb), 0.90) 0%, rgba(var(--ambient-rgb), 0.55) 30%, rgba(var(--ambient-rgb), 0.18) 62%, rgba(255, 255, 255, 1) 95%)"
          : "linear-gradient(180deg, rgba(var(--ambient-rgb), 0.45) 0%, rgba(var(--ambient-rgb), 0.25) 30%, rgba(var(--ambient-rgb), 0.08) 62%, rgba(12, 12, 12, 1) 95%)",
      }}
    />
  );
};

export default AmbientBackground;
