import { Check, LockKeyhole } from "lucide-react";
import { setTrainingPassUsageAction } from "@/server/actions/trainer";
import { cn } from "@/lib/utils";

export function TrainingPassCard({
  name,
  total,
  used,
  editable = false,
  clientId,
}: {
  name: string;
  total: number;
  used: number;
  editable?: boolean;
  clientId?: string;
}) {
  return (
    <section className="relative isolate overflow-hidden rounded-2xl border border-primary/45 bg-surface p-5 text-foreground shadow-lg">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 -z-10 size-52 rounded-full bg-primary/25 blur-3xl"
      />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary-strong">
            Tréninková karta
          </p>
          <h2 className="mt-1 text-2xl font-bold text-foreground">{name}</h2>
        </div>
        <p className="tabular text-right text-sm font-semibold text-muted-foreground">
          <span className="block text-2xl font-extrabold text-foreground">
            {Math.max(total - used, 0)}
          </span>
          zbývá
        </p>
      </div>

      {total === 0 ? (
        <p className="mt-8 rounded-xl bg-surface-muted p-4 text-center text-foreground">
          Nejdřív nastav počet zaplacených tréninků.
        </p>
      ) : (
        <div
          className="mt-7 grid grid-cols-5 gap-3"
          aria-label={`${used} z ${total} tréninků odcvičeno`}
        >
          {Array.from({ length: total }, (_, index) => {
            const complete = index < used;
            const content = (
              <span
                className={cn(
                  "flex aspect-square items-center justify-center rounded-full border-2 text-sm font-extrabold transition-all",
                  complete
                    ? "border-primary bg-primary text-primary-foreground shadow-[0_0_0_4px_rgb(174_240_0_/_0.14)]"
                    : "border-border bg-background text-muted-foreground",
                )}
              >
                {complete ? (
                  <Check aria-hidden="true" className="size-5 stroke-[3]" />
                ) : (
                  index + 1
                )}
              </span>
            );

            if (!editable || !clientId) {
              return <span key={index}>{content}</span>;
            }

            const action = setTrainingPassUsageAction.bind(null, clientId, index);
            return (
              <form key={index} action={action}>
                <button
                  className="w-full rounded-full transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-primary"
                  type="submit"
                  aria-label={`${complete ? "Zrušit označení" : "Označit jako odcvičený"} trénink ${index + 1}`}
                >
                  {content}
                </button>
              </form>
            );
          })}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between gap-3 text-sm font-semibold text-muted-foreground">
        <p>
          <span className="font-extrabold text-foreground">{used} / {total}</span>{" "}
          odcvičeno
        </p>
        {!editable && (
          <p className="flex items-center gap-1.5">
            <LockKeyhole aria-hidden="true" className="size-4" />
            Upravuje trenér
          </p>
        )}
      </div>
    </section>
  );
}
