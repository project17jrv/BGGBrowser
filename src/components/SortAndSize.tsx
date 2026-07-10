"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ArrowUpDown, ListFilter } from "lucide-react";

interface SortAndSizeProps {
  basePath?: string;
}

export default function SortAndSize({ basePath }: SortAndSizeProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sortBy = searchParams.get("sortBy") || "rank";
  const sortOrder = searchParams.get("sortOrder") || (sortBy === "averageRating" ? "desc" : "asc");
  const size = searchParams.get("size") || "12";

  const handleSortChange = (newSort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sortBy", newSort);
    // Sensible defaults for order
    if (newSort === "averageRating" || newSort === "complexityWeight") {
      params.set("sortOrder", "desc");
    } else {
      params.set("sortOrder", "asc");
    }
    params.set("page", "1"); // reset page
    const targetPath = basePath || pathname;
    router.push(`${targetPath}?${params.toString()}`);
  };

  const handleOrderToggle = () => {
    const params = new URLSearchParams(searchParams.toString());
    const nextOrder = sortOrder === "asc" ? "desc" : "asc";
    params.set("sortOrder", nextOrder);
    params.set("page", "1");
    const targetPath = basePath || pathname;
    router.push(`${targetPath}?${params.toString()}`);
  };

  const handleSizeChange = (newSize: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("size", newSize);
    params.set("page", "1");
    const targetPath = basePath || pathname;
    router.push(`${targetPath}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-muted-foreground">
      
      {/* Sorting Dropdown */}
      <div className="flex items-center gap-1.5 rounded-xl border bg-card px-3 py-2 shadow-sm hover:border-primary/20 transition-all duration-300">
        <ArrowUpDown size={14} className="text-primary" />
        <span>Ordenar por:</span>
        <select
          value={sortBy}
          onChange={(e) => handleSortChange(e.target.value)}
          className="cursor-pointer bg-transparent font-bold text-foreground outline-none border-none pr-1"
        >
          <option value="rank">Ranking BGG</option>
          <option value="averageRating">Valoración</option>
          <option value="name">Nombre</option>
          <option value="yearPublished">Año</option>
          <option value="complexityWeight">Complejidad</option>
        </select>
        
        {/* Toggle Order Button */}
        <button
          onClick={handleOrderToggle}
          className="ml-1 pl-1 border-l text-[10px] uppercase font-black hover:text-primary tracking-wider transition-colors duration-200"
          title="Invertir dirección"
        >
          {sortOrder === "asc" ? "Asc" : "Desc"}
        </button>
      </div>
 
      {/* Page Size Dropdown */}
      <div className="flex items-center gap-1.5 rounded-xl border bg-card px-3 py-2 shadow-sm hover:border-primary/20 transition-all duration-300">
        <ListFilter size={14} className="text-primary" />
        <span>Juegos por página:</span>
        <select
          value={size}
          onChange={(e) => handleSizeChange(e.target.value)}
          className="cursor-pointer bg-transparent font-bold text-foreground outline-none border-none"
        >
          <option value="4">4 juegos</option>
          <option value="8">8 juegos</option>
          <option value="12">12 juegos</option>
          <option value="24">24 juegos</option>
          <option value="48">48 juegos</option>
        </select>
      </div>
 
    </div>
  );
}
