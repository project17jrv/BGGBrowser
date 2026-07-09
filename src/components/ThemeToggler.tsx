"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggler() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.theme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.theme = "light";
    }
  };

  if (!mounted) {
    return (
      <div className="h-8 w-8 rounded-lg bg-secondary/50 animate-pulse" />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="flex h-8 w-8 items-center justify-center rounded-lg border text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-300 shadow-sm"
      title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      aria-label="Alternar tema oscuro"
    >
      {theme === "dark" ? (
        <Sun size={14} className="stroke-[2.5] text-amber-500 animate-in spin-in-12 duration-300" />
      ) : (
        <Moon size={14} className="stroke-[2.5] text-indigo-500 animate-in spin-in-12 duration-300" />
      )}
    </button>
  );
}
