import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/server/db";

export const runtime = "nodejs";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".avif": "image/avif", ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm", ".m4v": "video/x-m4v",
};

/** Funguje lokálně i na VPS a obslouží soubory z obou dřívějších složek. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const media = await db.exerciseMedia.findUnique({ where: { id }, select: { storageKey: true } });
  if (!media) return new Response(null, { status: 404 });

  const prefix = "/uploads/exercises/";
  if (!media.storageKey.startsWith(prefix)) return new Response(null, { status: 404 });
  const filename = path.basename(media.storageKey);
  if (filename !== media.storageKey.slice(prefix.length)) return new Response(null, { status: 400 });

  for (const directory of [path.join(process.cwd(), "public", "uploads", "exercises"), path.join(process.cwd(), "uploads", "exercises")]) {
    try {
      const body = await readFile(path.join(/* turbopackIgnore: true */ directory, filename));
      return new Response(body, { headers: { "Content-Type": MIME_TYPES[path.extname(filename).toLowerCase()] ?? "application/octet-stream", "Cache-Control": "public, max-age=31536000, immutable" } });
    } catch { /* další složka může obsahovat soubor ze staršího nasazení */ }
  }
  return new Response(null, { status: 404 });
}
