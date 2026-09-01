import { z } from "zod";

/**
 * Enumy jsou v databázi uložené jako String (kvůli portabilitě SQLite ↔ PostgreSQL).
 * Typovou i runtime bezpečnost zajišťují tato Zod schémata — používej je všude,
 * kde hodnota vstupuje do aplikace nebo se z databáze čte.
 */

export const RoleSchema = z.enum(["TRAINER", "CLIENT"]);
export type Role = z.infer<typeof RoleSchema>;

export const ClientStatusSchema = z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]);
export type ClientStatus = z.infer<typeof ClientStatusSchema>;

export const MediaKindSchema = z.enum(["IMAGE", "VIDEO"]);
export type MediaKind = z.infer<typeof MediaKindSchema>;

export const WorkoutStatusSchema = z.enum([
  "IN_PROGRESS",
  "COMPLETED",
  "ABANDONED",
]);
export type WorkoutStatus = z.infer<typeof WorkoutStatusSchema>;

export const NoteScopeSchema = z.enum([
  "CLIENT",
  "WORKOUT",
  "WORKOUT_EXERCISE",
  "WORKOUT_SET",
]);
export type NoteScope = z.infer<typeof NoteScopeSchema>;

export const NotificationTypeSchema = z.enum([
  "WORKOUT_COMPLETED",
  "NOTE_ADDED",
]);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

/** Kategorie cviků — zobrazované popisky jsou zároveň uloženou hodnotou. */
export const EXERCISE_CATEGORIES = [
  "Prsa",
  "Záda",
  "Ramena",
  "Biceps",
  "Triceps",
  "Nohy",
  "Hýždě",
  "Střed těla",
  "Kardio",
] as const;

export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  ACTIVE: "Aktivní",
  PAUSED: "Pozastavený",
  ARCHIVED: "Archivovaný",
};

export const WORKOUT_STATUS_LABELS: Record<WorkoutStatus, string> = {
  IN_PROGRESS: "Probíhá",
  COMPLETED: "Dokončeno",
  ABANDONED: "Nedokončeno",
};
