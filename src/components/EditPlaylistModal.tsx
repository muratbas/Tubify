import { useState, useEffect, type FC, type FormEvent } from "react";
import { X, Music2 } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import type { Playlist } from "../types/music";

export interface EditPlaylistModalProps {
  isOpen: boolean;
  playlist: Playlist | null;
  onClose: () => void;
  onSave: (playlistId: string, title: string, description?: string) => void;
}

export const EditPlaylistModal: FC<EditPlaylistModalProps> = ({
  isOpen,
  playlist,
  onClose,
  onSave,
}) => {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (playlist) {
      setTitle(playlist.title || "");
      setDescription(playlist.description || "");
    }
  }, [playlist]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !playlist) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    onSave(playlist.id, cleanTitle, description.trim() || undefined);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl p-6 relative border transition-all animate-in zoom-in-95 duration-150 ${
          isLight
            ? "bg-white border-neutral-200 text-neutral-900 shadow-neutral-500/20"
            : "bg-[#1f1f1f] border-white/10 text-white shadow-black/80"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-white/10">
          <h3 className="text-base font-bold tracking-tight">Bilgileri düzenle</h3>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              isLight ? "hover:bg-neutral-100 text-neutral-500" : "hover:bg-white/10 text-neutral-400"
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="flex items-start gap-4">
            {/* Thumbnail Preview */}
            <div
              className={`w-28 h-28 rounded-xl overflow-hidden shrink-0 flex items-center justify-center shadow-sm ${
                isLight ? "bg-neutral-100 border border-neutral-200" : "bg-neutral-800 border border-white/5"
              }`}
            >
              {playlist.thumbnail ? (
                <img
                  src={playlist.thumbnail}
                  alt={playlist.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Music2 className="w-8 h-8 text-neutral-400" />
              )}
            </div>

            {/* Inputs */}
            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-neutral-500 dark:text-neutral-400">
                  Ad
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Çalma listesi adı"
                  className={`w-full px-3 py-2 text-xs rounded-lg font-medium outline-none transition-all ${
                    isLight
                      ? "bg-neutral-50 border border-neutral-300 focus:border-[#ff0000] focus:bg-white text-neutral-900"
                      : "bg-[#282828] border border-white/10 focus:border-[#ff0000] focus:bg-[#323232] text-white"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-neutral-500 dark:text-neutral-400">
                  Açıklama (İsteğe bağlı)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Açıklama ekle"
                  className={`w-full px-3 py-2 text-xs rounded-lg font-medium outline-none resize-none transition-all ${
                    isLight
                      ? "bg-neutral-50 border border-neutral-300 focus:border-[#ff0000] focus:bg-white text-neutral-900"
                      : "bg-[#282828] border border-white/10 focus:border-[#ff0000] focus:bg-[#323232] text-white"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                isLight
                  ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                  : "bg-white/10 hover:bg-white/15 text-neutral-200"
              }`}
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-5 py-2 text-xs font-bold rounded-full bg-[#ff0000] text-white hover:bg-[#e60000] disabled:opacity-50 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPlaylistModal;
