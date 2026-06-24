// Conector a Google Gemini (visión) para digitalizar listas de inventario.
// Recibe una o varias fotos y devuelve filas estructuradas para el importador.

const MODELO = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export type FilaProducto = {
  categoria: string;
  marca: string;
  nombre: string;
  presentacion: string;
  precio: string;
  stock: string;
};

type ParteGemini =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

type RespuestaGemini = {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string };
};

const PROMPT = `Eres un asistente que digitaliza listas de inventario de tiendas.
Te doy una o varias FOTOS de una lista de productos (puede estar escrita a mano o impresa).
Devuelve SOLO un arreglo JSON, sin texto adicional. Cada elemento es un producto con
exactamente estas claves: "categoria","marca","nombre","presentacion","precio","stock".

Reglas:
- "nombre": el nombre del producto (obligatorio).
- "marca": la marca si se distingue; si no, deja "".
- "categoria": la sección o categoría si se ve (ej. Gorras, Tenis, Playeras); si no, deja "".
- "presentacion": talla o presentación (ej. "M", "10ml", "Única"). Si el producto no tiene
  variantes, usa "Única".
- "precio": SOLO el número, sin signos de pesos ni comas. Si no hay precio, deja "".
- "stock": cantidad de piezas como número entero. Si no se ve, usa "0".
- NO inventes precios ni datos. Si dudas de un dato, déjalo vacío en vez de adivinar.`;

export async function extraerProductosDeImagenes(
  imagenes: { mimeType: string; base64: string }[]
): Promise<FilaProducto[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Falta configurar GEMINI_API_KEY en el servidor para usar la IA."
    );
  }

  const parts: ParteGemini[] = [{ text: PROMPT }];
  for (const img of imagenes) {
    parts.push({
      inline_data: { mime_type: img.mimeType, data: img.base64 },
    });
  }

  const respuesta = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseMimeType: "application/json", temperature: 0 },
      }),
    }
  );

  const data = (await respuesta.json()) as RespuestaGemini;

  if (!respuesta.ok) {
    throw new Error(
      `Error de la IA (${respuesta.status}): ${data?.error?.message || "intenta de nuevo"}`
    );
  }

  const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
  const limpio = texto.replace(/```json/gi, "").replace(/```/g, "").trim();

  let arreglo: unknown;
  try {
    arreglo = JSON.parse(limpio);
  } catch {
    throw new Error("La IA no devolvió un formato válido. Intenta con otra foto.");
  }
  if (!Array.isArray(arreglo)) return [];

  const s = (v: unknown) => (v == null ? "" : String(v).trim());

  return arreglo
    .map((r) => {
      const o = (r ?? {}) as Record<string, unknown>;
      return {
        categoria: s(o.categoria),
        marca: s(o.marca),
        nombre: s(o.nombre),
        presentacion: s(o.presentacion) || "Única",
        precio: s(o.precio).replace(/[^0-9.]/g, ""),
        stock: s(o.stock).replace(/[^0-9]/g, "") || "0",
      };
    })
    .filter((r) => r.nombre);
}
