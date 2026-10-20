import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { execFile } from "node:child_process";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import process from "node:process";

const host = process.env.TAURI_DEV_HOST;

function tubifyDevApiPlugin(): Plugin {
  const sessionFilePath = path.join(process.cwd(), "tubify_session.json");

  function getStoredSession() {
    if (fs.existsSync(sessionFilePath)) {
      try {
        return JSON.parse(fs.readFileSync(sessionFilePath, "utf8"));
      } catch {
        return null;
      }
    }
    return null;
  }

  function getSapisid(cookies: string): string | null {
    for (const part of cookies.split(";")) {
      const trimmed = part.trim();
      if (trimmed.startsWith("SAPISID=")) return trimmed.slice(8);
      if (trimmed.startsWith("__Secure-3PAPISID=")) return trimmed.slice(18);
    }
    return null;
  }

  function getSapisidHash(sapisid: string): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const hash = crypto
      .createHash("sha1")
      .update(`${timestamp} ${sapisid} https://music.youtube.com`)
      .digest("hex");
    return `SAPISIDHASH ${timestamp}_${hash}`;
  }

  return {
    name: "tubify-dev-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || "", `http://${req.headers.host}`);

        // 1. Search API
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

        // 2. Stream Resolution API
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

        // 3. Auth Status API
        if (url.pathname === "/api/auth/status") {
          const session = getStoredSession();
          res.setHeader("Content-Type", "application/json");
          if (session?.profile) {
            res.end(JSON.stringify(session.profile));
          } else {
            res.end(JSON.stringify({ is_authenticated: false }));
          }
          return;
        }

        // 4. Auth Save Cookie API
        if (url.pathname === "/api/auth/save-cookie" && req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => (body += chunk));
          req.on("end", async () => {
            try {
              const { cookie } = JSON.parse(body);
              const sapisid = getSapisid(cookie);
              const headers: Record<string, string> = {
                "Content-Type": "application/json",
                Origin: "https://music.youtube.com",
                Referer: "https://music.youtube.com/",
                Cookie: cookie,
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
              };
              if (sapisid) {
                headers["Authorization"] = getSapisidHash(sapisid);
              }

              const testRes = await fetch("https://music.youtube.com/youtubei/v1/browse", {
                method: "POST",
                headers,
                body: JSON.stringify({
                  context: { client: { clientName: "WEB_REMIX", clientVersion: "1.20240401.01.00", hl: "tr", gl: "TR" } },
                  browseId: "FEmusic_home",
                }),
              });

              if (!testRes.ok) {
                throw new Error("Çerez doğrulanamadı.");
              }

              const profile = {
                is_authenticated: true,
                name: "Google Hesabım",
                email: null,
                avatar_url: null,
              };

              fs.writeFileSync(
                sessionFilePath,
                JSON.stringify({ cookie, sapisid, profile }, null, 2)
              );

              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(profile));
            } catch (err: any) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        // 5. Auth Logout API
        if (url.pathname === "/api/auth/logout" && req.method === "POST") {
          if (fs.existsSync(sessionFilePath)) {
            fs.unlinkSync(sessionFilePath);
          }
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: true }));
          return;
        }

        // 6. Liked Songs API
        if (url.pathname === "/api/auth/liked") {
          const session = getStoredSession();
          if (!session?.cookie) {
            res.statusCode = 401;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Giriş yapılmamış" }));
            return;
          }

          const headers: Record<string, string> = {
            "Content-Type": "application/json",
            Origin: "https://music.youtube.com",
            Referer: "https://music.youtube.com/",
            Cookie: session.cookie,
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          };
          if (session.sapisid) {
            headers["Authorization"] = getSapisidHash(session.sapisid);
          }

          try {
            const ytRes = await fetch("https://music.youtube.com/youtubei/v1/browse", {
              method: "POST",
              headers,
              body: JSON.stringify({
                context: { client: { clientName: "WEB_REMIX", clientVersion: "1.20240401.01.00", hl: "tr", gl: "TR" } },
                browseId: "FEmusic_liked",
              }),
            });

            const data = await ytRes.json();
            const tracks: any[] = [];
            const items =
              data.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content
                ?.sectionListRenderer?.contents?.[0]?.musicPlaylistShelfRenderer?.contents || [];

            for (const item of items) {
              const m = item.musicResponsiveListItemRenderer;
              if (m) {
                const id =
                  m.playlistItemData?.videoId ||
                  m.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId;
                if (id) {
                  const title =
                    m.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text || "Unknown";
                  const artist =
                    m.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs
                      ?.map((r: any) => r.text)
                      .filter((t: string) => t !== "Song" && t !== " • " && t !== " & " && t !== ", ")
                      .join(", ") || "Unknown Artist";
                  const thumb =
                    m.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url || null;
                  tracks.push({ id, title, artist, thumbnail: thumb });
                }
              }
            }

            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(tracks));
            return;
          } catch (e: any) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: e.message }));
            return;
          }
        }

        // 7. Playlists API
        if (url.pathname === "/api/auth/playlists") {
          const session = getStoredSession();
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
            Origin: "https://music.youtube.com",
            Referer: "https://music.youtube.com/",
            Cookie: session?.cookie || "",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          };
          if (session?.sapisid) {
            headers["Authorization"] = getSapisidHash(session.sapisid);
          }

          try {
            const ytRes = await fetch("https://music.youtube.com/youtubei/v1/browse", {
              method: "POST",
              headers,
              body: JSON.stringify({
                context: { client: { clientName: "WEB_REMIX", clientVersion: "1.20240401.01.00", hl: "tr", gl: "TR" } },
                browseId: "FEmusic_library_landing",
              }),
            });

            const data = await ytRes.json();
            const playlists: Array<{
              id: string;
              title: string;
              description: string | null;
              thumbnail: string | null;
            }> = [
              {
                id: "LM",
                title: "Beğenilen Şarkılar",
                description: "YouTube Music hesabınızdan eşitlenen parçalar",
                thumbnail: null,
              },
            ];

            const sections =
              data.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content
                ?.sectionListRenderer?.contents || [];

            for (const s of sections) {
              const items = s.musicCarouselShelfRenderer?.contents || [];
              for (const it of items) {
                const card = it.musicTwoRowItemRenderer;
                if (card) {
                  const bId = card.navigationEndpoint?.browseEndpoint?.browseId;
                  const title = card.title?.runs?.[0]?.text;
                  const thumb =
                    card.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url;
                  if (bId && title) {
                    playlists.push({ id: bId, title, description: null, thumbnail: thumb });
                  }
                }
              }
            }

            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(playlists));
            return;
          } catch (e: any) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: e.message }));
            return;
          }
        }

        // 8. Add Track to Playlist API
        if (url.pathname === "/api/playlist/add-track" && req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => (body += chunk));
          req.on("end", async () => {
            try {
              const { playlistId, videoId } = JSON.parse(body);
              const session = getStoredSession();
              if (!session?.cookie) {
                res.statusCode = 401;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: "Giriş yapılmamış" }));
                return;
              }

              const cleanId = playlistId.startsWith("VL") ? playlistId.slice(2) : playlistId;
              const headers: Record<string, string> = {
                "Content-Type": "application/json",
                Origin: "https://music.youtube.com",
                Referer: "https://music.youtube.com/",
                Cookie: session.cookie,
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
              };
              if (session.sapisid) {
                headers["Authorization"] = getSapisidHash(session.sapisid);
              }

              const ytRes = await fetch("https://music.youtube.com/youtubei/v1/browse/edit_playlist", {
                method: "POST",
                headers,
                body: JSON.stringify({
                  context: { client: { clientName: "WEB_REMIX", clientVersion: "1.20240401.01.00", hl: "tr", gl: "TR" } },
                  playlistId: cleanId,
                  actions: [
                    {
                      action: "ACTION_ADD_VIDEO",
                      addedVideoId: videoId,
                      dedupeOption: "DEDUPE_OPTION_CHECK",
                    },
                  ],
                }),
              });

              if (!ytRes.ok) {
                const errText = await ytRes.text();
                throw new Error(errText || "Çalma listesine eklenemedi");
              }

              const data = await ytRes.json();
              if (data.status && data.status !== "STATUS_SUCCEEDED") {
                throw new Error(`İşlem başarısız: ${data.status}`);
              }

              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true }));
            } catch (err: any) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: err.message }));
            }
          });
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
