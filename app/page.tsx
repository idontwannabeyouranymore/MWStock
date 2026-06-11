import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center px-6">
      <section className="max-w-md text-center space-y-5">
        <p className="text-sm uppercase tracking-[0.3em] text-neutral-400">
          Plataforma
        </p>

        <h1 className="text-4xl font-bold">MWStock</h1>

        <p className="text-neutral-300">
          Inventario, catálogo y punto de venta para tu tienda de ropa.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/login"
            className="rounded-xl bg-white px-6 py-3 font-semibold text-black"
          >
            Entrar
          </Link>
        </div>
      </section>
    </main>
  );
}
