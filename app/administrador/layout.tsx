import AdminSidebar from "@/components/AdminSidebar";
import { obtenerTiendaDeSesion, obtenerRol } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tienda = await obtenerTiendaDeSesion();
  const rol = await obtenerRol();

  // Si la tienda está suspendida, bloquea el panel.
  if (tienda && !tienda.activa) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-white">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold">Tienda suspendida</h1>
          <p className="mt-2 text-neutral-400">
            Tu tienda está temporalmente desactivada. Contacta al administrador
            de la plataforma.
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 md:flex">
      <AdminSidebar rol={rol} />

      <div className="min-w-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}
