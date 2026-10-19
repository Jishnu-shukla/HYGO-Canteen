"use client";

import type { AllergyEntry, AllergySeverity } from "@/data/AllergyPref/type";
import { ALLERGY_SEVERITY } from "@/data/AllergyPref/type";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import {
    SEVERITY_BADGE,
    SEVERITY_LABEL,
    UNKNOWN_SEVERITY_BADGE,
} from "./allergyPrefLabels";

/**
 * Chip editors for the allergy-preference forms.
 *
 * Both fields are collections, not scalars, and neither earns a stack of
 * repeat rows on the page: you type a value, press Enter, and it becomes a
 * capsule. Removing is a hover over the capsule — until then the capsules take
 * only as much space as their content, which is what lets Allergies and
 * Intolerances sit side by side instead of each owning a full-width row.
 *
 * Empty drafts are never committed, so the props only ever hold values that
 * would be legal on the wire: { name, severity } tuples and bare strings.
 */

const SHELL =
    "rounded-xl border border-slate-200 bg-slate-50 p-2 transition focus-within:border-amber-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-amber-100";
const SHELL_DISABLED = "pointer-events-none opacity-60";

const DRAFT_INPUT =
    "min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400";

const ADD_BUTTON =
    "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-700 transition hover:bg-amber-100 disabled:opacity-40";

/** One committed value. Turns red on hover, when its remove button appears. */
const CAPSULE =
    "group inline-flex max-w-full items-center gap-1 rounded-full border border-slate-200 bg-white py-1 pl-2.5 pr-1 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:border-red-200 hover:bg-red-50";

/**
 * Opacity only — the button stays clickable before hover, so removal never
 * depends on pointer precision, and keyboard focus reveals it too.
 */
const CAPSULE_REMOVE =
    "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-slate-300 opacity-0 transition group-focus-within:opacity-100 group-hover:text-red-600 group-hover:opacity-100 focus-visible:opacity-100";

function Capsule({
    onRemove,
    removeLabel,
    children,
}: {
    onRemove: () => void;
    removeLabel: string;
    children: React.ReactNode;
}) {
    return (
        <span className={CAPSULE}>
            {children}

            <button
                type="button"
                onClick={onRemove}
                title={removeLabel}
                aria-label={removeLabel}
                className={CAPSULE_REMOVE}
            >
                <X size={11} strokeWidth={3} />
            </button>
        </span>
    );
}

/** The typing line every shell ends with. */
function DraftRow({
    draft,
    onDraftChange,
    onKeyDown,
    onAdd,
    placeholder,
    disabled,
    aside,
}: {
    draft: string;
    onDraftChange: (value: string) => void;
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    onAdd: () => void;
    placeholder: string;
    disabled: boolean;
    aside?: React.ReactNode;
}) {
    return (
        <div className="flex items-center gap-1.5">
            <input
                type="text"
                value={draft}
                disabled={disabled}
                onChange={(event) => onDraftChange(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder={placeholder}
                className={DRAFT_INPUT}
            />

            {aside}

            <button
                type="button"
                disabled={disabled}
                onClick={onAdd}
                title="Add"
                aria-label="Add"
                className={ADD_BUTTON}
            >
                <Plus size={13} />
            </button>
        </div>
    );
}

/**
 * Allergen capsules, each carrying its own severity — the severity select
 * applies to the value being typed, and resets to the schema default once a
 * capsule is committed.
 */
export function AllergyTagField({
    value,
    onChange,
    disabled = false,
}: {
    value: AllergyEntry[];
    onChange: (next: AllergyEntry[]) => void;
    disabled?: boolean;
}) {
    const [draft, setDraft] = useState("");
    const [severity, setSeverity] = useState<AllergySeverity>("Mild");
    const [notice, setNotice] = useState("");

    const add = () => {
        if (disabled) return;

        const name = draft.trim();
        if (name === "") return;

        // Case-insensitive duplicate guard: without it, Enter on an
        // already-listed allergen would look like a no-op with no explanation.
        if (
            value.some(
                (entry) => entry.name.toLowerCase() === name.toLowerCase()
            )
        ) {
            setNotice(`"${name}" is already on the list.`);
            return;
        }

        onChange([...value, { name, severity }]);
        setDraft("");
        setSeverity("Mild");
        setNotice("");
    };

    const removeAt = (index: number) =>
        onChange(value.filter((_, rowIndex) => rowIndex !== index));

    const handleKeyDown = (
        event: React.KeyboardEvent<HTMLInputElement>
    ) => {
        if (event.key === "Enter") {
            event.preventDefault();
            add();
            return;
        }

        // Standard tag-input affordance: Backspace on an empty draft takes
        // the last capsule off.
        if (event.key === "Backspace" && draft === "" && value.length > 0) {
            removeAt(value.length - 1);
        }
    };

    return (
        <div
            className={`${SHELL} ${disabled ? SHELL_DISABLED : ""}`}
            aria-disabled={disabled}
        >
            {value.length > 0 && (
                <div className="mb-1.5 flex flex-wrap gap-1.5">
                    {value.map((entry, index) => (
                        <Capsule
                            key={`${entry.name}-${index}`}
                            onRemove={() => removeAt(index)}
                            removeLabel={`Remove ${entry.name}`}
                        >
                            <span
                                title={entry.name}
                                className="min-w-0 truncate font-semibold"
                            >
                                {entry.name}
                            </span>

                            <span
                                title={SEVERITY_LABEL[entry.severity] ?? entry.severity}
                                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                                    SEVERITY_BADGE[entry.severity] ??
                                    UNKNOWN_SEVERITY_BADGE
                                }`}
                            >
                                {SEVERITY_LABEL[entry.severity] ??
                                    entry.severity}
                            </span>
                        </Capsule>
                    ))}
                </div>
            )}

            <DraftRow
                draft={draft}
                disabled={disabled}
                placeholder={
                    value.length > 0 ? "Add another…" : "e.g. Peanuts, then Enter"
                }
                onDraftChange={(next) => {
                    setDraft(next);
                    if (notice) setNotice("");
                }}
                onKeyDown={handleKeyDown}
                onAdd={add}
                aside={
                    <select
                        value={severity}
                        disabled={disabled}
                        onChange={(event) =>
                            setSeverity(
                                event.target.value as AllergySeverity
                            )
                        }
                        aria-label="Severity for the next allergen"
                        title="Severity for the next allergen"
                        className="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 outline-none transition hover:border-amber-300 disabled:opacity-60"
                    >
                        {ALLERGY_SEVERITY.map((option) => (
                            <option key={option} value={option}>
                                {SEVERITY_LABEL[option]}
                            </option>
                        ))}
                    </select>
                }
            />

            {notice && (
                <p className="mt-1.5 text-[10px] font-medium text-red-500">
                    {notice}
                </p>
            )}
        </div>
    );
}

/** Intolerance capsules — plain strings, so the shell is just input + list. */
export function IntoleranceTagField({
    value,
    onChange,
    disabled = false,
}: {
    value: string[];
    onChange: (next: string[]) => void;
    disabled?: boolean;
}) {
    const [draft, setDraft] = useState("");
    const [notice, setNotice] = useState("");

    const add = () => {
        if (disabled) return;

        const item = draft.trim();
        if (item === "") return;

        if (
            value.some(
                (existing) =>
                    existing.toLowerCase() === item.toLowerCase()
            )
        ) {
            setNotice(`"${item}" is already on the list.`);
            return;
        }

        onChange([...value, item]);
        setDraft("");
        setNotice("");
    };

    const removeAt = (index: number) =>
        onChange(value.filter((_, rowIndex) => rowIndex !== index));

    const handleKeyDown = (
        event: React.KeyboardEvent<HTMLInputElement>
    ) => {
        if (event.key === "Enter") {
            event.preventDefault();
            add();
            return;
        }

        if (event.key === "Backspace" && draft === "" && value.length > 0) {
            removeAt(value.length - 1);
        }
    };

    return (
        <div
            className={`${SHELL} ${disabled ? SHELL_DISABLED : ""}`}
            aria-disabled={disabled}
        >
            {value.length > 0 && (
                <div className="mb-1.5 flex flex-wrap gap-1.5">
                    {value.map((item, index) => (
                        <Capsule
                            key={`${item}-${index}`}
                            onRemove={() => removeAt(index)}
                            removeLabel={`Remove ${item}`}
                        >
                            <span
                                title={item}
                                className="min-w-0 truncate font-semibold"
                            >
                                {item}
                            </span>
                        </Capsule>
                    ))}
                </div>
            )}

            <DraftRow
                draft={draft}
                disabled={disabled}
                placeholder={
                    value.length > 0
                        ? "Add another…"
                        : "e.g. Lactose, then Enter"
                }
                onDraftChange={(next) => {
                    setDraft(next);
                    if (notice) setNotice("");
                }}
                onKeyDown={handleKeyDown}
                onAdd={add}
            />

            {notice && (
                <p className="mt-1.5 text-[10px] font-medium text-red-500">
                    {notice}
                </p>
            )}
        </div>
    );
}
