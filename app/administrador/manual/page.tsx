"use client";

type Paso = { titulo: string; texto: string };

const SECCIONES: { titulo: string; pasos: Paso[] }[] = [
  {
    titulo: "1. Entrar a tu cuenta",
    pasos: [
      {
        titulo: "Inicia sesión",
        texto:
          "Abre la página de MWStock y escribe el correo y la contraseña que te dio el administrador. Al entrar verás directamente el Punto de venta.",
      },
      {
        titulo: "¿Qué puedes ver?",
        texto:
          "Como vendedor solo ves el Punto de venta y tu cuenta. No tienes acceso a inventario, precios de costo ni estadísticas de la tienda.",
      },
    ],
  },
  {
    titulo: "2. Agregar productos a la venta",
    pasos: [
      {
        titulo: "Tocar el producto",
        texto:
          "En la lista, toca el producto y luego la presentación o talla que el cliente quiere. Se agrega al carrito de la derecha.",
      },
      {
        titulo: "Buscar",
        texto:
          "Usa la barra de arriba para buscar por nombre, marca o colección. La lista se filtra mientras escribes.",
      },
      {
        titulo: "Escanear el código de barras",
        texto:
          "Toca el botón 📷 para usar la cámara y apunta al código; el producto se agrega solo. Si tienes un lector físico, haz clic en la barra de búsqueda y escanea: el producto se agrega al carrito.",
      },
    ],
  },
  {
    titulo: "3. Ajustar el carrito",
    pasos: [
      {
        titulo: "Cambiar cantidad",
        texto:
          "Usa los botones − y + de cada producto en el carrito. No puedes pasar del stock disponible.",
      },
      {
        titulo: "Quitar un producto",
        texto: "Toca 'Quitar' en el producto que quieras sacar del carrito.",
      },
    ],
  },
  {
    titulo: "4. Cobrar",
    pasos: [
      {
        titulo: "Elige el método de pago",
        texto: "Efectivo, Tarjeta o Transferencia.",
      },
      {
        titulo: "Efectivo",
        texto:
          "Escribe el monto que te dio el cliente y la app calcula el cambio automáticamente. Da el cambio del fondo de la caja.",
      },
      {
        titulo: "Transferencia",
        texto:
          "Anota la referencia o número de la transferencia en el campo que aparece, para que el administrador pueda confirmarla después.",
      },
      {
        titulo: "Terminar",
        texto:
          "Toca el botón verde 'Cobrar'. Verás el ticket de la venta y el carrito se vacía para la siguiente.",
      },
    ],
  },
  {
    titulo: "5. Ticket y cliente (opcional)",
    pasos: [
      {
        titulo: "Enviar ticket por WhatsApp",
        texto:
          "Si pones el nombre y el teléfono del cliente antes de cobrar, después de la venta podrás enviarle el ticket por WhatsApp con un botón.",
      },
    ],
  },
  {
    titulo: "6. La caja y el dinero",
    pasos: [
      {
        titulo: "Fondo para cambio",
        texto:
          "Al inicio del día el administrador deja un fondo de efectivo para que puedas dar cambio. Lo ves en el aviso de arriba del Punto de venta.",
      },
      {
        titulo: "Aviso de mucho efectivo",
        texto:
          "Si aparece un aviso rojo de que hay demasiado efectivo en la caja, avísale al administrador para que haga un retiro. Por seguridad, el vendedor NO saca dinero de la caja.",
      },
    ],
  },
  {
    titulo: "7. Problemas comunes",
    pasos: [
      {
        titulo: "'Código no encontrado'",
        texto:
          "Significa que ese producto todavía no tiene su código de barras guardado. Búscalo por nombre y avísale al administrador para que lo registre.",
      },
      {
        titulo: "La cámara no abre",
        texto:
          "La primera vez el teléfono pide permiso para usar la cámara: acepta. Si lo rechazaste, actívalo en los ajustes del navegador, o usa un lector físico.",
      },
      {
        titulo: "Cerrar sesión",
        texto:
          "Cuando termines tu turno, entra a 'Mi cuenta' y cierra sesión.",
      },
    ],
  },
];

export default function ManualPage() {
  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-white">
      <section className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
              MWStock
            </p>
            <h1 className="mt-2 text-3xl font-bold">Manual del vendedor</h1>
            <p className="mt-2 text-neutral-400">
              Guía rápida para usar el Punto de venta.
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="rounded-xl bg-white px-4 py-2 font-semibold text-black hover:bg-neutral-200"
          >
            Imprimir
          </button>
        </div>

        <div className="space-y-6">
          {SECCIONES.map((s) => (
            <div
              key={s.titulo}
              className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
            >
              <h2 className="text-xl font-semibold">{s.titulo}</h2>
              <div className="mt-3 space-y-3">
                {s.pasos.map((p) => (
                  <div key={p.titulo}>
                    <p className="font-semibold text-neutral-100">{p.titulo}</p>
                    <p className="text-sm text-neutral-300">{p.texto}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
