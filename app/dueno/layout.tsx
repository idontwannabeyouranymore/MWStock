import CerrarSesion from "@/components/CerrarSesion";

export default function DuenoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
            Plataforma
          </p>
          <h1 className="text-xl font-bold">MWStock · Dueño</h1>
        </div>

        <CerrarSesion />
      </header>

      <div>{children}</div>
    </div>
  );
}
