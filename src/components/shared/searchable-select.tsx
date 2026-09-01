"use client";

import { useId, useRef, useState } from "react";
import { Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type SearchableOption = {
  value: string;
  label: string;
  description?: string;
  keywords?: string;
  category?: string;
};

export function SearchableSelect({
  id,
  name,
  options,
  defaultValue = "",
  placeholder = "Začněte psát…",
  emptyLabel = "Žádná shoda",
  categories,
  alwaysOpen = false,
  onValueChange,
}: {
  id?: string;
  name?: string;
  options: SearchableOption[];
  defaultValue?: string;
  placeholder?: string;
  emptyLabel?: string;
  categories?: string[];
  alwaysOpen?: boolean;
  onValueChange?: (value: string) => void;
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listId = `${generatedId}-options`;
  // Prázdná hodnota znamená „zatím nic nevybráno“. Některé formuláře mají
  // současně legitimní volbu s value="" (např. předloha bez klienta), tu ale
  // nesmíme automaticky předvybrat a použít její text jako vyhledávací filtr.
  const initial = defaultValue
    ? options.find((option) => option.value === defaultValue)
    : undefined;
  const [value, setValue] = useState(defaultValue);
  const [query, setQuery] = useState(initial?.label ?? "");
  const [open, setOpen] = useState(false);
  const [hasSelection, setHasSelection] = useState(Boolean(initial));
  const [category, setCategory] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const normalized = query.trim().toLocaleLowerCase("cs");
  const filtered = options.filter(
    (option) =>
      (!category || option.category === category) &&
      `${option.label} ${option.description ?? ""} ${option.keywords ?? ""}`
        .toLocaleLowerCase("cs")
        .includes(normalized),
  );

  const choose = (option: SearchableOption) => {
    setValue(option.value);
    setQuery(option.label);
    setHasSelection(true);
    setOpen(false);
    onValueChange?.(option.value);
  };

  return (
    <div>
      {name && <input type="hidden" name={name} value={value} />}

      {categories && categories.length > 0 && (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1" aria-label="Filtrovat podle kategorie">
          {["", ...categories].map((item) => (
            <button
              key={item || "all"}
              type="button"
              aria-pressed={category === item}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setCategory(item);
                setValue("");
                setQuery("");
                setHasSelection(false);
                onValueChange?.("");
                setOpen(true);
                inputRef.current?.focus();
              }}
              className={cn(
                "min-h-10 shrink-0 rounded-full border px-4 text-sm font-bold transition-colors",
                category === item
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-foreground hover:border-primary/60 hover:bg-primary/10",
              )}
            >
              {item || "Vše"}
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-4 z-10 size-5 text-muted-foreground"
        />
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          autoComplete="off"
          value={query}
          placeholder={category ? `Hledat v kategorii ${category}…` : placeholder}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open || (alwaysOpen && !hasSelection)}
          aria-controls={listId}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onChange={(event) => {
            setQuery(event.target.value);
            setValue("");
            setHasSelection(false);
            onValueChange?.("");
            setOpen(true);
          }}
          className="min-h-touch-lg w-full rounded-[var(--radius-button)] border-2 border-border bg-surface py-2 pl-12 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />

        {(open || (alwaysOpen && !hasSelection)) && (
          <ul
            id={listId}
            role="listbox"
            className={cn(
              "inset-x-0 z-30 max-h-72 overflow-y-auto rounded-[var(--radius-button)] border border-border bg-surface p-1 shadow-2xl",
              alwaysOpen
                ? "relative mt-2 shadow-sm"
                : "absolute top-[calc(100%+0.35rem)]",
            )}
          >
          {filtered.length === 0 ? (
            <li className="px-3 py-4 text-center text-sm text-muted-foreground">
              {emptyLabel}
            </li>
          ) : (
            filtered.map((option) => (
              <li key={`${option.value}:${option.label}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(option)}
                  className={cn(
                    "flex min-h-touch w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-surface-muted",
                    option.value === value && "bg-primary/10",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{option.label}</span>
                    {option.description && (
                      <span className="block truncate text-sm text-muted-foreground">
                        {option.description}
                      </span>
                    )}
                  </span>
                  {option.value === value && (
                    <Check aria-hidden="true" className="size-5 shrink-0 text-primary-strong" />
                  )}
                </button>
              </li>
            ))
          )}
          </ul>
        )}
      </div>
    </div>
  );
}
