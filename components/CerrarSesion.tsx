"use client";

import { useRouter } from "next/navigation";

export default function CerrarSesion() {
  const router = useRouter();

  async function salir() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={salir}
      className="rounded-xl border border-neutral-700 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
    >
      Cerrar sesión
    </button>
  );
}
