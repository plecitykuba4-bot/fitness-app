"use client";

import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export function ExerciseImageUpload({ exerciseId, imageUrl }: { exerciseId: string; imageUrl?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true); setMessage(null);
    const data = new FormData(); data.set("image", file);
    const response = await fetch(`/api/exercises/${exerciseId}/image`, { method: "POST", body: data });
    const result = await response.json().catch(() => ({}));
    setUploading(false);
    if (!response.ok) { setMessage(result.error ?? "Fotku se nepodařilo nahrát."); return; }
    setMessage("Fotka je uložená a uvidí ji i klient."); router.refresh();
  };
  return (
    <div className="-ml-7 mt-3 w-[calc(100%+1.75rem)] rounded-[var(--radius-button)] border border-border bg-surface p-3">
      <div className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-2">
        {imageUrl ? (
          // Fotky leží na vlastním VPS a vznikají za běhu, proto nepoužíváme statickou optimalizaci Nextu.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="Technika cviku" className="size-12 rounded-lg object-cover" />
        ) : <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary-strong"><ImagePlus aria-hidden="true" className="size-6" /></div>}
        <div className="min-w-0"><p className="font-semibold">Fotka techniky</p><p className="text-sm text-muted-foreground">Nahraj z galerie iPhonu.</p></div>
        <button type="button" disabled={uploading} onClick={() => inputRef.current?.click()} className="flex min-h-touch items-center gap-2 rounded-[var(--radius-button)] bg-primary px-3 text-sm font-bold text-primary-foreground disabled:opacity-60">
          {uploading ? <LoaderCircle className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}{imageUrl ? "Změnit" : "Přidat"}
        </button>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif" className="sr-only" onChange={(event) => upload(event.target.files?.[0])} />
      </div>
      {message && <p className="mt-2 text-sm font-medium text-muted-foreground">{message}</p>}
    </div>
  );
}
