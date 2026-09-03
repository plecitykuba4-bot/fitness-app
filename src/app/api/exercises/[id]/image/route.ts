import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import convertHeic from "heic-convert";
import { getSessionUser } from "@/server/auth/session";
import { db } from "@/server/db";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 60 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const IMAGE_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/heic",
  "image/heif", "image/avif", "image/tiff", "image/bmp",
]);
const VIDEO_EXTENSIONS: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
  "video/x-m4v": ".m4v",
};

/** Nahraje technickou fotku cviku přímo z mobilní galerie trenéra. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user?.trainerId) return Response.json({ error: "Nepřihlášený trenér." }, { status: 401 });

  const { id } = await context.params;
  const exercise = await db.exercise.findFirst({
    where: { id, trainerId: user.trainerId },
    select: { id: true },
  });
  if (!exercise) return Response.json({ error: "Cvik nebyl nalezen." }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "Vyberte fotku z galerie." }, { status: 400 });
  }
  const isImage = IMAGE_TYPES.has(file.type);
  const videoExtension = VIDEO_EXTENSIONS[file.type];
  if (!isImage && !videoExtension) {
    return Response.json({ error: "Vyberte fotku nebo video z galerie telefonu." }, { status: 400 });
  }
  if (isImage && file.size > MAX_IMAGE_BYTES) {
    return Response.json({ error: "Fotka je příliš velká (maximum je 60 MB)." }, { status: 413 });
  }
  if (videoExtension && file.size > MAX_VIDEO_BYTES) {
    return Response.json({ error: "Video je příliš velké (maximum je 200 MB)." }, { status: 413 });
  }

  const directory = path.join(process.cwd(), "public", "uploads", "exercises");
  await mkdir(directory, { recursive: true });
  const source = Buffer.from(await file.arrayBuffer());
  let kind: "IMAGE" | "VIDEO";
  let filename: string;

  try {
    if (isImage) {
      const input = file.type === "image/heic" || file.type === "image/heif"
        ? Buffer.from(await convertHeic({ buffer: source, format: "JPEG", quality: 0.9 }))
        : source;
      const optimized = await sharp(input)
        .rotate()
        .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 86, mozjpeg: true })
        .toBuffer();
      kind = "IMAGE";
      filename = `${exercise.id}-${randomUUID()}.jpg`;
      await writeFile(path.join(directory, filename), optimized);
    } else {
      kind = "VIDEO";
      filename = `${exercise.id}-${randomUUID()}${videoExtension}`;
      await writeFile(path.join(directory, filename), source);
    }
  } catch (error) {
    console.error("exercise media conversion", error);
    return Response.json(
      { error: "Tento soubor se nepodařilo zpracovat. Zkuste ho vybrat z galerie znovu." },
      { status: 422 },
    );
  }

  const lastMedia = await db.exerciseMedia.findFirst({
    where: { exerciseId: exercise.id }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true },
  });
  const storageKey = `/uploads/exercises/${filename}`;
  await db.exerciseMedia.create({
    data: { exerciseId: exercise.id, kind, storageKey, sortOrder: (lastMedia?.sortOrder ?? -1) + 1 },
  });

  return Response.json({ ok: true, storageKey });
}
