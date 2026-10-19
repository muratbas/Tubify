import type { FC } from "react";

interface MicroVisualizerProps {
  isPlaying: boolean;
  className?: string;
}

export const MicroVisualizer: FC<MicroVisualizerProps> = ({ isPlaying, className = "" }) => {
  return (
    <div
      title={isPlaying ? "Playing audio stream" : "Audio stream paused"}
      className={`flex items-end gap-[3px] h-3.5 px-1 ${className}`}
    >
      <span
        className={`w-[2.5px] rounded-full bg-[#ff0000] transition-all duration-300 ${
          isPlaying ? "h-full animate-visualizer-1" : "h-1 opacity-40"
        }`}
      />
      <span
        className={`w-[2.5px] rounded-full bg-[#ff0000] transition-all duration-300 ${
          isPlaying ? "h-full animate-visualizer-2" : "h-1.5 opacity-40"
        }`}
      />
      <span
        className={`w-[2.5px] rounded-full bg-[#ff0000] transition-all duration-300 ${
          isPlaying ? "h-full animate-visualizer-3" : "h-1 opacity-40"
        }`}
      />
      <span
        className={`w-[2.5px] rounded-full bg-[#ff0000] transition-all duration-300 ${
          isPlaying ? "h-full animate-visualizer-4" : "h-2 opacity-40"
        }`}
      />
    </div>
  );
};
