"use client";

import { useEffect } from "react";

// Registra el service worker solo en producción (evita problemas de caché
// durante el desarrollo con el hot-reload).
export default function RegistrarSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    if (!("serviceWorker" in navigator)) {
      return;
    }

    const registrar = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((error) => console.error("No se pudo registrar el SW:", error));
    };

    window.addEventListener("load", registrar);
    return () => window.removeEventListener("load", registrar);
  }, []);

  return null;
}
