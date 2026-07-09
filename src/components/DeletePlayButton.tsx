"use client";

import { useState } from "react";
import { deletePlaySession } from "@/lib/actions";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface DeletePlayButtonProps {
  id: string;
}

export default function DeletePlayButton({ id }: DeletePlayButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm("¿Seguro que deseas eliminar esta partida registrada?")) return;

    setLoading(true);
    const res = await deletePlaySession(id);
    setLoading(false);

    if (res.success) {
      router.refresh();
    } else {
      alert("Error al eliminar la partida: " + res.error);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="h-7 w-7 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-transparent transition-all disabled:opacity-50"
      title="Eliminar partida"
    >
      <Trash2 size={12} />
    </button>
  );
}
