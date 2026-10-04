/**
 * Avaliação de qualidade de iluminação/nitidez do frame facial.
 *
 * O cálculo é invariante a tom de pele: o piso de brilho é baixo, o contraste
 * é medido de forma relativa (coef. de variação) e a uniformidade detecta
 * iluminação lateral/sombra — a causa real de má captura.
 *
 * A função pura `computeFaceQuality` opera sobre um array de luminância já
 * extraído (região do rosto), o que a torna testável sem DOM/canvas.
 */
import type { FaceQuality, Point } from "./types";

// Limiares de iluminação tolerantes a tom de pele.
export const GOOD_FACE_BRIGHTNESS_MIN = 28;
export const GOOD_FACE_BRIGHTNESS_MAX = 235;
// Contraste relativo (coef. de variação) → invariante ao tom de pele.
export const GOOD_FACE_CONTRAST_RATIO_MIN = 0.12;
export const GOOD_FACE_SHARPNESS_MIN = 3.0;
// Iluminação lateral (sombra em metade do rosto) prejudica landmarks e óculos.
export const GOOD_FACE_UNIFORMITY_MIN = 0.55;

/**
 * Núcleo puro: recebe a luminância (linha-major) de uma região `width`x`height`
 * e devolve as métricas de qualidade. Retorna null se a região for pequena demais.
 */
export function computeFaceQuality(
  luminance: number[],
  width: number,
  height: number,
): FaceQuality | null {
  if (luminance.length < 4 || width < 2 || height < 2) return null;

  const brightness =
    luminance.reduce((sum, value) => sum + value, 0) / luminance.length;
  const variance =
    luminance.reduce((sum, value) => sum + (value - brightness) ** 2, 0) /
    luminance.length;
  const contrast = Math.sqrt(variance);
  const contrastRatio = contrast / Math.max(1, brightness);

  // Uniformidade: brilho médio das metades esquerda/direita da região.
  let leftSum = 0;
  let leftCount = 0;
  let rightSum = 0;
  let rightCount = 0;
  const half = Math.floor(width / 2);
  for (let i = 0; i < luminance.length; i += 1) {
    const col = i % width;
    if (col < half) {
      leftSum += luminance[i];
      leftCount += 1;
    } else {
      rightSum += luminance[i];
      rightCount += 1;
    }
  }
  const leftMean = leftSum / Math.max(1, leftCount);
  const rightMean = rightSum / Math.max(1, rightCount);
  const uniformity =
    Math.min(leftMean, rightMean) / Math.max(1, Math.max(leftMean, rightMean));

  // Nitidez: média das diferenças horizontais de luminância.
  let edgeSum = 0;
  let edgeCount = 0;
  for (let y = 0; y < height - 1; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      const current = luminance[y * width + x];
      edgeSum += Math.abs(current - luminance[y * width + x + 1]);
      edgeCount += 1;
    }
  }
  const sharpness = edgeSum / Math.max(1, edgeCount);

  return {
    brightness,
    contrast,
    sharpness,
    uniformity,
    isGood:
      brightness >= GOOD_FACE_BRIGHTNESS_MIN &&
      brightness <= GOOD_FACE_BRIGHTNESS_MAX &&
      contrastRatio >= GOOD_FACE_CONTRAST_RATIO_MIN &&
      sharpness >= GOOD_FACE_SHARPNESS_MIN &&
      uniformity >= GOOD_FACE_UNIFORMITY_MIN,
  };
}

/** Luminância BT.601 de um pixel RGBA no índice `i`. */
export function luminanceRGBA(data: Uint8ClampedArray, i: number): number {
  return data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
}

/**
 * Wrapper que amostra o frame do vídeo num canvas 160x120, recorta a bbox dos
 * landmarks e delega para `computeFaceQuality`. Depende de DOM (não testado
 * diretamente; a lógica está coberta pelo núcleo puro).
 */
export function inspectFaceFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  points: Point[],
): FaceQuality | null {
  if (!video.videoWidth || !video.videoHeight || points.length === 0)
    return null;

  const width = 160;
  const height = 120;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(video, 0, 0, width, height);

  const xs = points.map((point) => point.x * width);
  const ys = points.map((point) => point.y * height);
  const left = Math.max(0, Math.floor(Math.min(...xs) - 8));
  const right = Math.min(width - 1, Math.ceil(Math.max(...xs) + 8));
  const top = Math.max(0, Math.floor(Math.min(...ys) - 8));
  const bottom = Math.min(height - 1, Math.ceil(Math.max(...ys) + 8));
  const regionWidth = right - left + 1;
  const regionHeight = bottom - top + 1;
  const image = context.getImageData(left, top, regionWidth, regionHeight);
  const luminance: number[] = [];
  for (let i = 0; i < image.data.length; i += 4) {
    luminance.push(luminanceRGBA(image.data, i));
  }
  return computeFaceQuality(luminance, regionWidth, regionHeight);
}
