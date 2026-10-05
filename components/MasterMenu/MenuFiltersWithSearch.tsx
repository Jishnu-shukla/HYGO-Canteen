import { Search } from "lucide-react";
import { Dispatch } from "react";
import { MENU_STATUS_FILTERS, MenuStatusFilter } from "./menuStatusFilter";

export default function MenuFiltersWithSearch({
    search,
    setSearch,
    status,
    setStatus,
    counts,
}: {
    search: string;
    setSearch: Dispatch<React.SetStateAction<string>>;
    status: MenuStatusFilter;
    setStatus: Dispatch<React.SetStateAction<MenuStatusFilter>>;
    counts: Record<MenuStatusFilter, number>;
}) {
    return (
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full lg:max-w-md">
                    <Search
                        size={17}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search menu items..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:bg-white focus:ring-2 focus:ring-amber-100"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {MENU_STATUS_FILTERS.map((filter) => {
                        const isActive = status === filter.key;

                        return (
                            <button
                                key={filter.key}
                                type="button"
                                onClick={() => setStatus(filter.key)}
                                className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition ${
                                    isActive
                                        ? "border-amber-600 bg-amber-600 text-white shadow-sm"
                                        : "border-amber-200 bg-white text-amber-700 hover:border-amber-400 hover:bg-amber-50"
                                }`}
                            >
                                {filter.label} ({counts[filter.key]})
                            </button>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
