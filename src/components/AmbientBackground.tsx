import type { FC } from "react";
import { useTheme } from "../context/ThemeContext";

interface AmbientBackgroundProps {
  thumbnail?: string | null;
}

export const AmbientBackground: FC<AmbientBackgroundProps> = ({ thumbnail }) => {
  const { theme } = useTheme();
  const isLight = theme === "light";

  if (!thumbnail) {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none -z-10">
        <div
          className={`absolute -top-32 left-1/4 w-[500px] h-[500px] rounded-full blur-[140px] transition-opacity duration-1000 ${
            isLight ? "bg-rose-200/20" : "bg-red-950/20"
          }`}
        />
        <div
          className={`absolute top-1/3 -right-24 w-[400px] h-[400px] rounded-full blur-[120px] transition-opacity duration-1000 ${
            isLight ? "bg-amber-100/15" : "bg-rose-900/15"
          }`}
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none -z-10">
      {/* Blurred artwork reflection for authentic album ambient matching */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
          isLight ? "opacity-15" : "opacity-25"
        }`}
      >
        <img
          src={thumbnail}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover filter blur-[100px] scale-125 transform-gpu saturate-150"
        />
      </div>

      {/* Subtle radial shading overlay to ensure text contrast */}
      <div
        className={`absolute inset-0 ${
          isLight
            ? "bg-gradient-to-b from-[#f0f0f0]/70 via-[#f0f0f0]/90 to-[#f0f0f0]"
            : "bg-gradient-to-b from-[#030303]/60 via-[#030303]/85 to-[#030303]"
        }`}
      />
    </div>
  );
};
