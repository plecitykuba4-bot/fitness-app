import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getSessionUser } from "@/server/auth/session";
import { db } from "@/server/db";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/heic": ".heic",
  "image/heif": ".heif",
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
  if (file.size > MAX_IMAGE_BYTES || !EXTENSIONS[file.type]) {
    return Response.json({ error: "Nahrajte fotku JPG, PNG, WEBP nebo HEIC do 5 MB." }, { status: 400 });
  }

  const directory = path.join(process.cwd(), "public", "uploads", "exercises");
  await mkdir(directory, { recursive: true });
  const filename = `${exercise.id}-${randomUUID()}${EXTENSIONS[file.type]}`;
  await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()));

  const lastMedia = await db.exerciseMedia.findFirst({
    where: { exerciseId: exercise.id }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true },
  });
  const storageKey = `/uploads/exercises/${filename}`;
  await db.exerciseMedia.create({
    data: { exerciseId: exercise.id, kind: "IMAGE", storageKey, sortOrder: (lastMedia?.sortOrder ?? -1) + 1 },
  });

  return Response.json({ ok: true, storageKey });
}
