import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { obtenerTiendaDeSesion } from "@/lib/auth";

type ItemEntrada = {
  tipo?: "variante" | "set";
  varianteId?: string;
  setId?: string;
  cantidad: number;
};

// Recalcula si un producto sigue ACTIVO o queda AGOTADO según sus variantes.
async function recalcularEstadoProducto(
  tx: Prisma.TransactionClient,
  productoId: string
) {
  const variantes = await tx.variante.findMany({
    where: { productoId, estado: { not: "ARCHIVADA" } },
  });
  const hayStock = variantes.some((v) => v.stock > 0);
  await tx.producto.update({
    where: { id: productoId },
    data: { estado: hayStock ? "ACTIVO" : "AGOTADO" },
  });
}

export async function GET() {
  try {
    const tienda = await obtenerTiendaDeSesion();
    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const ventas = await prisma.venta.findMany({
      where: { tiendaId: tienda.id },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(ventas);
  } catch (error) {
    console.error("GET /api/ventas", error);
    return NextResponse.json(
      { error: "Error al obtener ventas" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const tienda = await obtenerTiendaDeSesion();
    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const items: ItemEntrada[] = Array.isArray(body.items) ? body.items : [];
    const metodoPago: "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "FIADO" =
      body.metodoPago || "EFECTIVO";
    const clienteNombre = body.clienteNombre?.trim() || null;
    const clienteTelefono = body.clienteTelefono?.trim() || null;

    if (items.length === 0) {
      return NextResponse.json(
        { error: "El carrito está vacío" },
        { status: 400 }
      );
    }

    // Cliente (obligatorio para fiado).
    let cliente: { id: string; nombre: string; telefono: string | null } | null =
      null;
    if (body.clienteId) {
      const c = await prisma.cliente.findUnique({
        where: { id: body.clienteId },
      });
      if (!c || c.tiendaId !== tienda.id) {
        return NextResponse.json(
          { error: "Cliente no encontrado" },
          { status: 404 }
        );
      }
      cliente = { id: c.id, nombre: c.nombre, telefono: c.telefono };
    }
    if (metodoPago === "FIADO" && !cliente) {
      return NextResponse.json(
        { error: "El fiado requiere seleccionar un cliente" },
        { status: 400 }
      );
    }

    const venta = await prisma.$transaction(async (tx) => {
      let total = 0;
      const itemsCrear: {
        varianteId: string | null;
        productoNombre: string;
        talla: string;
        cantidad: number;
        precioUnitario: number;
        subtotal: number;
      }[] = [];

      for (const item of items) {
        const cantidad = Number(item.cantidad) || 0;
        if (cantidad <= 0) {
          throw new Error("Hay un artículo con cantidad inválida");
        }

        // === SET (paquete) ===
        if (item.tipo === "set") {
          const set = await tx.producto.findUnique({
            where: { id: item.setId },
            include: { componentes: true },
          });

          if (!set || set.tiendaId !== tienda.id || !set.esSet) {
            throw new Error("Un set ya no existe");
          }
          if (set.componentes.length === 0) {
            throw new Error(`El set "${set.nombre}" no tiene componentes`);
          }

          for (const comp of set.componentes) {
            const necesario = comp.cantidad * cantidad;
            const v = await tx.variante.findUnique({
              where: { id: comp.varianteId },
            });
            if (!v) {
              throw new Error("Un componente del set ya no existe");
            }
            if (v.stock < necesario) {
              throw new Error(`Stock insuficiente para el set "${set.nombre}"`);
            }
            const stockNuevo = v.stock - necesario;
            await tx.variante.update({
              where: { id: v.id },
              data: {
                stock: stockNuevo,
                estado: stockNuevo > 0 ? "ACTIVA" : "AGOTADA",
              },
            });
            await tx.movimientoInventario.create({
              data: {
                varianteId: v.id,
                tipo: "VENTA",
                cantidad: necesario,
                stockAnterior: v.stock,
                stockNuevo,
                nota: `Venta set: ${set.nombre}`,
              },
            });
            await recalcularEstadoProducto(tx, v.productoId);
          }

          const precioUnitario = Number(set.precio);
          const subtotal = precioUnitario * cantidad;
          total += subtotal;
          itemsCrear.push({
            varianteId: null,
            productoNombre: set.nombre,
            talla: "Set",
            cantidad,
            precioUnitario,
            subtotal,
          });
          continue;
        }

        // === VARIANTE (decant / talla suelta) ===
        const variante = await tx.variante.findUnique({
          where: { id: item.varianteId },
          include: { producto: true },
        });

        if (!variante) {
          throw new Error("Una de las presentaciones ya no existe");
        }
        if (variante.producto.tiendaId !== tienda.id) {
          throw new Error("Un artículo no pertenece a tu tienda");
        }
        if (variante.stock < cantidad) {
          throw new Error(
            `Stock insuficiente de ${variante.producto.nombre} ${variante.talla}`
          );
        }

        const precioUnitario = Number(
          variante.precio ?? variante.producto.precio
        );
        const subtotal = precioUnitario * cantidad;
        total += subtotal;

        const stockNuevo = variante.stock - cantidad;
        await tx.variante.update({
          where: { id: variante.id },
          data: {
            stock: stockNuevo,
            estado: stockNuevo > 0 ? "ACTIVA" : "AGOTADA",
          },
        });
        await tx.movimientoInventario.create({
          data: {
            varianteId: variante.id,
            tipo: "VENTA",
            cantidad,
            stockAnterior: variante.stock,
            stockNuevo,
            nota: "Venta POS",
          },
        });
        await recalcularEstadoProducto(tx, variante.productoId);

        itemsCrear.push({
          varianteId: variante.id,
          productoNombre: variante.producto.nombre,
          talla: variante.talla,
          cantidad,
          precioUnitario,
          subtotal,
        });
      }

      const tieneMonto =
        body.montoRecibido !== undefined &&
        body.montoRecibido !== null &&
        body.montoRecibido !== "";

      // EFECTIVO: monto recibido + cambio. FIADO: enganche (sin cambio).
      const montoRecibido =
        (metodoPago === "EFECTIVO" || metodoPago === "FIADO") && tieneMonto
          ? Number(body.montoRecibido)
          : null;

      const cambio =
        metodoPago === "EFECTIVO" && montoRecibido !== null
          ? Math.max(0, montoRecibido - total)
          : null;

      const venta = await tx.venta.create({
        data: {
          total,
          metodoPago,
          montoRecibido,
          cambio,
          referencia:
            metodoPago === "TRANSFERENCIA" && body.referencia
              ? String(body.referencia).trim() || null
              : null,
          clienteNombre: cliente ? cliente.nombre : clienteNombre,
          clienteTelefono: cliente ? cliente.telefono : clienteTelefono,
          tiendaId: tienda.id,
          clienteId: cliente ? cliente.id : null,
          items: { create: itemsCrear },
        },
        include: { items: true },
      });

      // Si es fiado, genera la deuda (descontando el enganche si lo hubo).
      if (metodoPago === "FIADO" && cliente) {
        const enganche =
          montoRecibido && montoRecibido > 0
            ? Math.min(montoRecibido, total)
            : 0;
        const saldo = Number((total - enganche).toFixed(2));
        const deuda = await tx.deuda.create({
          data: {
            concepto: `Venta a crédito (${itemsCrear.length} artículo(s))`,
            monto: total,
            saldo,
            estado: saldo <= 0 ? "PAGADA" : "PENDIENTE",
            tiendaId: tienda.id,
            clienteId: cliente.id,
            ventaId: venta.id,
          },
        });
        if (enganche > 0) {
          await tx.abono.create({
            data: {
              monto: enganche,
              nota: "Enganche en la venta",
              deudaId: deuda.id,
            },
          });
        }
      }

      return venta;
    });

    return NextResponse.json(venta, { status: 201 });
  } catch (error) {
    console.error("POST /api/ventas", error);
    const mensaje =
      error instanceof Error ? error.message : "Error al registrar la venta";
    return NextResponse.json({ error: mensaje }, { status: 400 });
  }
}
