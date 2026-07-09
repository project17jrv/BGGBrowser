"use client";

import { useState } from "react";
import { updateGameFinancials } from "@/lib/actions";
import { useRouter } from "next/navigation";

interface QuickStatusButtonProps {
  bggId: number;
  newStatus: string;
  label: string;
  className?: string;
}

export default function QuickStatusButton({ bggId, newStatus, label, className }: QuickStatusButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleClick = async () => {
    setLoading(true);
    const res = await updateGameFinancials(bggId, { status: newStatus });
    setLoading(false);

    if (res.success) {
      router.refresh();
    } else {
      alert("Error al actualizar el estado: " + res.error);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={className || "rounded-lg bg-primary px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white shadow hover:bg-primary/95 transition-all disabled:opacity-50"}
    >
      {loading ? "..." : label}
    </button>
  );
}
