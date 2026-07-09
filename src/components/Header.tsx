"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dices, Settings, Trophy, Library } from "lucide-react";
import ThemeToggler from "./ThemeToggler";

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md transition-all duration-300">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Left Side: Branding & Navigation */}
        <div className="flex items-center gap-8">
          {/* Branding & Logo */}
          <Link href="/" className="flex items-center gap-2.5 group mr-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-indigo-400 text-white shadow-premium transition-all duration-300 group-hover:rotate-12 group-hover:scale-105">
              <Dices size={20} className="stroke-[2.5]" />
            </div>
            <span className="font-heading text-lg font-bold tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary">
              BGG <span className="font-normal text-muted-foreground font-sans text-sm">Explorer</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            <Link
              href="/"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-200 ${
                pathname === "/" 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Library size={14} />
              <span>Mi Colección</span>
            </Link>
            <Link
              href="/ranking"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-200 ${
                pathname === "/ranking" 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Trophy size={14} />
              <span>Top Ranking BGG</span>
            </Link>
          </nav>
        </div>

        {/* Right Side: Navigation & Admin */}
        <div className="flex items-center gap-4">
          {/* Mobile navigation shortcuts */}
          <nav className="flex md:hidden items-center gap-1 mr-2">
            <Link
              href="/"
              className={`rounded-lg p-1.5 transition-all duration-200 ${
                pathname === "/" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Mi Colección"
            >
              <Library size={16} />
            </Link>
            <Link
              href="/ranking"
              className={`rounded-lg p-1.5 transition-all duration-200 ${
                pathname === "/ranking" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Top Ranking BGG"
            >
              <Trophy size={16} />
            </Link>
          </nav>

          <ThemeToggler />

          <Link
            href="/admin"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
              pathname === "/admin"
                ? "bg-secondary text-foreground font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <Settings size={14} />
            <span>Admin Sync</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
