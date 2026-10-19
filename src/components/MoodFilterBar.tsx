import type { FC } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { usePlayer } from "../context/PlayerContext";
import type { MoodCategory } from "../types/music";

interface MoodItem {
  id: MoodCategory;
  labelKey: keyof ReturnType<typeof useLanguage>["t"];
}

const MOODS: MoodItem[] = [
  { id: "all", labelKey: "moodAll" },
  { id: "relax", labelKey: "moodRelax" },
  { id: "energize", labelKey: "moodEnergize" },
  { id: "focus", labelKey: "moodFocus" },
  { id: "workout", labelKey: "moodWorkout" },
  { id: "commute", labelKey: "moodCommute" },
];

export const MoodFilterBar: FC = () => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { activeMood, setActiveMood } = usePlayer();
  const isLight = theme === "light";

  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 shrink-0 select-none">
      {MOODS.map((m) => {
        const isActive = activeMood === m.id;
        const label = (t[m.labelKey] as string) || m.id;

        return (
          <button
            key={m.id}
            onClick={() => setActiveMood(m.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-tight transition-all duration-200 cursor-pointer shrink-0 active:scale-95 ${
              isActive
                ? isLight
                  ? "bg-[#18181b] text-white shadow-sm"
                  : "bg-white text-black shadow-sm"
                : isLight
                ? "bg-white/70 text-[#52525b] hover:bg-white hover:text-[#18181b] border border-[#e4e4e7]"
                : "bg-white/[0.06] text-white/70 hover:bg-white/[0.12] hover:text-white border border-white/[0.08]"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};
