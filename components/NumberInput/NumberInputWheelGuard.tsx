"use client";

import { useEffect } from "react";

/**
 * Stops the mouse wheel from stepping a focused `<input type="number">`.
 *
 * Hiding the spinner (see app/globals.css) removes the click-to-step buttons,
 * but the browsers still increment or decrement a number field on wheel while
 * it holds focus. That is built-in behaviour with no CSS hook, so the default
 * action is cancelled here instead.
 *
 * A single listener covers the whole app — including inputs inside modals that
 * are not mounted yet — so a new number field needs no wiring of its own. Only
 * a wheel event whose target is the focused number input is cancelled: the
 * page still scrolls normally when the pointer merely passes over a field, and
 * when a number field has focus but the pointer is elsewhere.
 *
 * The listener must be non-passive. React registers its own onWheel handlers
 * passively at the root, where preventDefault is ignored with a console
 * warning, which is why this is a document listener rather than a prop.
 */
export default function NumberInputWheelGuard() {
    useEffect(() => {
        const cancelStep = (event: WheelEvent) => {
            const target = event.target;

            if (!(target instanceof HTMLInputElement)) return;
            if (target.type !== "number") return;

            // An unfocused field does not step on wheel, so the wheel is left
            // to the page in that case.
            if (document.activeElement !== target) return;

            event.preventDefault();
        };

        document.addEventListener("wheel", cancelStep, { passive: false });

        return () => document.removeEventListener("wheel", cancelStep);
    }, []);

    return null;
}
