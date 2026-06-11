"use client";

import { useEffect, useState } from "react";
import CerrarSesion from "@/components/CerrarSesion";

type Mensaje = { tipo: "ok" | "error"; texto: string } | null;

export default function CuentaPage() {
  const [emailActual, setEmailActual] = useState("");
  const [emailNuevo, setEmailNuevo] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [passwordActual, setPasswordActual] = useState("");

  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje>(null);

  useEffect(() => {
    fetch("/api/cuenta")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.email) {
          setEmailActual(d.email);
          setEmailNuevo(d.email);
        }
      })
      .catch(() => {});
  }, []);

  async function guardar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMensaje(null);

    if (passwordNueva && passwordNueva !== confirmar) {
      setMensaje({ tipo: "error", texto: "Las contraseñas nuevas no coinciden" });
      return;
    }

    if (!passwordActual) {
      setMensaje({ tipo: "error", texto: "Ingresa tu contraseña actual" });
      return;
    }

    setCargando(true);

    const response = await fetch("/api/cuenta", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailNuevo, passwordNueva, passwordActual }),
    });

    const data = await response.json();
    setCargando(false);

    if (!response.ok) {
      setMensaje({ tipo: "error", texto: data.error || "No se pudo guardar" });
      return;
    }

    setEmailActual(data.email);
    setPasswordNueva("");
    setConfirmar("");
    setPasswordActual("");
    setMensaje({
      tipo: "ok",
      texto: data.cambioEmail
        ? "Listo. La próxima vez inicia sesión con tu nuevo correo."
        : "Cambios guardados.",
    });
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-white">
      <section className="mx-auto max-w-2xl space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
              Administrador
            </p>
            <h1 className="mt-2 text-3xl font-bold">Mi cuenta</h1>
            <p className="mt-2 text-neutral-400">
              Cambia tu correo y contraseña de acceso.
            </p>
          </div>

          <CerrarSesion />
        </div>

        <form
          onSubmit={guardar}
          className="space-y-5 rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
        >
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <p className="text-sm text-neutral-400">Correo actual</p>
            <p className="mt-1 font-semibold">{emailActual || "—"}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-neutral-300">Nuevo correo</label>
            <input
              value={emailNuevo}
              onChange={(e) => setEmailNuevo(e.target.value)}
              type="email"
              autoComplete="off"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-neutral-300">
              Nueva contraseña
            </label>
            <input
              value={passwordNueva}
              onChange={(e) => setPasswordNueva(e.target.value)}
              type="password"
              autoComplete="new-password"
              placeholder="Déjalo vacío para no cambiarla"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-neutral-300">
              Confirmar nueva contraseña
            </label>
            <input
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              type="password"
              autoComplete="new-password"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
            />
          </div>

          <div className="space-y-2 border-t border-neutral-800 pt-4">
            <label className="text-sm text-neutral-300">
              Tu contraseña actual (para confirmar)
            </label>
            <input
              value={passwordActual}
              onChange={(e) => setPasswordActual(e.target.value)}
              type="password"
              autoComplete="current-password"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
            />
          </div>

          {mensaje && (
            <p
              className={`rounded-xl px-4 py-3 text-sm ${
                mensaje.tipo === "ok"
                  ? "bg-green-950/40 text-green-300"
                  : "bg-red-950/40 text-red-300"
              }`}
            >
              {mensaje.texto}
            </p>
          )}

          <button
            disabled={cargando}
            className="rounded-xl bg-white px-5 py-3 font-semibold text-black disabled:opacity-50"
          >
            {cargando ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </section>
    </main>
  );
}
