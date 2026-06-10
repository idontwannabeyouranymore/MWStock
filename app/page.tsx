import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-6">
      <section className="max-w-md text-center space-y-5">
        <p className="text-sm uppercase tracking-[0.3em] text-neutral-400">
          Inventario + Catálogo
        </p>

        <h1 className="text-4xl font-bold">
          Tienda Inventario
        </h1>

        <p className="text-neutral-300">
          Administra productos, variantes y stock desde el celular.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/tienda/mwstock"
            className="rounded-xl bg-white px-6 py-3 font-semibold text-black"
          >
            Entrar al catálogo
          </Link>

          <Link
            href="/login"
            className="rounded-xl border border-neutral-700 px-6 py-3 font-semibold text-white"
          >
            Ir al administrador
          </Link>
        </div>
      </section>
    </main>
  );
}