import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { execFile } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
// @ts-expect-error type error without @types/node package
import process from "node:process";

const host = process.env.TAURI_DEV_HOST;

function tubifyDevApiPlugin(): Plugin {
  return {
    name: "tubify-dev-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || "", `http://${req.headers.host}`);

        if (url.pathname === "/api/search") {
          const q = url.searchParams.get("q") || "";
          try {
            const ytRes = await fetch("https://music.youtube.com/youtubei/v1/search", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                Referer: "https://music.youtube.com/",
              },
              body: JSON.stringify({
                context: {
                  client: {
                    clientName: "WEB_REMIX",
                    clientVersion: "1.20240401.01.00",
                    hl: "en",
                    gl: "US",
                  },
                },
                query: q,
              }),
            });

            const data = await ytRes.json();
            const tracks: Array<{
              id: string;
              title: string;
              artist: string;
              album: string | null;
              duration: string | null;
              thumbnail: string | null;
            }> = [];

            const contents =
              data.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content
                ?.sectionListRenderer?.contents || [];

            const parseItem = (m: any) => {
              const flexCols = m.flexColumns || [];
              const id =
                m.playlistItemData?.videoId ||
                flexCols[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId;

              if (!id) return;

              const title =
                flexCols[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text || "Unknown";

              let artist = "Unknown Artist";
              const artistRuns =
                flexCols[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
              const parts = artistRuns
                .map((r: any) => r.text)
                .filter((t: string) => t !== "Song" && t !== " • " && t !== " & " && t !== ", ");
              if (parts.length > 0) {
                artist = parts.join(", ");
              }

              const thumb =
                m.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
                null;

              if (!tracks.some((t) => t.id === id)) {
                tracks.push({
                  id,
                  title,
                  artist,
                  album: null,
                  duration: null,
                  thumbnail: thumb,
                });
              }
            };

            for (const section of contents) {
              if (section.itemSectionRenderer?.contents) {
                for (const item of section.itemSectionRenderer.contents) {
                  if (item.musicResponsiveListItemRenderer) {
                    parseItem(item.musicResponsiveListItemRenderer);
                  }
                }
              }
              if (section.musicShelfRenderer?.contents) {
                for (const item of section.musicShelfRenderer.contents) {
                  if (item.musicResponsiveListItemRenderer) {
                    parseItem(item.musicResponsiveListItemRenderer);
                  }
                }
              }
            }

            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(tracks));
            return;
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: msg }));
            return;
          }
        }

        if (url.pathname === "/api/stream") {
          const id = url.searchParams.get("id");
          if (!id) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Missing video id" }));
            return;
          }

          const candidates = [
            path.join(process.cwd(), "src-tauri", "bin", "yt-dlp.exe"),
            path.join(process.cwd(), "bin", "yt-dlp.exe"),
            path.join(process.env.TEMP || "", "yt-dlp.exe"),
          ];
          const ytdlp = candidates.find((c) => fs.existsSync(c)) || "yt-dlp";

          execFile(
            ytdlp,
            ["-j", "--no-playlist", "-f", "ba/b", `https://www.youtube.com/watch?v=${id}`],
            { maxBuffer: 10 * 1024 * 1024 },
            (err, stdout) => {
              if (err) {
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: err.message }));
                return;
              }
              try {
                const info = JSON.parse(stdout);
                let streamUrl = info.url;
                if (!streamUrl && info.formats) {
                  const a = info.formats
                    .slice()
                    .reverse()
                    .find(
                      (f: { vcodec?: string; resolution?: string; url?: string }) =>
                        f.vcodec === "none" || f.resolution === "audio only"
                    );
                  if (a) streamUrl = a.url;
                }
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    url: streamUrl,
                    title: info.title,
                    duration: info.duration,
                    format: info.format_id,
                    headers: info.http_headers,
                  })
                );
              } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: msg }));
              }
            }
          );
          return;
        }

        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react(), tailwindcss(), tubifyDevApiPlugin()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
