import { type FC, type MouseEvent } from "react";
import type { TrackArtist } from "../types/music";

export interface ParsedArtist {
  name: string;
  id: string;
}

export function parseArtists(
  rawArtist?: string | null,
  rawArtistId?: string | null,
  structuredArtists?: TrackArtist[] | null
): ParsedArtist[] {
  // If structured artists are provided by backend:
  if (structuredArtists && structuredArtists.length > 0) {
    return structuredArtists
      .filter((a) => a.name && a.name.trim().length > 0)
      .map((a, i) => ({
        name: a.name.trim(),
        id: a.id || (i === 0 && rawArtistId ? rawArtistId : a.name.trim()),
      }));
  }

  let str = (rawArtist || "").trim();
  if (!str) return [];

  // Strip leading media indicator (e.g. "Şarkı, ", "Video, ", "Song • ")
  str = str.replace(/^(şarkı|video|song|single|tekli|ep|albüm|album)\s*[,•·-]\s*/i, "").trim();

  // Split by comma
  const parts = str.split(",").map((s) => s.trim()).filter(Boolean);

  if (parts.length <= 1) {
    return [
      {
        name: str || "Unknown Artist",
        id: rawArtistId || str || "Unknown Artist",
      },
    ];
  }

  return parts.map((name, idx) => ({
    name,
    id: idx === 0 && rawArtistId ? rawArtistId : name,
  }));
}

export interface ArtistLinksProps {
  artist?: string | null;
  artistId?: string | null;
  artists?: TrackArtist[] | null;
  onNavigateArtist?: (artistId: string, artistName: string) => void;
  className?: string;
  linkClassName?: string;
  separatorClassName?: string;
}

export const ArtistLinks: FC<ArtistLinksProps> = ({
  artist,
  artistId,
  artists,
  onNavigateArtist,
  className = "",
  linkClassName = "hover:underline cursor-pointer",
  separatorClassName = "text-neutral-500 cursor-default select-none",
}) => {
  const parsed = parseArtists(artist, artistId, artists);

  if (parsed.length === 0) {
    return <span className={className}>Unknown Artist</span>;
  }

  return (
    <span className={className}>
      {parsed.map((item, idx) => (
        <span key={`${item.name}-${idx}`} className="inline">
          <span
            onClick={(e: MouseEvent<HTMLSpanElement>) => {
              e.stopPropagation();
              if (onNavigateArtist) {
                onNavigateArtist(item.id, item.name);
              }
            }}
            className={linkClassName}
            title={item.name}
          >
            {item.name}
          </span>
          {idx < parsed.length - 1 && (
            <span
              className={separatorClassName}
              onClick={(e: MouseEvent<HTMLSpanElement>) => e.stopPropagation()}
            >
              {", "}
            </span>
          )}
        </span>
      ))}
    </span>
  );
};

export default ArtistLinks;

