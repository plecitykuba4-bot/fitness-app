"use client";

import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Trash2, Video } from "lucide-react";
import { useRouter } from "next/navigation";

type Media = { id: string; kind: string; storageKey: string };

function mediaSrc(media: Media) {
  return media.storageKey.startsWith("/uploads/")
    ? `/api/exercise-media/${media.id}`
    : media.storageKey;
}

export function ExerciseImageUpload({ exerciseId, media }: { exerciseId: string; media: Media[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      const response = await fetch(`/api/exercises/${exerciseId}/image`, { method: "POST", body: data });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(response.status === 413 ? "Soubor je příliš velký. Fotka může mít 60 MB, video 200 MB." : result.error ?? "Fotku se nepodařilo nahrát.");
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

  const remove = async (item: Media) => {
    if (!confirm("Opravdu smazat tento soubor z galerie?")) return;
    setDeletingId(item.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/exercises/${exerciseId}/image?mediaId=${encodeURIComponent(item.id)}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) setMessage(result.error ?? "Soubor se nepodařilo smazat.");
      else router.refresh();
    } catch {
      setMessage("Soubor se nepodařilo smazat. Zkuste to znovu.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="-ml-6 mt-2 w-[calc(100%+1.5rem)] rounded-[var(--radius-button)] border border-border bg-surface p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0"><p className="text-sm font-semibold">Fotky a videa</p><p className="text-xs text-muted-foreground">{media.length === 0 ? "Galerie telefonu" : `${media.length} souborů v galerii`}</p></div>
        <button type="button" disabled={uploading} onClick={() => inputRef.current?.click()} className="flex h-9 shrink-0 items-center gap-1.5 rounded-[var(--radius-button)] bg-primary px-3 text-sm font-bold text-primary-foreground disabled:opacity-60">
          {uploading ? <LoaderCircle className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}{media.length ? "Přidat další" : "Přidat"}
        </button>
        <input ref={inputRef} type="file" accept="image/*,video/mp4,video/quicktime,video/webm,video/x-m4v" className="sr-only" onChange={(event) => upload(event.target.files?.[0])} />
      </div>
      {media.length > 0 && <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {media.map((item, index) => <li key={item.id} className="relative aspect-square overflow-hidden rounded-lg border border-border bg-surface-muted">
          {item.kind === "IMAGE" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaSrc(item)} alt={`Technika cviku ${index + 1}`} className="size-full object-cover" />
          ) : <div className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground"><Video className="size-6" /><span className="text-xs font-semibold">Video</span></div>}
          <button type="button" onClick={() => remove(item)} disabled={deletingId !== null} aria-label={`Smazat soubor ${index + 1}`} className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-background/95 text-danger shadow-sm disabled:opacity-60">
            {deletingId === item.id ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          </button>
        </li>)}
      </ul>}
      {message && <p className="mt-2 text-sm font-medium text-muted-foreground">{message}</p>}
    </div>
  );
}
