import type {
  Track,
  StreamInfo,
  UserProfile,
  Playlist,
  PlaylistTracksResult,
  ArtistDetails,
  AlbumDetails,
} from "../types/music";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export async function searchMusic(query: string): Promise<Track[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  if (isTauri) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<Track[]>("search_music", { query: trimmed });
    } catch (err) {
      console.warn("Tauri invoke failed, falling back to HTTP API:", err);
    }
  }

  const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Search request failed (${res.status}): ${errorText}`);
  }
  return await res.json();
}

export async function getStreamUrl(id: string): Promise<StreamInfo> {
  if (!id) throw new Error("Video ID is required");

  if (isTauri) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<StreamInfo>("get_stream_url", { id });
    } catch (err) {
      console.warn("Tauri invoke failed, falling back to HTTP API:", err);
    }
  }

  const res = await fetch(`/api/stream?id=${encodeURIComponent(id)}`);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Stream resolution failed (${res.status}): ${errorText}`);
  }
  return await res.json();
}

export async function getClientVersion(): Promise<string> {
  if (isTauri) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<string>("get_client_version");
    } catch (e) {
      console.warn("Tauri invoke error", e);
    }
  }
  return "Tubify v0.1.0 (Web/Dev Mode)";
}

export async function getUserProfile(): Promise<UserProfile> {
  if (isTauri) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<UserProfile>("get_user_profile");
    } catch (e) {
      console.warn("Tauri invoke error", e);
    }
  }

  const res = await fetch("/api/auth/status");
  if (res.ok) {
    return await res.json();
  }
  return { is_authenticated: false };
}

export async function openGoogleLogin(): Promise<void> {
  if (isTauri) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("open_google_login");
    return;
  }
  window.open(
    "https://accounts.google.com/ServiceLogin?service=youtube&continue=https%3A%2F%2Fmusic.youtube.com%2F",
    "_blank"
  );
}

export async function checkLoginStatus(): Promise<UserProfile> {
  if (isTauri) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<UserProfile>("check_login_status");
  }
  return await getUserProfile();
}

export async function openExternalUrl(url: string): Promise<void> {
  if (isTauri) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("open_external_url", { url });
      return;
    } catch {
      // Fallback
    }
  }
  window.open(url, "_blank");
}

export async function saveGoogleCookie(cookie: string): Promise<UserProfile> {
  if (isTauri) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<UserProfile>("save_google_cookie", { cookie });
  }

  const res = await fetch("/api/auth/save-cookie", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cookie }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Giriş doğrulanamadı");
  }
  return await res.json();
}

export async function logoutGoogle(): Promise<void> {
  if (isTauri) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("logout_google");
    return;
  }
  await fetch("/api/auth/logout", { method: "POST" });
}

export async function getYtLikedSongs(): Promise<Track[]> {
  if (isTauri) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<Track[]>("get_yt_liked_songs");
  }

  const res = await fetch("/api/auth/liked");
  if (!res.ok) {
    throw new Error("Beğenilen şarkılar yüklenemedi. Lütfen giriş yaptığınızdan emin olun.");
  }
  return await res.json();
}

export async function getYtPlaylists(): Promise<Playlist[]> {
  if (isTauri) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<Playlist[]>("get_yt_playlists");
  }

  const res = await fetch("/api/auth/playlists");
  if (!res.ok) {
    throw new Error("Çalma listeleri yüklenemedi");
  }
  return await res.json();
}

export async function toggleYtLike(videoId: string, like: boolean): Promise<void> {
  if (isTauri) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("toggle_yt_like", { videoId, like });
    return;
  }

  await fetch("/api/auth/like", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ videoId, like }),
  });
}

export async function getPlaylistTracks(playlistId: string): Promise<Track[]> {
  if (isTauri) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<Track[]>("get_playlist_tracks", { playlistId });
  }
  return [];
}

export async function getPlaylistTracksPage(
  playlistId: string,
  continuation?: string | null
): Promise<PlaylistTracksResult> {
  if (isTauri) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<PlaylistTracksResult>("get_playlist_tracks_page", {
      playlistId,
      continuation: continuation || null,
    });
  }
  return { tracks: [], continuation: null };
}

export async function getArtistDetails(browseId: string): Promise<ArtistDetails> {
  if (isTauri) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<ArtistDetails>("get_artist_details", { browseId });
  }
  throw new Error("Tauri ortamı gereklidir.");
}

export async function getAlbumDetails(browseId: string): Promise<AlbumDetails> {
  if (isTauri) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<AlbumDetails>("get_album_details", { browseId });
  }
  throw new Error("Tauri ortamı gereklidir.");
}

export async function getRadioTracks(videoId: string): Promise<Track[]> {
  if (isTauri) {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<Track[]>("get_radio_tracks", { videoId });
  }
  return [];
}

export async function minimizeWindow(): Promise<void> {
  if (isTauri) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("minimize_window");
    } catch (e) {
      console.error(e);
    }
  }
}

export async function toggleMaximizeWindow(): Promise<void> {
  if (isTauri) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("toggle_maximize_window");
    } catch (e) {
      console.error(e);
    }
  }
}

export async function closeWindow(): Promise<void> {
  if (isTauri) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("close_window");
    } catch (e) {
      console.error(e);
    }
  }
}
