import { FlaskConical } from "lucide-react";
import { devSwitchUserAction } from "@/server/actions/dev-switch";
import { isDevSwitchEnabled, listDevUsers } from "@/server/dev-switch";
import { getSessionUser } from "@/server/auth/session";

/**
 * ⚠️  VÝVOJOVÁ POMŮCKA — přepínání mezi trenérem a klienty bez hesla.
 * V produkci se nevykreslí vůbec (viz isDevSwitchEnabled).
 *
 * Je to `<details>`, aby ve složeném stavu zabíralo jen proužek a nekradlo
 * místo obrazovce, kterou zrovna zkoušíte.
 */
export async function DevSwitcher() {
  if (!isDevSwitchEnabled()) return null;

  const [users, current] = await Promise.all([listDevUsers(), getSessionUser()]);
  if (users.length === 0) return null;

  const trainers = users.filter((u) => u.role === "TRAINER");
  const clients = users.filter((u) => u.role === "CLIENT");

  return (
    <>
      {/*
        Lišta stojí nad celou aplikací, proto o svou výšku posune obsah
        i fixní navigaci. Bez toho by navigaci uřízla shora.
      */}
      <style>{`:root { --app-top-offset: 3rem; }`}</style>

      <details className="fixed inset-x-0 top-0 z-50 border-b border-primary/45 bg-surface-muted">
        <summary className="flex h-12 cursor-pointer list-none items-center gap-2 px-4 text-base font-semibold">
          <FlaskConical aria-hidden="true" className="size-5 shrink-0 text-primary-strong" />
          <span className="truncate">
            Vývojový přepínač účtů
            {current ? ` — přihlášen: ${current.name}` : " — nepřihlášen"}
          </span>
          <span aria-hidden="true" className="ml-auto shrink-0 text-muted-foreground">
            ▾
          </span>
        </summary>

        <div className="max-h-[70vh] overflow-y-auto px-4 pb-4">
          <p className="mb-3 text-base text-muted-foreground">
            Pouze pro vývoj. Přepne účet bez zadávání hesla.
          </p>

          <Group label="Trenér" users={trainers} currentId={current?.id} />
          <Group label="Klienti" users={clients} currentId={current?.id} />
        </div>
      </details>
    </>
  );
}

function Group({
  label,
  users,
  currentId,
}: {
  label: string;
  users: { id: string; name: string; email: string }[];
  currentId?: string;
}) {
  if (users.length === 0) return null;

  return (
    <div className="mt-3">
      <p className="mb-2 text-base font-semibold text-muted-foreground">
        {label}
      </p>
      <ul className="flex flex-wrap gap-2">
        {users.map((user) => {
          const isCurrent = user.id === currentId;
          return (
            <li key={user.id}>
              <form
                action={async () => {
                  "use server";
                  await devSwitchUserAction(user.id);
                }}
              >
                <button
                  type="submit"
                  disabled={isCurrent}
                  aria-current={isCurrent ? "true" : undefined}
                  className={
                    isCurrent
                      ? "flex min-h-touch cursor-default items-center rounded-[var(--radius-button)] bg-primary px-4 text-base font-semibold text-primary-foreground"
                      : "flex min-h-touch items-center rounded-[var(--radius-button)] border-2 border-border bg-surface px-4 text-base font-semibold hover:bg-surface-muted"
                  }
                >
                  {user.name}
                  {isCurrent && " ✓"}
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
