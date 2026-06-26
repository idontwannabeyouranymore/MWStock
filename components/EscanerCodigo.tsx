"use client";

import { useEffect, useRef, useState } from "react";

type EscanerInstancia = {
  start: (
    camara: unknown,
    config: unknown,
    onExito: (texto: string) => void,
    onError: () => void
  ) => Promise<void>;
  stop: () => Promise<void>;
  clear: () => void;
};

export default function EscanerCodigo({
  onDetectado,
  onCerrar,
}: {
  onDetectado: (codigo: string) => void;
  onCerrar: () => void;
}) {
  const idRef = useRef(`escaner-${Math.random().toString(36).slice(2)}`);
  const cbRef = useRef(onDetectado);
  cbRef.current = onDetectado;
  const [error, setError] = useState("");

  useEffect(() => {
    let escaner: EscanerInstancia | null = null;
    let activo = true;
    let yaDetecto = false;

    (async () => {
      try {
        // Se carga aquí (no en SSR) porque usa la cámara del navegador.
        const mod = await import("html5-qrcode");
        if (!activo) return;
        const Html5Qrcode = mod.Html5Qrcode;
        const F = mod.Html5QrcodeSupportedFormats;

        escaner = new Html5Qrcode(idRef.current, {
          formatsToSupport: [
            F.EAN_13,
            F.EAN_8,
            F.UPC_A,
            F.UPC_E,
            F.CODE_128,
            F.CODE_39,
            F.CODE_93,
            F.ITF,
            F.QR_CODE,
          ],
          verbose: false,
        }) as unknown as EscanerInstancia;

        await escaner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 160 } },
          (texto: string) => {
            if (yaDetecto) return;
            yaDetecto = true;
            cbRef.current(texto);
          },
          () => {}
        );
      } catch (e) {
        console.error(e);
        setError(
          "No se pudo abrir la cámara. Revisa el permiso o usa un lector físico."
        );
      }
    })();

    return () => {
      activo = false;
      if (escaner) {
        escaner
          .stop()
          .then(() => escaner?.clear())
          .catch(() => {});
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4">
      <div
        id={idRef.current}
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-black"
      />
      {error ? (
        <p className="mt-4 max-w-sm text-center text-sm text-red-400">{error}</p>
      ) : (
        <p className="mt-4 text-sm text-neutral-300">
          Apunta al código de barras…
        </p>
      )}
      <button
        onClick={onCerrar}
        className="mt-4 rounded-xl bg-white px-6 py-3 font-semibold text-black"
      >
        Cerrar
      </button>
    </div>
  );
}
