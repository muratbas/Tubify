import { useState, useEffect, useRef, type FC, type FormEvent } from "react";
import { X, Music2, Globe, EyeOff, Lock, Loader2, Camera, Trash2, Upload } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import type { Playlist } from "../types/music";

export type PrivacyStatus = "PUBLIC" | "UNLISTED" | "PRIVATE";

export interface EditPlaylistModalProps {
  isOpen: boolean;
  playlist: Playlist | null;
  onClose: () => void;
  onSave: (
    playlistId: string,
    title: string,
    description?: string,
    privacyStatus?: PrivacyStatus,
    customThumbnail?: string | null
  ) => Promise<void> | void;
}

export function resizeImageFile(file: File, maxDim: number = 500, quality: number = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
  const [privacyStatus, setPrivacyStatus] = useState<PrivacyStatus>("PUBLIC");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isCoverModified, setIsCoverModified] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (playlist) {
      setTitle(playlist.title || "");
      setDescription(playlist.description || "");
      const priv =
        playlist.privacy_status === "PRIVATE" ||
        playlist.privacy_status === "UNLISTED" ||
        playlist.privacy_status === "PUBLIC"
          ? playlist.privacy_status
          : "PUBLIC";
      setPrivacyStatus(priv);
      setCoverPreview(playlist.thumbnail || null);
      setIsCoverModified(false);
      setIsDraggingOver(false);
      setError(null);
      setIsSubmitting(false);
    }
  }, [playlist, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !playlist) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Lütfen geçerli bir resim dosyası seçin (PNG, JPG, WebP).");
      return;
    }

    try {
      const resized = await resizeImageFile(file, 500, 0.85);
      setCoverPreview(resized);
      setIsCoverModified(true);
      setError(null);
    } catch {
      setError("Resim işlenirken bir sorun oluştu.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Lütfen geçerli bir resim dosyası seçin (PNG, JPG, WebP).");
        return;
      }

      try {
        const resized = await resizeImageFile(file, 500, 0.85);
        setCoverPreview(resized);
        setIsCoverModified(true);
        setError(null);
      } catch {
        setError("Resim işlenirken bir sorun oluştu.");
      }
      return;
    }

    const droppedUrl =
      e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
    if (
      droppedUrl &&
      (droppedUrl.startsWith("http://") ||
        droppedUrl.startsWith("https://") ||
        droppedUrl.startsWith("data:image/"))
    ) {
      setCoverPreview(droppedUrl);
      setIsCoverModified(true);
      setError(null);
    }
  };

  const handleRemoveCover = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCoverPreview(null);
    setIsCoverModified(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await onSave(
        playlist.id,
        cleanTitle,
        description.trim(),
        privacyStatus,
        isCoverModified ? coverPreview : undefined
      );
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Çalma listesi güncellenemedi");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl p-6 relative border transition-all animate-in zoom-in-95 duration-150 ${
          isLight
            ? "bg-white border-neutral-200 text-neutral-900 shadow-neutral-500/20"
            : "bg-[#1f1f1f] border-white/10 text-white shadow-black/80"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
        />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-white/10">
          <h3 className="text-base font-bold tracking-tight">Bilgileri düzenle</h3>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              isLight ? "hover:bg-neutral-100 text-neutral-500" : "hover:bg-white/10 text-neutral-400"
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error message banner */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
            {error}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="flex items-start gap-4">
            {/* Thumbnail Preview with Click-to-Upload */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                onClick={() => {
                  if (!isSubmitting) fileInputRef.current?.click();
                }}
                onDragOver={handleDragOver}
                onDragEnter={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`w-28 h-28 rounded-xl overflow-hidden shrink-0 relative group/thumb cursor-pointer flex items-center justify-center shadow-sm transition-all border ${
                  isDraggingOver
                    ? "border-2 border-dashed border-[#ff0000] bg-red-500/10 scale-[1.02]"
                    : isLight
                    ? "bg-neutral-100 border-neutral-200 hover:border-neutral-400"
                    : "bg-neutral-800 border-white/10 hover:border-white/30"
                }`}
                title="Kapak görseli seçmek veya sürükleyip bırakmak için tıkla"
              >
                {coverPreview ? (
                  <img
                    src={coverPreview}
                    alt={playlist.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Music2 className="w-8 h-8 text-neutral-400" />
                )}

                {/* Dragging over overlay */}
                {isDraggingOver ? (
                  <div className="absolute inset-0 bg-[#ff0000]/25 backdrop-blur-xs flex flex-col items-center justify-center gap-1 text-white z-20 p-2 text-center pointer-events-none">
                    <Upload className="w-6 h-6 text-white animate-bounce" />
                    <span className="text-[10px] font-bold tracking-tight leading-tight drop-shadow">
                      Buraya bırakın
                    </span>
                  </div>
                ) : (
                  /* Hover overlay with Camera icon */
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white z-10 p-2 text-center">
                    <Camera className="w-5 h-5 drop-shadow" />
                    <span className="text-[10px] font-bold tracking-tight leading-tight drop-shadow">
                      Fotoğraf seç veya sürükle
                    </span>
                  </div>
                )}
              </div>

              {coverPreview && (
                <button
                  type="button"
                  onClick={handleRemoveCover}
                  disabled={isSubmitting}
                  className="text-[11px] font-medium text-neutral-400 hover:text-rose-500 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Kaldır</span>
                </button>
              )}
            </div>

            {/* Inputs */}
            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-neutral-500 dark:text-neutral-400">
                  Ad <span className="text-[#ff0000]">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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

          {/* Privacy Selector */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-neutral-500 dark:text-neutral-400">
              Gizlilik
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setPrivacyStatus("PUBLIC")}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  privacyStatus === "PUBLIC"
                    ? isLight
                      ? "border-[#ff0000] bg-red-50/50 text-[#ff0000] shadow-sm font-semibold"
                      : "border-[#ff0000] bg-[#ff0000]/10 text-white shadow-sm font-semibold"
                    : isLight
                    ? "border-neutral-200 hover:bg-neutral-50 text-neutral-600"
                    : "border-white/10 hover:bg-white/5 text-neutral-400"
                }`}
              >
                <Globe className="w-4 h-4 mb-1" />
                <span className="text-[11px]">Herkese Açık</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setPrivacyStatus("UNLISTED")}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  privacyStatus === "UNLISTED"
                    ? isLight
                      ? "border-[#ff0000] bg-red-50/50 text-[#ff0000] shadow-sm font-semibold"
                      : "border-[#ff0000] bg-[#ff0000]/10 text-white shadow-sm font-semibold"
                    : isLight
                    ? "border-neutral-200 hover:bg-neutral-50 text-neutral-600"
                    : "border-white/10 hover:bg-white/5 text-neutral-400"
                }`}
              >
                <EyeOff className="w-4 h-4 mb-1" />
                <span className="text-[11px]">Liste Dışı</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setPrivacyStatus("PRIVATE")}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  privacyStatus === "PRIVATE"
                    ? isLight
                      ? "border-[#ff0000] bg-red-50/50 text-[#ff0000] shadow-sm font-semibold"
                      : "border-[#ff0000] bg-[#ff0000]/10 text-white shadow-sm font-semibold"
                    : isLight
                    ? "border-neutral-200 hover:bg-neutral-50 text-neutral-600"
                    : "border-white/10 hover:bg-white/5 text-neutral-400"
                }`}
              >
                <Lock className="w-4 h-4 mb-1" />
                <span className="text-[11px]">Özel</span>
              </button>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1.5 px-0.5">
              {privacyStatus === "PUBLIC" && "Herkes arayabilir ve görüntüleyebilir."}
              {privacyStatus === "UNLISTED" && "Yalnızca bağlantıya sahip olanlar görüntüleyebilir."}
              {privacyStatus === "PRIVATE" && "Yalnızca siz görüntüleyebilirsiniz."}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3">
            <button
              type="button"
              disabled={isSubmitting}
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
              disabled={!title.trim() || isSubmitting}
              className="px-5 py-2 text-xs font-bold rounded-full bg-[#ff0000] text-white hover:bg-[#e60000] disabled:opacity-50 transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-1.5"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSubmitting ? "Kaydediliyor..." : "Kaydet"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPlaylistModal;
