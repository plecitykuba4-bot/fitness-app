"use client";

import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export function ExerciseImageUpload({ exerciseId, imageUrl, videoUrl }: { exerciseId: string; imageUrl?: string; videoUrl?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const upload = async (file?: File) => {
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    const maxBytes = isVideo ? 200 * 1024 * 1024 : 60 * 1024 * 1024;
    if (file.size > maxBytes) {
      setMessage(isVideo ? "Video je příliš velké (maximum 200 MB)." : "Fotka je příliš velká (maximum 60 MB).");
      return;
    }

    setUploading(true);
    setMessage(null);
    try {
      const data = new FormData();
      data.set("image", file);
      const response = await fetch(`/api/exercises/${exerciseId}/image`, {
        method: "POST",
        body: data,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(
          response.status === 413
            ? "Soubor je příliš velký. Fotka může mít 60 MB, video 200 MB."
            : result.error ?? "Fotku se nepodařilo nahrát.",
        );
        return;
      }
      setMessage("Soubor je uložený a uvidí ho i klient.");
      router.refresh();
    } catch {
      setMessage("Nahrávání se přerušilo. Zkontrolujte připojení a zkuste to znovu.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };
  return (
    <div className="-ml-6 mt-2 w-[calc(100%+1.5rem)] rounded-[var(--radius-button)] border border-border bg-surface p-2">
      <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-2">
        {imageUrl ? (
          // Fotky leží na vlastním VPS a vznikají za běhu, proto nepoužíváme statickou optimalizaci Nextu.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="Technika cviku" className="size-10 rounded-lg object-cover" />
        ) : videoUrl ? (
          <video src={videoUrl} muted playsInline preload="metadata" className="size-10 rounded-lg object-cover" />
        ) : <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary-strong"><ImagePlus aria-hidden="true" className="size-5" /></div>}
        <div className="min-w-0"><p className="text-sm font-semibold">Fotka nebo video</p><p className="text-xs text-muted-foreground">Galerie telefonu</p></div>
        <button type="button" disabled={uploading} onClick={() => inputRef.current?.click()} className="flex h-9 items-center gap-1.5 rounded-[var(--radius-button)] bg-primary px-3 text-sm font-bold text-primary-foreground disabled:opacity-60">
          {uploading ? <LoaderCircle className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}{imageUrl ? "Změnit" : "Přidat"}
        </button>
        <input ref={inputRef} type="file" accept="image/*,video/mp4,video/quicktime,video/webm,video/x-m4v" className="sr-only" onChange={(event) => upload(event.target.files?.[0])} />
      </div>
      {message && <p className="mt-2 text-sm font-medium text-muted-foreground">{message}</p>}
    </div>
  );
}
