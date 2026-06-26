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

// Empareja cada foto con un producto de la lista (por lo que se ve en la imagen).
export async function emparejarFotosConProductos(
  imagenes: { mimeType: string; base64: string }[],
  productos: { id: string; nombre: string; marca: string | null }[]
): Promise<{ imagen: number; productoId: string | null }[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Falta configurar GEMINI_API_KEY en el servidor para usar la IA."
    );
  }

  const lista = productos
    .map((p) => `- id:${p.id} | ${p.marca ? p.marca + " " : ""}${p.nombre}`)
    .join("\n");

  const prompt = `Te doy una lista de PRODUCTOS y varias FOTOS numeradas.
Para cada foto, decide a cuál producto de la lista corresponde según lo que se ve
(marca, modelo, texto, color, forma). Devuelve SOLO un arreglo JSON con un elemento
por foto: [{"imagen": 1, "productoId": "ID"}, ...].
Reglas:
- Usa EXACTAMENTE los id que te doy abajo. No inventes ids.
- Si una foto no corresponde claramente a ningún producto, pon "productoId": null.

PRODUCTOS:
${lista}`;

  const parts: ParteGemini[] = [{ text: prompt }];
  imagenes.forEach((img, i) => {
    parts.push({ text: `Imagen ${i + 1}:` });
    parts.push({ inline_data: { mime_type: img.mimeType, data: img.base64 } });
  });

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
    throw new Error("La IA no devolvió un formato válido.");
  }
  if (!Array.isArray(arreglo)) return [];

  const idsValidos = new Set(productos.map((p) => p.id));
  return arreglo
    .map((r) => {
      const o = (r ?? {}) as Record<string, unknown>;
      const imagen = Number(o.imagen);
      const pid = o.productoId == null ? null : String(o.productoId);
      return {
        imagen: Number.isFinite(imagen) ? imagen : 0,
        productoId: pid && idsValidos.has(pid) ? pid : null,
      };
    })
    .filter((r) => r.imagen >= 1);
}

export type FiltroBusqueda = {
  texto: string;
  categoria: string;
  marca: string;
  precioMin: number | null;
  precioMax: number | null;
};

// Convierte una búsqueda en lenguaje natural en filtros para el catálogo.
export async function interpretarBusqueda(
  query: string,
  categorias: string[],
  marcas: string[]
): Promise<FiltroBusqueda> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Falta configurar GEMINI_API_KEY en el servidor.");
  }

  const prompt = `Eres el buscador de una tienda. Convierte la BÚSQUEDA del cliente en filtros.
Devuelve SOLO un JSON: {"texto":"","categoria":"","marca":"","precioMin":null,"precioMax":null}.
Reglas:
- "texto": palabras clave del producto (color, modelo, etc.), SIN la marca ni la categoría.
- "categoria": si menciona una categoría, devuelve EXACTAMENTE una de esta lista, o "". Lista: ${categorias.join(", ") || "(ninguna)"}.
- "marca": si menciona una marca, devuelve EXACTAMENTE una de esta lista, o "". Lista: ${marcas.join(", ") || "(ninguna)"}.
- "precioMin"/"precioMax": números. "menos de 1500" -> precioMax 1500; "más de 800" -> precioMin 800; "entre 500 y 1000" -> ambos. Si no menciona precio, null.
- No inventes categorías ni marcas fuera de las listas.

BÚSQUEDA: "${query}"`;

  const respuesta = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
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

  const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  const limpio = texto.replace(/```json/gi, "").replace(/```/g, "").trim();

  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(limpio) as Record<string, unknown>;
  } catch {
    return { texto: query, categoria: "", marca: "", precioMin: null, precioMax: null };
  }

  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const enLista = (v: unknown, lista: string[]) => {
    const s = (v == null ? "" : String(v)).trim().toLowerCase();
    return lista.find((x) => x.toLowerCase() === s) || "";
  };

  return {
    texto: obj.texto == null ? "" : String(obj.texto).trim(),
    categoria: enLista(obj.categoria, categorias),
    marca: enLista(obj.marca, marcas),
    precioMin: num(obj.precioMin),
    precioMax: num(obj.precioMax),
  };
}

// Responde la pregunta del dueño usando SOLO el resumen real (no inventa cifras).
export async function responderAnalista(
  pregunta: string,
  resumen: unknown
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Falta configurar GEMINI_API_KEY en el servidor.");
  }

  const prompt = `Eres el asistente de análisis de una tienda. Responde la PREGUNTA del dueño
USANDO ÚNICAMENTE los DATOS que te doy (son reales y actuales de su tienda).
Reglas:
- Responde en español, claro y breve, citando los números relevantes (en pesos MXN).
- Si la respuesta NO está en los datos, dilo con honestidad ("No tengo ese dato")
  en vez de inventar. Nunca inventes cifras.
- No muestres el JSON; responde como una persona.

DATOS (JSON):
${JSON.stringify(resumen)}

PREGUNTA: ${pregunta}`;

  const respuesta = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 },
      }),
    }
  );

  const data = (await respuesta.json()) as RespuestaGemini;
  if (!respuesta.ok) {
    throw new Error(
      `Error de la IA (${respuesta.status}): ${data?.error?.message || "intenta de nuevo"}`
    );
  }

  const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return (texto || "No pude generar una respuesta. Intenta de nuevo.").trim();
}

// Genera una descripción de producto o un post para redes (texto plano).
export async function generarContenido(
  tipo: "descripcion" | "post",
  datos: { nombre: string; marca?: string; categoria?: string; precio?: string }
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Falta configurar GEMINI_API_KEY en el servidor.");
  }

  const base = `Producto: ${datos.nombre}${
    datos.marca ? " · marca " + datos.marca : ""
  }${datos.categoria ? " · categoría " + datos.categoria : ""}${
    datos.precio ? " · precio $" + datos.precio : ""
  }.`;

  const prompt =
    tipo === "descripcion"
      ? `Escribe una descripción de producto para una tienda, en español, atractiva y honesta,
de 2 a 3 frases (máximo ~40 palabras). No inventes características técnicas que no se mencionen.
${base}
Devuelve SOLO la descripción, sin comillas ni encabezados.`
      : `Escribe un post corto para redes sociales (Instagram/WhatsApp) que promocione este producto,
en español, tono vendedor pero natural: 1 o 2 frases y 3 hashtags relevantes al final.
${base}
Devuelve SOLO el texto del post.`;

  const respuesta = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7 },
      }),
    }
  );

  const data = (await respuesta.json()) as RespuestaGemini;
  if (!respuesta.ok) {
    throw new Error(
      `Error de la IA (${respuesta.status}): ${data?.error?.message || "intenta de nuevo"}`
    );
  }

  const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return (texto || "").trim();
}
