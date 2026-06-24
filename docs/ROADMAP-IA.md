# Roadmap — Implementación de IA en MWStock

**Principio rector:** la IA **propone**, el humano **confirma**. Ningún resultado de IA
llega al cliente final ni a la base de datos sin una revisión humana.

**Regla de trabajo:** una fase a la vez. Se termina, se prueba y se despliega
**antes** de empezar la siguiente. Cada función de IA es un **módulo on/off por
tienda** (y posible cobro extra).

---

## Fase 0 — Cimientos de IA ✅ COMPLETA

La plomería común que reusan todas las funciones.

- [x] Proveedor: **Google Gemini Flash** + API key (`GEMINI_API_KEY`).
- [x] `lib/ia.ts`: helper de backend (llamada al modelo, validación de JSON, errores).
- [x] **Módulo "IA: foto a inventario"** en el panel de dueño (toggle por tienda).
- [x] Guardarraíles: **límite de uso por tienda** (diario/mensual, `lib/uso-ia.ts`) +
  **registro de uso** (modelo `UsoIA`).
- [ ] (Opcional, para después) Componente "marcar lo dudoso" en la previsualización.
  Por ahora se cubre con previsualizar + descargar/editar + confirmar.

Dependencia: ninguna. Bloquea a todas las demás.

---

## Fase 1 — Alta de inventario asistida (foto → CSV) ✅ COMPLETA

El dueño toma foto de su lista → la IA extrae los productos → previsualización →
se importa (reusa el importador que ya existe).

- [x] Subida de foto en la pantalla Importar (gated por el módulo `iaInventario`).
- [x] Extracción con Gemini → mismas columnas del importador.
- [x] Red de seguridad: revisar + **descargar CSV para editar** + confirmar antes de importar.
- [x] Incluye **categoría y marca** automáticas (las llena la IA).
- Pendiente de prueba real con `GEMINI_API_KEY` puesta.
- (Voz → CSV queda como mejora futura.)

---

## Fase 2 — Imágenes con IA

- Cloudinary (ya contratado): **quita-fondo** + **reemplazo de fondo** automático.
- Carga masiva: **emparejar fotos con productos** por visión.
- Riesgo: **bajo**. Valor: **alto** (quita la talacha de subir foto por foto).
- Depende de: Fase 0.

---

## Fase 3 — Búsqueda en lenguaje natural (catálogo público)

El cliente busca "gorra negra de menos de $1,500" y la IA filtra el catálogo real.

- Riesgo: **medio** (lo ve el cliente, pero es solo lectura y anclado a datos reales).
- Valor: **alto** (mejora ventas). Depende de: Fase 0.

---

## Fase 4 — Analista por chat (para el dueño)

"¿Cuánto vendí esta semana?", "¿qué se me está agotando?" → respuestas con datos
reales (la app da los números, la IA solo los presenta).

- Riesgo: **bajo** (dueño, datos reales). Valor: **diferenciador** para cobrar más.
- Depende de: Fase 0.

---

## Fase 5 — Contenido generado

- Descripciones de producto y posts de marketing (el dueño revisa/edita).
- Riesgo: **bajo**. Valor: **medio**. Depende de: Fase 0.

---

## Fase 6 — Agente de WhatsApp

Responde dudas de clientes con datos reales del catálogo; si no está seguro, deriva
al vendedor ("déjame conectarte…").

- Riesgo: **ALTO** (cliente final, conversacional) → por eso va **al final**.
- Depende de: Fase 0 + integración con WhatsApp Business API.

---

## Fase 7 — Predictivo

- Sugerencia de reabastecimiento + recordatorios de fiado/tandas redactados por IA.
- Riesgo: **medio**. Necesita historial de ventas acumulado. Depende de: Fase 0.

---

## Orden recomendado

`0 → 1 → 2 → (3 o 4) → 5 → 7 → 6`

Empezar por lo de **mayor dolor y menor riesgo** (alta de inventario) y terminar por
lo **más complejo y expuesto** (WhatsApp).

## Para no enredarnos

1. Fase 0 completa antes de cualquier función.
2. Una fase a la vez: terminar + desplegar + probar antes de la siguiente.
3. Toda función nace con el patrón humano-en-el-medio (previsualizar y confirmar).
4. Cada función = módulo on/off por tienda en el panel de dueño.
