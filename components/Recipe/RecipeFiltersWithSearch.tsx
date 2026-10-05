import { Search } from "lucide-react";
import { Dispatch, useState } from "react";

export default function RecipeFiltersWithSearch({search, setSearch} : {search: string, setSearch: Dispatch<React.SetStateAction<string>>}) {

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
                        placeholder="Search recipes or ingredients..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:bg-white focus:ring-2 focus:ring-amber-100"
                    />
                </div>
            </div>
        </section>
    );
}