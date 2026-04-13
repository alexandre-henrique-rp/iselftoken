/**
 * @file CameraModal.tsx
 * @description Modal de câmera para captura de selfie com documento
 */

import { Camera, Check, RefreshCw, User } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

// Tipos para Face Detection API
declare global {
  interface FaceDetector {
    detect(
      source:
        | HTMLImageElement
        | HTMLVideoElement
        | HTMLCanvasElement
        | ImageBitmap
        | VideoFrame
        | Blob
        | ImageData,
    ): Promise<DetectedFace[]>;
  }

  interface DetectedFace {
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }

  interface FaceDetectorOptions {
    maxDetectedFaces?: number;
    fastMode?: boolean;
  }

  interface Window {
    FaceDetector?: {
      new (options?: FaceDetectorOptions): FaceDetector;
    };
  }
}

interface CameraModalProps {
  isOpen: boolean;
  onCapture: (file: File) => void;
  onClose: () => void;
}

/**
 * @name CameraModal
 * @description Modal com acesso à câmera para captura de selfie com documento
 *
 * @param {CameraModalProps} props - Propriedades do componente
 * @returns {JSX.Element} Modal de câmera
 */
export function CameraModal({ isOpen, onCapture, onClose }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const isStartingRef = useRef(false);

  // Estados para detecção facial
  const [faceDetected, setFaceDetected] = useState(false);
  const [facePositioned, setFacePositioned] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const faceDetectorRef = useRef<FaceDetector | null>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startCamera = useCallback(async () => {
    // Previne múltiplas chamadas simultâneas
    if (isStartingRef.current || stream) return;

    isStartingRef.current = true;
    setIsLoading(true);
    setIsVideoReady(false);
    setError(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error("Erro ao acessar câmera:", err);
      setError(
        "Não foi possível acessar a câmera. Verifique as permissões do navegador.",
      );
      setIsLoading(false);
    } finally {
      isStartingRef.current = false;
    }
  }, [stream]);

  const handleVideoReady = () => {
    console.log("Vídeo pronto - metadata carregada");
    setIsVideoReady(true);
    setIsLoading(false);
  };

  const handleVideoPlaying = () => {
    console.log("Vídeo começou a tocar");
    setIsVideoReady(true);
    setIsLoading(false);

    // Inicia detecção facial quando vídeo está pronto
    startFaceDetection();
  };

  /**
   * @name startFaceDetection
   * @description Inicializa o detector de faces e começa a monitorar
   */
  const startFaceDetection = useCallback(async () => {
    if (!window.FaceDetector) {
      console.log("Face Detection API não suportada neste navegador");
      return;
    }

    try {
      faceDetectorRef.current = new window.FaceDetector({
        maxDetectedFaces: 1,
        fastMode: true,
      });

      // Inicia loop de detecção
      detectionIntervalRef.current = setInterval(detectFace, 500);
    } catch (err) {
      console.error("Erro ao inicializar detector facial:", err);
    }
  }, []);

  /**
   * @name detectFace
   * @description Detecta face no frame atual do vídeo
   */
  const detectFace = useCallback(async () => {
    if (!videoRef.current || !faceDetectorRef.current || capturedImage) return;

    try {
      const faces = await faceDetectorRef.current.detect(videoRef.current);

      const hasFace = faces.length > 0;
      setFaceDetected(hasFace);

      if (hasFace) {
        const face = faces[0];
        const { boundingBox } = face;

        // Verifica se o rosto está centralizado na área oval
        const isPositioned = checkFacePosition(
          boundingBox.x,
          boundingBox.y,
          boundingBox.width,
          boundingBox.height,
          videoRef.current.videoWidth,
          videoRef.current.videoHeight,
        );

        setFacePositioned(isPositioned);

        // Inicia contagem regressiva se rosto está posicionado
        if (isPositioned && countdown === null) {
          startCountdown();
        } else if (!isPositioned && countdown !== null) {
          // Cancela contagem se rosto sair da posição
          setCountdown(null);
        }
      } else {
        setFacePositioned(false);
        setCountdown(null);
      }
    } catch (err) {
      // Ignora erros de detecção silenciosamente
    }
  }, [capturedImage, countdown]);

  /**
   * @name checkFacePosition
   * @description Verifica se o rosto está posicionado corretamente na área oval
   */
  const checkFacePosition = (
    faceX: number,
    faceY: number,
    faceWidth: number,
    faceHeight: number,
    videoWidth: number,
    videoHeight: number,
  ): boolean => {
    // Centro do vídeo
    const centerX = videoWidth / 2;
    const centerY = videoHeight / 2;

    // Centro do rosto
    const faceCenterX = faceX + faceWidth / 2;
    const faceCenterY = faceY + faceHeight / 2;

    // Tamanho mínimo do rosto (30% da altura do vídeo)
    const minFaceHeight = videoHeight * 0.3;
    const maxFaceHeight = videoHeight * 0.6;

    // Tolerância de centralização (20% do tamanho do vídeo)
    const toleranceX = videoWidth * 0.2;
    const toleranceY = videoHeight * 0.2;

    const isCentered =
      Math.abs(faceCenterX - centerX) < toleranceX &&
      Math.abs(faceCenterY - centerY) < toleranceY;

    const isRightSize =
      faceHeight >= minFaceHeight && faceHeight <= maxFaceHeight;

    return isCentered && isRightSize;
  };

  /**
   * @name startCountdown
   * @description Inicia contagem regressiva para captura automática
   */
  const startCountdown = () => {
    setCountdown(3);

    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      setCountdown(count);

      if (count <= 0) {
        clearInterval(interval);
        capturePhoto();
      }
    }, 1000);
  };

  /**
   * @name stopFaceDetection
   * @description Para o detector de faces
   */
  const stopFaceDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    faceDetectorRef.current = null;
    setFaceDetected(false);
    setFacePositioned(false);
    setCountdown(null);
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    if (isOpen && !stream) {
      setIsVideoReady(false);
      setFaceDetected(false);
      setFacePositioned(false);
      setCountdown(null);
      startCamera();
    } else if (!isOpen) {
      stopCamera();
      stopFaceDetection();
      setCapturedImage(null);
      setError(null);
    }

    return () => {
      stopCamera();
      stopFaceDetection();
    };
  }, [isOpen, startCamera, stopCamera, stopFaceDetection, stream]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(imageData);

    // Para detecção facial ao capturar
    stopFaceDetection();
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    // Reinicia detecção facial
    setTimeout(() => startFaceDetection(), 500);
  };

  const confirmPhoto = () => {
    if (!capturedImage) return;

    // Converter base64 para File
    const byteString = atob(capturedImage.split(",")[1]);
    const mimeString = capturedImage.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    const blob = new Blob([ab], { type: mimeString });
    const file = new File([blob], `selfie_${Date.now()}.jpg`, {
      type: "image/jpeg",
    });

    onCapture(file);
    onClose();
  };

  const handleClose = () => {
    stopFaceDetection();
    stopCamera();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg bg-stone-900 border-stone-800">
        <DialogHeader>
          <DialogTitle className="text-stone-100 flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Selfie com Documento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error ? (
            <div className="rounded-lg bg-red-600/10 p-4 text-center">
              <p className="text-sm text-red-400">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={startCamera}
                className="mt-3"
              >
                Tentar novamente
              </Button>
            </div>
          ) : (
            <>
              <div className="relative aspect-video overflow-hidden rounded-lg bg-stone-800">
                {capturedImage ? (
                  <img
                    src={capturedImage}
                    alt="Capturada"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    onLoadedMetadata={handleVideoReady}
                    onPlaying={handleVideoPlaying}
                    className="h-full w-full object-cover"
                  />
                )}

                {isLoading && !capturedImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-stone-900/80">
                    <RefreshCw className="h-8 w-8 animate-spin text-[#d500f9]" />
                  </div>
                )}

                {/* Overlay oval para alinhamento do rosto */}
                {!capturedImage && !isLoading && isVideoReady && (
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Oval central */}
                    <div
                      className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64 rounded-[50%] border-4 transition-all duration-300 ${
                        facePositioned
                          ? "border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.5)]"
                          : faceDetected
                            ? "border-yellow-400"
                            : "border-white/50"
                      }`}
                    />

                    {/* Marcadores de alinhamento */}
                    <div className="absolute top-1/2 left-1/4 w-4 h-px bg-white/30" />
                    <div className="absolute top-1/2 right-1/4 w-4 h-px bg-white/30" />
                    <div className="absolute top-1/3 left-1/2 w-px h-4 bg-white/30 -translate-x-1/2" />
                    <div className="absolute bottom-1/3 left-1/2 w-px h-4 bg-white/30 -translate-x-1/2" />
                  </div>
                )}

                {/* Contagem regressiva */}
                {countdown !== null && countdown > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <span className="text-6xl font-bold text-white animate-pulse">
                        {countdown}
                      </span>
                    </div>
                  </div>
                )}

                {/* Status de detecção */}
                {!capturedImage && !isLoading && (
                  <div className="absolute inset-x-0 top-4 flex justify-center">
                    <div
                      className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm transition-colors ${
                        facePositioned
                          ? "bg-green-500/20 text-green-400"
                          : faceDetected
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-black/50 text-white/70"
                      }`}
                    >
                      <User className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {facePositioned
                          ? "Rosto posicionado!"
                          : faceDetected
                            ? "Ajuste a posição"
                            : "Procure o rosto..."}
                      </span>
                    </div>
                  </div>
                )}

                {/* Overlay de instruções */}
                {!capturedImage && !isLoading && (
                  <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent p-4">
                    <p className="text-xs text-white text-center">
                      Posicione seu rosto dentro da oval e aguarde a captura
                      automática
                    </p>
                  </div>
                )}
              </div>

              <canvas ref={canvasRef} className="hidden" />

              <div className="flex justify-center gap-3">
                {capturedImage ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={retakePhoto}
                      className="bg-stone-800 border-stone-700 hover:bg-stone-700"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Tirar novamente
                    </Button>
                    <Button
                      type="button"
                      onClick={confirmPhoto}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Confirmar
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    onClick={capturePhoto}
                    disabled={isLoading || !stream}
                    className="bg-[#d500f9] hover:bg-[#b000d4]"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Capturar
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
