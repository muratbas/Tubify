import type { Track, StreamInfo } from "../types/music";

// Check if running within a Tauri desktop webview
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

  // Fallback to dev server API
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

  // Fallback to dev server API
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
