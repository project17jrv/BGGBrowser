"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";

export default function SearchInput() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [value, setValue] = useState(searchParams.get("search") || "");

  // Debounce the search input URL updates
  useEffect(() => {
    const currentSearch = searchParams.get("search") || "";
    if (value === currentSearch) {
      return;
    }

    const delayDebounce = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      
      // Reset page to 1 on new search
      params.set("page", "1");

      if (value) {
        params.set("search", value);
      } else {
        params.delete("search");
      }

      router.push(`${pathname}?${params.toString()}`);
    }, 350); // 350ms debounce

    return () => clearTimeout(delayDebounce);
  }, [value, pathname, router, searchParams]);

  // Sync state if URL changes elsewhere
  useEffect(() => {
    setValue(searchParams.get("search") || "");
  }, [searchParams]);

  return (
    <div className="relative w-full max-w-md">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
        <Search size={16} className="stroke-[2.5]" />
      </div>
      
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar juego por nombre..."
        className="w-full rounded-2xl border bg-card py-2.5 pl-10 pr-9 text-xs text-foreground placeholder-muted-foreground outline-none shadow-sm transition-all duration-300 hover:border-primary/20 focus:border-primary focus:ring-1 focus:ring-primary"
      />

      {value && (
        <button
          onClick={() => setValue("")}
          className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground hover:text-foreground transition-colors duration-200"
          aria-label="Clear search"
        >
          <X size={14} className="stroke-[2.5]" />
        </button>
      )}
    </div>
  );
}
