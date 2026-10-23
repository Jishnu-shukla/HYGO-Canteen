"use client";

/**
 * The switch a cell of the screen-access matrix holds.
 *
 * A button with `role="switch"` rather than a checkbox: the matrix is a grid
 * of on/off cells, and a switch reads as "this screen is open for this role"
 * without the checkbox's tick box competing with the table's density.
 *
 * The knob is drawn in CSS — the same shape on every cell — so the grid never
 * breaks its alignment.
 */
export default function AccessToggle({
    checked,
    disabled = false,
    label,
    onChange,
}: {
    checked: boolean;
    /** Locked cells — Admin's, or the whole grid in read-only mode. */
    disabled?: boolean;
    /** What the cell does, for screen readers. */
    label: string;
    onChange: (next: boolean) => void;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 ${
                checked
                    ? "bg-amber-600"
                    : "bg-slate-200"
            } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
        >
            <span
                aria-hidden="true"
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-150 ${
                    checked ? "translate-x-[18px]" : "translate-x-[3px]"
                }`}
            />
        </button>
    );
}
