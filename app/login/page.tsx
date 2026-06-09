"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("admin@mwstock.com");
  const [password, setPassword] = useState("admin123");
  const [cargando, setCargando] = useState(false);

  async function iniciarSesion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCargando(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    setCargando(false);

    if (!response.ok) {
      alert("Credenciales incorrectas");
      return;
    }

    router.push("/administrador");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-white">
      <form
        onSubmit={iniciarSesion}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-6"
      >
        <h1 className="text-3xl font-bold">MWStock</h1>

        <p className="text-neutral-400">
          Inicia sesión para administrar la tienda.
        </p>

        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Correo"
          className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none focus:border-white"
        />

        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          placeholder="Contraseña"
          className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none focus:border-white"
        />

        <button
          disabled={cargando}
          className="w-full rounded-xl bg-white px-5 py-3 font-semibold text-black disabled:opacity-50"
        >
          {cargando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}