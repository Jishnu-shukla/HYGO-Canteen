"use client";

import { searchPatientsApi } from "@/data/DietOrder/api";
import type { Patient } from "@/data/DietOrder/type";
import { Check, LoaderCircle, Search, UserRound, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-amber-300 focus:bg-white focus:ring-2 focus:ring-amber-100 disabled:opacity-60";

const DEBOUNCE_MS = 300;

export default function PatientSearchField({
    selected,
    onSelect,
    onClear,
}: {
    /** Currently locked-in patient, if any. */
    selected: Patient | null;
    onSelect: (patient: Patient) => void;
    onClear: () => void;
}) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Patient[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [highlighted, setHighlighted] = useState(0);
    const [error, setError] = useState("");

    const listboxId = useId();
    const containerRef = useRef<HTMLDivElement>(null);

    // Debounced lookup. Only the async result path calls setState here —
    // resetting happens in the input handler, so nothing fires synchronously.
    useEffect(() => {
        const trimmed = query.trim();

        if (!trimmed || selected) return;

        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                setIsSearching(true);
                setError("");

                const data = await searchPatientsApi(
                    trimmed,
                    10,
                    controller.signal
                );

                setResults(data);
                setHighlighted(0);
                setHasSearched(true);
                setIsOpen(true);
            } catch (err) {
                if (controller.signal.aborted) return;

                console.error("Error searching patients:", err);
                setError("Could not search patients. Please try again.");
                setResults([]);
                setHasSearched(true);
            } finally {
                if (!controller.signal.aborted) setIsSearching(false);
            }
        }, DEBOUNCE_MS);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [query, selected]);

    // Close the dropdown on outside click.
    useEffect(() => {
        const handlePointerDown = (event: PointerEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("pointerdown", handlePointerDown);
        return () => document.removeEventListener("pointerdown", handlePointerDown);
    }, []);

    const handleSelect = (patient: Patient) => {
        onSelect(patient);
        setQuery("");
        setResults([]);
        setHasSearched(false);
        setIsSearching(false);
        setIsOpen(false);
    };

    const handleClear = () => {
        setQuery("");
        setResults([]);
        setHasSearched(false);
        setError("");
        setIsOpen(false);
        onClear();
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen || results.length === 0) {
            if (event.key === "ArrowDown") setIsOpen(true);
            return;
        }

        if (event.key === "ArrowDown") {
            event.preventDefault();
            setHighlighted((current) => (current + 1) % results.length);
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlighted(
                (current) => (current - 1 + results.length) % results.length
            );
        } else if (event.key === "Enter") {
            event.preventDefault();
            handleSelect(results[highlighted]);
        } else if (event.key === "Escape") {
            setIsOpen(false);
        }
    };

    // ---- Locked state: patient chosen ----
    if (selected) {
        return (
            <div className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-600">
                    Patient Name
                    <span className="ml-0.5 text-red-500">*</span>
                </span>

                <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3.5 py-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                        <UserRound size={15} />
                    </span>

                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-emerald-900">
                            {selected.name}
                        </p>
                        <p className="truncate text-[10px] text-emerald-700/80">
                            {selected.uhid}
                        </p>
                    </div>

                    <Check size={16} className="shrink-0 text-emerald-600" />

                    <button
                        type="button"
                        onClick={handleClear}
                        aria-label="Clear selected patient"
                        className="shrink-0 cursor-pointer rounded-lg p-1 text-emerald-700 transition hover:bg-emerald-100"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>
        );
    }

    // ---- Search state ----
    const showEmptyState =
        isOpen && hasSearched && !isSearching && results.length === 0 && !error;
    const showResults = isOpen && results.length > 0;

    return (
        <div className="block" ref={containerRef}>
            <label htmlFor="patient-search" className="mb-1.5 block">
                <span className="text-xs font-semibold text-slate-600">
                    Patient Name
                    <span className="ml-0.5 text-red-500">*</span>
                </span>
            </label>

            <div className="relative">
                {isSearching ? (
                    <LoaderCircle
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 animate-spin text-amber-600"
                    />
                ) : (
                    <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                )}

                <input
                    id="patient-search"
                    type="text"
                    role="combobox"
                    autoComplete="off"
                    aria-expanded={showResults}
                    aria-controls={listboxId}
                    aria-autocomplete="list"
                    aria-activedescendant={
                        showResults ? `${listboxId}-${highlighted}` : undefined
                    }
                    value={query}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setError("");

                        // Clearing the box drops the previous matches so a
                        // stale list can't sit under a new query.
                        if (!event.target.value.trim()) {
                            setResults([]);
                            setHasSearched(false);
                            setIsOpen(false);
                        }
                    }}
                    onFocus={() => {
                        if (results.length > 0) setIsOpen(true);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Search patient by name..."
                    className={`${inputClass} pl-9`}
                />

                {query && (
                    <button
                        type="button"
                        onClick={handleClear}
                        aria-label="Clear search"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {showResults && (
                <ul
                    id={listboxId}
                    role="listbox"
                    className="absolute z-30 mt-1 max-h-56 w-[25%] overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                >
                    {results.map((patient, index) => (
                        <li
                            key={patient.uhid}
                            id={`${listboxId}-${index}`}
                            role="option"
                            aria-selected={index === highlighted}
                            onMouseEnter={() => setHighlighted(index)}
                            onMouseDown={(event) => {
                                // mousedown beats the input's blur
                                event.preventDefault();
                                handleSelect(patient);
                            }}
                            className={`cursor-pointer px-3.5 py-2.5 transition ${
                                index === highlighted
                                    ? "bg-amber-50"
                                    : "bg-white"
                            }`}
                        >
                            <p className="truncate text-sm font-semibold text-slate-800">
                                {patient.name}
                            </p>
                            <p className="truncate text-[10px] text-slate-400">
                                {patient.uhid}
                            </p>
                        </li>
                    ))}
                </ul>
            )}

            {showEmptyState && (
                <p className="absolute z-30 mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-400 shadow-lg">
                    No patient matches &ldquo;{query.trim()}&rdquo;.
                </p>
            )}

            {error && (
                <p className="mt-1 text-[10px] font-medium text-red-600">
                    {error}
                </p>
            )}
        </div>
    );
}