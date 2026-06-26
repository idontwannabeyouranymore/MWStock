"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { normalizarModulos } from "@/lib/modulos";
import EscanerCodigo from "@/components/EscanerCodigo";

type Variante = {
  id: string;
  talla: string;
  color: string | null;
  stock: number;
  precio: string | null;
  estado: string;
};

type Producto = {
  id: string;
  nombre: string;
  marca?: string | null;
  codigoBarras?: string | null;
  precio: string;
  estado: string;
  esSet?: boolean;
  imagenes: { url: string }[];
  variantes: Variante[];
  colecciones?: { coleccion: { nombre: string } }[];
};

type SetVenta = {
  id: string;
  nombre: string;
  precio: string;
  imagenes: { url: string }[];
  componentes: { cantidad: number; variante: { stock: number } }[];
};

type ItemCarrito = {
  tipo: "variante" | "set";
  refId: string;
  productoNombre: string;
  talla: string;
  precio: number;
  cantidad: number;
  stock: number;
};

type VentaItem = {
  productoNombre: string;
  talla: string;
  cantidad: number;
  precioUnitario: string;
  subtotal: string;
};

type VentaHecha = {
  id: string;
  total: string;
  metodoPago: string;
  montoRecibido: string | null;
  cambio: string | null;
  referencia: string | null;
  clienteNombre: string | null;
  clienteTelefono: string | null;
  createdAt: string;
  items: VentaItem[];
};

const METODOS = [
  { valor: "EFECTIVO", etiqueta: "Efectivo" },
  { valor: "TARJETA", etiqueta: "Tarjeta" },
  { valor: "TRANSFERENCIA", etiqueta: "Transferencia" },
  { valor: "FIADO", etiqueta: "Fiado" },
];

type ClienteLista = {
  id: string;
  nombre: string;
  telefono: string | null;
  saldoTotal: number;
};

function maxDeSet(set: SetVenta) {
  if (set.componentes.length === 0) return 0;
  return Math.min(
    ...set.componentes.map((c) => Math.floor(c.variante.stock / c.cantidad))
  );
}

export default function POSPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [sets, setSets] = useState<SetVenta[]>([]);
  const [tiendaNombre, setTiendaNombre] = useState("MWStock");
  const [clientesActivo, setClientesActivo] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [escaneandoPOS, setEscaneandoPOS] = useState(false);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);

  const [metodoPago, setMetodoPago] = useState("EFECTIVO");
  const [montoRecibido, setMontoRecibido] = useState("");
  const [referencia, setReferencia] = useState("");
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteTelefono, setClienteTelefono] = useState("");

  const [clientes, setClientes] = useState<ClienteLista[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [creandoCliente, setCreandoCliente] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoTelefono, setNuevoTelefono] = useState("");

  const [procesando, setProcesando] = useState(false);
  const [ventaHecha, setVentaHecha] = useState<VentaHecha | null>(null);

  const cargarProductos = useCallback(async () => {
    const response = await fetch("/api/productos");
    const data: Producto[] = await response.json();
    setProductos(data.filter((p) => p.estado !== "ARCHIVADO" && !p.esSet));
  }, []);

  const cargarSets = useCallback(async () => {
    const response = await fetch("/api/sets");
    if (!response.ok) return;
    const data: SetVenta[] = await response.json();
    if (Array.isArray(data)) setSets(data);
  }, []);

  const cargarClientes = useCallback(async () => {
    const response = await fetch("/api/clientes");
    if (!response.ok) return;
    const data: ClienteLista[] = await response.json();
    if (Array.isArray(data)) setClientes(data);
  }, []);

  useEffect(() => {
    cargarProductos();
    cargarSets();
    cargarClientes();
    fetch("/api/tienda")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.nombre) setTiendaNombre(d.nombre);
        setClientesActivo(normalizarModulos(d?.modulos).clientes);
      })
      .catch(() => {});
  }, [cargarProductos, cargarSets, cargarClientes]);

  async function crearClienteRapido() {
    const nombre = nuevoNombre.trim();
    if (!nombre) return;
    const response = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, telefono: nuevoTelefono }),
    });
    const data = await response.json();
    if (!response.ok) {
      alert(data.error || "No se pudo crear el cliente");
      return;
    }
    await cargarClientes();
    setClienteId(data.id);
    setCreandoCliente(false);
    setNuevoNombre("");
    setNuevoTelefono("");
  }

  function agregarAlCarrito(producto: Producto, variante: Variante) {
    setCarrito((actual) => {
      const existente = actual.find((i) => i.refId === variante.id);
      if (existente) {
        if (existente.cantidad >= variante.stock) return actual;
        return actual.map((i) =>
          i.refId === variante.id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [
        ...actual,
        {
          tipo: "variante",
          refId: variante.id,
          productoNombre: producto.nombre,
          talla: variante.talla,
          precio: Number(variante.precio ?? producto.precio),
          cantidad: 1,
          stock: variante.stock,
        },
      ];
    });
  }

  // Busca un producto por su código de barras y lo agrega al carrito.
  // Sirve tanto para la cámara como para un lector físico (teclado).
  function agregarPorCodigo(codigo: string) {
    const limpio = codigo.trim();
    if (!limpio) return;
    const producto = productos.find(
      (p) => (p.codigoBarras || "").trim() === limpio
    );
    if (!producto) {
      alert(`Código no encontrado: ${limpio}`);
      return;
    }
    const variante =
      producto.variantes.find((v) => v.estado !== "ARCHIVADA" && v.stock > 0) ||
      producto.variantes[0];
    if (!variante) {
      alert(`"${producto.nombre}" no tiene presentaciones.`);
      return;
    }
    if (variante.stock <= 0) {
      alert(`"${producto.nombre}" está agotado.`);
      return;
    }
    agregarAlCarrito(producto, variante);
    setBusqueda("");
  }

  function agregarSetAlCarrito(set: SetVenta) {
    const maxSets = maxDeSet(set);
    if (maxSets < 1) return;
    setCarrito((actual) => {
      const existente = actual.find((i) => i.refId === set.id);
      if (existente) {
        if (existente.cantidad >= maxSets) return actual;
        return actual.map((i) =>
          i.refId === set.id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      }
      return [
        ...actual,
        {
          tipo: "set",
          refId: set.id,
          productoNombre: set.nombre,
          talla: "Set",
          precio: Number(set.precio),
          cantidad: 1,
          stock: maxSets,
        },
      ];
    });
  }

  function cambiarCantidad(refId: string, delta: number) {
    setCarrito((actual) =>
      actual
        .map((i) => {
          if (i.refId !== refId) return i;
          const nueva = i.cantidad + delta;
          return { ...i, cantidad: Math.min(Math.max(nueva, 0), i.stock) };
        })
        .filter((i) => i.cantidad > 0)
    );
  }

  function quitarDelCarrito(refId: string) {
    setCarrito((actual) => actual.filter((i) => i.refId !== refId));
  }

  const total = useMemo(
    () => carrito.reduce((suma, i) => suma + i.precio * i.cantidad, 0),
    [carrito]
  );

  const recibido = Number(montoRecibido) || 0;
  const cambio =
    metodoPago === "EFECTIVO" && montoRecibido !== "" ? recibido - total : null;

  async function cobrar() {
    if (carrito.length === 0) {
      alert("El carrito está vacío");
      return;
    }
    if (metodoPago === "EFECTIVO" && montoRecibido !== "" && recibido < total) {
      alert("El monto recibido es menor al total");
      return;
    }
    if (metodoPago === "FIADO" && !clienteId) {
      alert("Para fiar, selecciona o crea un cliente registrado");
      return;
    }

    setProcesando(true);
    try {
      const response = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: carrito.map((i) =>
            i.tipo === "set"
              ? { tipo: "set", setId: i.refId, cantidad: i.cantidad }
              : { tipo: "variante", varianteId: i.refId, cantidad: i.cantidad }
          ),
          metodoPago,
          montoRecibido:
            metodoPago === "EFECTIVO" || metodoPago === "FIADO"
              ? montoRecibido
              : null,
          referencia:
            metodoPago === "TRANSFERENCIA" ? referencia.trim() || null : null,
          clienteId: clienteId || null,
          clienteNombre,
          clienteTelefono,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo registrar la venta");
      }

      setVentaHecha(data);
      setCarrito([]);
      setMontoRecibido("");
      setReferencia("");
      setClienteNombre("");
      setClienteTelefono("");
      setClienteId("");
      setCreandoCliente(false);
      setNuevoNombre("");
      setNuevoTelefono("");
      setMetodoPago("EFECTIVO");
      await cargarProductos();
      await cargarSets();
      await cargarClientes();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Error al cobrar");
    } finally {
      setProcesando(false);
    }
  }

  function textoTicket(venta: VentaHecha) {
    const lineas = venta.items
      .map(
        (i) =>
          `${i.cantidad}x ${i.productoNombre} (${i.talla}) - $${Number(
            i.subtotal
          ).toFixed(2)}`
      )
      .join("\n");

    let texto = `*${tiendaNombre}*\nTicket de compra\n\n${lineas}\n\nTotal: $${Number(
      venta.total
    ).toFixed(2)}\nPago: ${venta.metodoPago}`;

    if (venta.referencia) {
      texto += `\nRef: ${venta.referencia}`;
    }

    if (venta.montoRecibido) {
      texto += `\nRecibido: $${Number(venta.montoRecibido).toFixed(
        2
      )}\nCambio: $${Number(venta.cambio || 0).toFixed(2)}`;
    }
    texto += `\n\n¡Gracias por tu compra!`;
    return texto;
  }

  function enviarWhatsApp(venta: VentaHecha) {
    const tel = (venta.clienteTelefono || "").replace(/\D/g, "");
    const url = `https://wa.me/${tel}?text=${encodeURIComponent(
      textoTicket(venta)
    )}`;
    window.open(url, "_blank");
  }

  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );
  const setsFiltrados = sets.filter((s) =>
    s.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Agrupa los productos del POS por sección y marca.
  const gruposPOS = (() => {
    const porCol = new Map<string, Map<string, Producto[]>>();
    for (const p of productosFiltrados) {
      const col = p.colecciones?.[0]?.coleccion.nombre || "Sin colección";
      const mar = (p.marca || "").trim() || "Otros";
      if (!porCol.has(col)) porCol.set(col, new Map());
      const mp = porCol.get(col)!;
      if (!mp.has(mar)) mp.set(mar, []);
      mp.get(mar)!.push(p);
    }
    return [...porCol.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([col, mp]) => ({
        col,
        marcas: [...mp.entries()].sort((a, b) => a[0].localeCompare(b[0])),
      }));
  })();

  // --- Pantalla de ticket tras cobrar ---
  if (ventaHecha) {
    return (
      <main className="min-h-screen bg-neutral-950 px-6 py-8 text-white">
        <section className="mx-auto max-w-md space-y-6">
          <div className="rounded-2xl border border-green-700 bg-green-950/30 p-6 text-center">
            <p className="text-2xl font-bold text-green-400">
              ¡Venta registrada!
            </p>
            <p className="mt-1 text-neutral-300">
              Total cobrado: ${Number(ventaHecha.total).toFixed(2)}
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <h2 className="text-lg font-semibold">Ticket</h2>
            <div className="space-y-2">
              {ventaHecha.items.map((item, indice) => (
                <div
                  key={indice}
                  className="flex justify-between text-sm text-neutral-300"
                >
                  <span>
                    {item.cantidad}x {item.productoNombre} ({item.talla})
                  </span>
                  <span>${Number(item.subtotal).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-neutral-800 pt-3 text-sm">
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>${Number(ventaHecha.total).toFixed(2)}</span>
              </div>
              <div className="mt-1 flex justify-between text-neutral-400">
                <span>Pago</span>
                <span>{ventaHecha.metodoPago}</span>
              </div>
              {ventaHecha.referencia && (
                <div className="flex justify-between text-neutral-400">
                  <span>Referencia</span>
                  <span>{ventaHecha.referencia}</span>
                </div>
              )}
              {ventaHecha.montoRecibido && (
                <>
                  <div className="flex justify-between text-neutral-400">
                    <span>Recibido</span>
                    <span>${Number(ventaHecha.montoRecibido).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Cambio</span>
                    <span>${Number(ventaHecha.cambio || 0).toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {ventaHecha.clienteTelefono && (
              <button
                onClick={() => enviarWhatsApp(ventaHecha)}
                className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700"
              >
                Enviar ticket por WhatsApp
              </button>
            )}
            <button
              onClick={() => setVentaHecha(null)}
              className="rounded-xl bg-white px-5 py-3 font-semibold text-black"
            >
              Nueva venta
            </button>
          </div>
        </section>
      </main>
    );
  }

  // --- Pantalla principal del POS ---
  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-white">
      <section className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Administrador
          </p>
          <h1 className="mt-2 text-3xl font-bold">Punto de venta</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Productos y sets */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const coincide = productos.find(
                      (p) => (p.codigoBarras || "").trim() === busqueda.trim()
                    );
                    if (coincide) {
                      e.preventDefault();
                      agregarPorCodigo(busqueda);
                    }
                  }
                }}
                placeholder="Buscar o escanear..."
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
              />
              <button
                type="button"
                onClick={() => setEscaneandoPOS(true)}
                title="Escanear código de barras"
                className="flex-shrink-0 rounded-xl bg-neutral-800 px-4 py-3 text-sm font-semibold hover:bg-neutral-700"
              >
                📷
              </button>
            </div>

            {escaneandoPOS && (
              <EscanerCodigo
                onDetectado={(codigo) => {
                  setEscaneandoPOS(false);
                  agregarPorCodigo(codigo);
                }}
                onCerrar={() => setEscaneandoPOS(false)}
              />
            )}

            {setsFiltrados.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
                  Sets
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {setsFiltrados.map((set) => {
                    const max = maxDeSet(set);
                    const agotado = max < 1;
                    return (
                      <article
                        key={set.id}
                        className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4"
                      >
                        <div className="flex gap-3">
                          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-800">
                            {set.imagenes[0] ? (
                              <img
                                src={set.imagenes[0].url}
                                alt={set.nombre}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div>
                            <h3 className="font-semibold leading-tight">
                              {set.nombre}
                            </h3>
                            <p className="text-sm text-neutral-400">
                              ${Number(set.precio).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <button
                          disabled={agotado}
                          onClick={() => agregarSetAlCarrito(set)}
                          className={`mt-3 w-full rounded-lg px-3 py-2 text-sm font-semibold ${
                            agotado
                              ? "cursor-not-allowed bg-neutral-800 text-neutral-600"
                              : "bg-white text-black hover:bg-neutral-200"
                          }`}
                        >
                          {agotado ? "Agotado" : `Agregar set (${max} disp.)`}
                        </button>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}

            {productosFiltrados.length === 0 && setsFiltrados.length === 0 ? (
              <p className="rounded-xl border border-neutral-800 p-4 text-neutral-400">
                No hay productos.
              </p>
            ) : (
              <div className="space-y-6">
                {gruposPOS.map((grupo) => (
                  <div key={grupo.col} className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-300">
                      {grupo.col}
                    </h3>
                    {grupo.marcas.map(([marca, prods]) => (
                      <div key={marca} className="space-y-2">
                        {grupo.marcas.length > 1 && (
                          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                            {marca}
                          </p>
                        )}
                        <div className="grid gap-3 sm:grid-cols-2">
                          {prods.map((producto) => {
                            const tallas = producto.variantes.filter(
                              (v) => v.estado !== "ARCHIVADA"
                            );
                            return (
                    <article
                      key={producto.id}
                      className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4"
                    >
                      <div className="flex gap-3">
                        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-800">
                          {producto.imagenes[0] ? (
                            <img
                              src={producto.imagenes[0].url}
                              alt={producto.nombre}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div>
                          <h3 className="font-semibold leading-tight">
                            {producto.nombre}
                          </h3>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {tallas.map((variante) => {
                          const agotada = variante.stock <= 0;
                          const precioV = Number(
                            variante.precio ?? producto.precio
                          );
                          return (
                            <button
                              key={variante.id}
                              disabled={agotada}
                              onClick={() =>
                                agregarAlCarrito(producto, variante)
                              }
                              className={`rounded-lg px-3 py-2 text-left text-sm font-semibold ${
                                agotada
                                  ? "cursor-not-allowed bg-neutral-800 text-neutral-600"
                                  : "bg-white text-black hover:bg-neutral-200"
                              }`}
                            >
                              {variante.talla} · ${precioV.toFixed(0)}{" "}
                              <span className="text-xs font-normal">
                                ({variante.stock})
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </article>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Carrito + cobro */}
          <div className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <h2 className="text-xl font-semibold">Carrito</h2>

            {carrito.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Toca un producto o set para agregarlo.
              </p>
            ) : (
              <div className="space-y-3">
                {carrito.map((item) => (
                  <div
                    key={`${item.tipo}-${item.refId}`}
                    className="rounded-xl border border-neutral-800 bg-neutral-950 p-3"
                  >
                    <div className="flex justify-between gap-2">
                      <p className="text-sm font-semibold">
                        {item.productoNombre}{" "}
                        <span className="text-neutral-400">
                          ({item.talla})
                        </span>
                      </p>
                      <button
                        onClick={() => quitarDelCarrito(item.refId)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Quitar
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => cambiarCantidad(item.refId, -1)}
                          className="h-8 w-8 rounded-lg bg-neutral-800 font-bold"
                        >
                          −
                        </button>
                        <span className="w-6 text-center">{item.cantidad}</span>
                        <button
                          onClick={() => cambiarCantidad(item.refId, 1)}
                          disabled={item.cantidad >= item.stock}
                          className="h-8 w-8 rounded-lg bg-neutral-800 font-bold disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                      <p className="font-semibold">
                        ${(item.precio * item.cantidad).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between border-t border-neutral-800 pt-3 text-lg font-bold">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Método de pago</label>
              <div className="grid grid-cols-2 gap-2">
                {METODOS.filter(
                  (m) => clientesActivo || m.valor !== "FIADO"
                ).map((metodo) => (
                  <button
                    key={metodo.valor}
                    onClick={() => setMetodoPago(metodo.valor)}
                    className={`rounded-lg px-2 py-2 text-sm font-semibold ${
                      metodoPago === metodo.valor
                        ? metodo.valor === "FIADO"
                          ? "bg-amber-500 text-black"
                          : "bg-white text-black"
                        : "bg-neutral-800 text-neutral-300"
                    }`}
                  >
                    {metodo.etiqueta}
                  </button>
                ))}
              </div>
            </div>

            {metodoPago === "TRANSFERENCIA" && (
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">
                  Referencia / # de transacción
                </label>
                <input
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Folio o referencia de la transferencia"
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
                />
                <p className="text-xs text-neutral-500">
                  Mientras conectamos Mercado Pago, anota aquí la referencia para
                  conciliar después.
                </p>
              </div>
            )}

            {(metodoPago === "EFECTIVO" || metodoPago === "FIADO") && (
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">
                  {metodoPago === "FIADO"
                    ? "Enganche (opcional)"
                    : "Monto recibido"}
                </label>
                <input
                  value={montoRecibido}
                  onChange={(e) => setMontoRecibido(e.target.value)}
                  type="number"
                  min="0"
                  placeholder="0.00"
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
                />
                {cambio !== null && montoRecibido !== "" && (
                  <p
                    className={`text-sm font-semibold ${
                      cambio < 0 ? "text-red-400" : "text-green-400"
                    }`}
                  >
                    {cambio < 0
                      ? `Faltan $${Math.abs(cambio).toFixed(2)}`
                      : `Cambio: $${cambio.toFixed(2)}`}
                  </p>
                )}
                {metodoPago === "FIADO" && recibido > 0 && (
                  <p className="text-sm font-semibold text-amber-400">
                    Quedará a deber: $
                    {Math.max(0, total - recibido).toFixed(2)}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2 border-t border-neutral-800 pt-3">
              <label className="text-sm text-neutral-300">
                Cliente{" "}
                {clientesActivo && metodoPago === "FIADO" ? (
                  <span className="text-amber-400">(requerido para fiar)</span>
                ) : (
                  "(opcional)"
                )}
              </label>

              {clientesActivo && (
                <>
              {/* Selector de cliente registrado */}
              <div className="flex gap-2">
                <select
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-white outline-none focus:border-white"
                >
                  <option value="">— Cliente sin registrar —</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                      {c.saldoTotal > 0
                        ? ` · debe $${c.saldoTotal.toFixed(2)}`
                        : ""}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setCreandoCliente((v) => !v)}
                  className="flex-shrink-0 rounded-xl bg-neutral-800 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-700"
                >
                  {creandoCliente ? "✕" : "+ Nuevo"}
                </button>
              </div>

              {/* Alta rápida de cliente */}
              {creandoCliente && (
                <div className="space-y-2 rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                  <input
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                    placeholder="Nombre del cliente"
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none focus:border-white"
                  />
                  <input
                    value={nuevoTelefono}
                    onChange={(e) => setNuevoTelefono(e.target.value)}
                    placeholder="WhatsApp (ej. 5213312345678)"
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-white outline-none focus:border-white"
                  />
                  <button
                    type="button"
                    onClick={crearClienteRapido}
                    className="w-full rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-neutral-200"
                  >
                    Crear y seleccionar
                  </button>
                </div>
              )}
                </>
              )}

              {/* Datos sueltos para el ticket (solo si no hay cliente registrado) */}
              {!clienteId && (
                <>
                  <input
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    placeholder="Nombre (para el ticket)"
                    className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-2 text-white outline-none focus:border-white"
                  />
                  <input
                    value={clienteTelefono}
                    onChange={(e) => setClienteTelefono(e.target.value)}
                    placeholder="WhatsApp con código de país (ej. 5213312345678)"
                    className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-2 text-white outline-none focus:border-white"
                  />
                  <p className="text-xs text-neutral-500">
                    Si pones el teléfono, podrás enviar el ticket por WhatsApp.
                  </p>
                </>
              )}
            </div>

            <button
              onClick={cobrar}
              disabled={procesando || carrito.length === 0}
              className="w-full rounded-xl bg-green-600 px-5 py-4 text-lg font-bold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {procesando ? "Procesando..." : `Cobrar $${total.toFixed(2)}`}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
