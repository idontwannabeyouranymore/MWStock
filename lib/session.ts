import { SignJWT, jwtVerify } from "jose";

// El secreto se lee de forma perezosa (no al importar el módulo) para no
// romper el build, pero falla de inmediato en tiempo de ejecución si no
// está configurado. Ya no hay fallback inseguro.
function obtenerSecreto() {
  const valor = process.env.SESSION_SECRET;

  if (!valor || valor.length < 32) {
    throw new Error(
      "SESSION_SECRET no está definido o es demasiado corto. " +
        "Configura una cadena aleatoria de al menos 32 caracteres en tu .env"
    );
  }

  return new TextEncoder().encode(valor);
}

export async function crearToken(payload: {
  userId: string;
  email: string;
  rol: string;
}) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(obtenerSecreto());
}

export async function verificarToken(token: string) {
  const { payload } = await jwtVerify(token, obtenerSecreto());
  return payload;
}
