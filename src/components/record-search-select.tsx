"use client";
import { useRef, useState } from "react";
import { searchSchoolRecords } from "@/app/dashboard/search/actions";
import type {
  RecordChoice,
  RecordSearchInput,
  RecordSearchResult,
} from "@/lib/record-search";

export function RecordSearchSelect({
  kind,
  name,
  label,
  disabled = false,
  excludeId,
  academicYearId,
  onChange,
  initialChoice = null,
  required = true,
  emptyLabel,
  searchAction,
}: {
  kind: RecordSearchInput["kind"];
  name: string;
  label: string;
  disabled?: boolean;
  excludeId?: string;
  academicYearId?: string;
  onChange?: (choice: RecordChoice | null) => void;
  initialChoice?: RecordChoice | null;
  required?: boolean;
  emptyLabel?: string;
  searchAction?: (query: string, page: number) => Promise<RecordSearchResult>;
}) {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<RecordSearchResult>({
    choices: [],
    hasNext: false,
    error: "",
  });
  const [selected, setSelected] = useState<RecordChoice | null>(initialChoice);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const requestNumber = useRef(0);
  async function search(text: string, nextPage: number) {
    const request = ++requestNumber.current;
    setBusy(true);
    try {
      const next = searchAction ? await searchAction(text, nextPage) : await searchSchoolRecords({
        kind,
        query: text,
        page: nextPage,
        ...(excludeId ? { excludeId } : {}),
        ...(academicYearId ? { academicYearId } : {}),
      });
      if (request !== requestNumber.current) return;
      setResult(next);
      setPage(nextPage);
      setSearched(text);
      setLoaded(true);
    } catch {
      if (request !== requestNumber.current) return;
      setResult({
        choices: [],
        hasNext: false,
        error: "Search could not complete. Try again.",
      });
      setLoaded(true);
    } finally {
      if (request === requestNumber.current) setBusy(false);
    }
  }
  const choices =
    selected && !result.choices.some((choice) => choice.id === selected.id)
      ? [selected, ...result.choices]
      : result.choices;
  return (
    <div className="access-form">
      <label>
        Search {label.toLowerCase()} by name
        <input
          type="search"
          value={query}
          maxLength={80}
          disabled={disabled || busy}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void search(query, 1);
            }
          }}
        />
      </label>
      <button
        type="button"
        className="button secondary"
        disabled={disabled || busy}
        onClick={() => void search(query, 1)}
      >
        {busy ? "Searching…" : "Search choices"}
      </button>
      {!loaded && (
        <p className="small muted">
          Enter a name, or leave the search blank to browse choices.
        </p>
      )}
      <label>
        {label}
        <select
          name={name}
          required={required}
          value={selected?.id ?? ""}
          disabled={disabled || busy}
          onChange={(event) => {
            const choice =
              choices.find((item) => item.id === event.target.value) ?? null;
            setSelected(choice);
            onChange?.(choice);
          }}
        >
          <option value="">{emptyLabel ?? `Select ${label.toLowerCase()}`}</option>
          {choices.map((choice) => (
            <option key={choice.id} value={choice.id} disabled={choice.disabled}>
              {choice.label}
            </option>
          ))}
        </select>
      </label>
      {selected && <p className="small muted">Selected: {selected.label}</p>}
      <div role="status" aria-live="polite">
        {result.error ? (
          <p className="error-message">{result.error}</p>
        ) : (
          loaded && (
            <p className="small muted">
              {result.choices.length
                ? `Search page ${page} · ${result.choices.length} choices`
                : "No matching choices on this page."}
            </p>
          )
        )}
      </div>
      {loaded && !result.error && (
        <div className="flex flex-wrap gap-3">
          {page > 1 && (
            <button
              type="button"
              className="button secondary"
              disabled={disabled || busy}
              onClick={() => void search(searched, page - 1)}
            >
              Previous choices
            </button>
          )}
          {result.hasNext && page < 100_000 && (
            <button
              type="button"
              className="button secondary"
              disabled={disabled || busy}
              onClick={() => void search(searched, page + 1)}
            >
              Next choices
            </button>
          )}
        </div>
      )}
    </div>
  );
}
