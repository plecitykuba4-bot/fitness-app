import { formatDateTime } from "@/lib/format";

export type NoteItem = {
  id: string;
  body: string;
  authorName: string;
  createdAt: Date;
};

export function NoteList({ notes }: { notes: NoteItem[] }) {
  if (notes.length === 0) {
    return <p className="text-lg text-muted-foreground">Zatím žádná poznámka.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {notes.map((note) => (
        <li
          key={note.id}
          className="rounded-[var(--radius-button)] bg-surface-muted p-4"
        >
          <p className="text-lg leading-relaxed">{note.body}</p>
          <p className="mt-2 text-base text-muted-foreground">
            {note.authorName} · {formatDateTime(note.createdAt)}
          </p>
        </li>
      ))}
    </ul>
  );
}
