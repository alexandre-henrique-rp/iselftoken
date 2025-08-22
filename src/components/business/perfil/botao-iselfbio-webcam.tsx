"use client";

import { useEffect, useRef, useState } from "react";

/**
 * BotaoIselfBioWebcam
 * - Abre um modal simples usando HTML/CSS para capturar foto via getUserMedia.
 * - Responsabilidade: gerenciar webcam, tirar foto (base64) e retornar pelo onCapture.
 */
export type BotaoIselfBioWebcamProps = {
  label?: string;
  onCapture?: (imageBase64: string) => void;
  disabled?: boolean;
};

export function BotaoIselfBioWebcam({ label = "Capturar Foto", onCapture, disabled = false }: BotaoIselfBioWebcamProps) {
  const [open, setOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function start() {
      try {
        setError(null);
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch  {
        setError("Não foi possível acessar a câmera.");
      }
    }

    if (open) start();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [open]);

  function handleCapture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/png");
    onCapture?.(data);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="rounded bg-zinc-200 px-2 py-1 text-sm disabled:opacity-50 dark:bg-zinc-700"
      >
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded bg-white p-4 shadow dark:bg-zinc-900">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium">Capturar foto</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded px-2 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Fechar
              </button>
            </div>

            {error ? (
              <p className="mb-2 text-sm text-red-600">{error}</p>
            ) : null}

            <div className="flex flex-col items-center gap-2">
              <video ref={videoRef} className="h-48 w-full rounded bg-black object-contain" />
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCapture}
                  className="rounded bg-emerald-600 px-3 py-1 text-sm text-white hover:bg-emerald-700"
                >
                  Tirar foto
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded bg-zinc-200 px-3 py-1 text-sm hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
