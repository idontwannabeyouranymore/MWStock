# Revisión de código — MWStock

Stack: Next.js 16 (App Router) · React 19 · Prisma 6 + PostgreSQL (Supabase) ·
JWT (jose) · bcryptjs · Cloudinary · Tailwind 4.

Prioridad: 🔴 crítico · 🟠 importante · 🟡 menor. El estado **[RESUELTO]** indica
lo ya aplicado en esta sesión (ver `CAMBIOS-APLICADOS.md`).

---

## 🔴 Críticos

1. **[RESUELTO] Rutas `/api/*` sin proteger.** El middleware solo cubría
   `/administrador`. Ahora cubre toda la API (excepto login/logout) con `401`.
2. **[RESUELTO] `SESSION_SECRET` inseguro.** Secreto real en `.env`, sin fallback.
3. **[PENDIENTE — requiere tu BD] Migración de Prisma falsa.** La migración solo
   crea `TestConnection`. Ver `MIGRACION-PRISMA.md`. Bloquea el deploy limpio.

## 🟠 Importantes

4. **[RESUELTO] `TIENDA_ID` hardcodeado.** Ahora se deriva de la sesión
   (`lib/auth.ts`).
5. **[PENDIENTE] Posible sobreventa por concurrencia.** En
   `inventario/movimiento`, el stock se lee y reescribe con el valor leído. Para
   evitar sobreventa con ventas simultáneas, usar update atómico
   (`{ stock: { decrement: cantidad } }`) o `SELECT ... FOR UPDATE`. Tolerable en
   una tienda chica.
6. **[RESUELTO] Gestión de imágenes incompleta.** Galería multi-imagen + borrado
   en Cloudinary.
7. **[PENDIENTE] Contraseña admin hardcodeada** (`"admin123"` en
   `prisma/set-admin-password.ts`). Cámbiala.

## 🟡 Menores

8. **[RESUELTO] Metadata por defecto** ("Create Next App") → "MWStock", idioma `es`.
9. **[PENDIENTE] Código muerto:** `actualizarEstadoProducto()` en
   `inventario/movimiento/route.ts` está definida pero no se usa. Eliminar.
10. **[PENDIENTE] `<img>` en vez de `next/image`** — se pierde optimización. Si
    migras, configura `images.remotePatterns` para Cloudinary.
11. **[PENDIENTE] `productoId: "branding"`** falso en `configuracion` para pasar
    la validación de `/api/upload`. Separar upload de branding vs producto.
12. **[PENDIENTE] Tipos `any`** sueltos (`Promise<any>` en upload, `movimiento: any`).
13. **[PENDIENTE] Sin rate limiting** en `/api/auth/login`. Menor con un solo admin.
14. **[PENDIENTE] UX con `alert()`/`confirm()`** — funcional para MVP.
15. **[RESUELTO] Orden del sidebar** corregido (Dashboard primero).

---

## ✅ Lo que estaba bien

Schema normalizado con enums/índices, transacción atómica en movimientos de
inventario, borrado en cascada manual correcto, soft-delete, cookie httpOnly +
secure, validación tienda/producto en la página pública, bcrypt, singleton de
Prisma.

---

## Orden sugerido de lo que falta

1. Migración de Prisma (#3) antes del deploy.
2. Contraseña admin (#7) + rotar secret de Cloudinary.
3. Update atómico de stock (#5) cuando tengas tráfico real.
4. Pulido 🟡 de forma continua.
