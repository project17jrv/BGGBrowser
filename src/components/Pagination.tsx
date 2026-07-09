"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
}

export default function Pagination({ currentPage, totalPages }: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (totalPages <= 1) return null;

  const navigateToPage = (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > totalPages || pageNumber === currentPage) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", pageNumber.toString());
    
    router.push(`${pathname}?${params.toString()}`);
  };

  // Generate pagination page numbers range (e.g. show 1, 2, 3... totalPages)
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <nav className="flex items-center justify-center gap-2 mt-8 text-xs font-semibold select-none">
      
      {/* Previous Page Button */}
      <button
        onClick={() => navigateToPage(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex h-9 w-9 items-center justify-center rounded-xl border bg-card text-foreground shadow-sm transition-all duration-300 hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed hover:border-primary/20"
        aria-label="Previous Page"
      >
        <ChevronLeft size={16} />
      </button>

      {/* Page Numbers */}
      {pages[0] > 1 && (
        <>
          <button
            onClick={() => navigateToPage(1)}
            className={`flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm transition-all duration-300 ${
              currentPage === 1
                ? "bg-primary border-primary text-white font-bold"
                : "bg-card text-foreground hover:bg-secondary hover:border-primary/20"
            }`}
          >
            1
          </button>
          {pages[0] > 2 && <span className="text-muted-foreground px-1 font-bold">...</span>}
        </>
      )}

      {pages.map((page) => (
        <button
          key={page}
          onClick={() => navigateToPage(page)}
          className={`flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm transition-all duration-300 ${
            currentPage === page
              ? "bg-primary border-primary text-white font-bold"
              : "bg-card text-foreground hover:bg-secondary hover:border-primary/20"
          }`}
        >
          {page}
        </button>
      ))}

      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && <span className="text-muted-foreground px-1 font-bold">...</span>}
          <button
            onClick={() => navigateToPage(totalPages)}
            className={`flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm transition-all duration-300 ${
              currentPage === totalPages
                ? "bg-primary border-primary text-white font-bold"
                : "bg-card text-foreground hover:bg-secondary hover:border-primary/20"
            }`}
          >
            {totalPages}
          </button>
        </>
      )}

      {/* Next Page Button */}
      <button
        onClick={() => navigateToPage(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex h-9 w-9 items-center justify-center rounded-xl border bg-card text-foreground shadow-sm transition-all duration-300 hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed hover:border-primary/20"
        aria-label="Next Page"
      >
        <ChevronRight size={16} />
      </button>

    </nav>
  );
}
