/**
 * Detecção de óculos por GEOMETRIA ancorada em landmarks (MediaPipe 478 pts).
 *
 * O modelo não fornece pontos NA armação (só no rosto), então não há "contorno
 * do óculos" pronto. Mas usamos os landmarks como âncoras para amostrar
 * exatamente as regiões por onde a armação passa e procurar a assinatura dela:
 * uma FAIXA HORIZONTAL ESCURA (a barra da armação) atravessando:
 *   - a ponte do nariz (barra central), e
 *   - o vão entre a sobrancelha e o olho (aro superior), em cada lado.
 *
 * "Faixa escura" = uma linha de pixels significativamente mais escura que a
 * pele imediatamente acima/abaixo. É invariante ao tom de pele (medida
 * relativa) e não é afetada por barba (que fica na face inferior).
 *
 * `analyzeBandRegions` (decisão) e `hasDarkBand` (detecção de faixa) são puros
 * e testáveis sem canvas.
 */
import {
  LANDMARK_BETWEEN_EYES,
  LANDMARK_BROW_LEFT,
  LANDMARK_BROW_RIGHT,
  LANDMARK_EYE_LEFT_CENTER,
  LANDMARK_EYE_RIGHT_CENTER,
  LANDMARK_NOSE_BRIDGE_TOP,
} from "./landmarks";
import { luminanceRGBA } from "./quality";
import type { Point } from "./types";

// Quão mais escura a faixa precisa ser vs. a pele ao redor (em luminância 0..255).
export const DARK_BAND_MIN_DROP = 14;
// Quantas das 3 regiões (ponte + 2 laterais) precisam ter faixa escura.
export const GLASSES_MIN_BAND_REGIONS = 1;

/**
 * Dada a luminância média por LINHA de uma sub-região (topo→base), detecta se
 * há uma faixa escura no meio, mais escura que as linhas de pele acima e abaixo.
 * Retorna a "profundidade" do vale (quão mais escura), 0 se não houver.
 */
export function darkBandDepth(rowMeans: number[]): number {
  const n = rowMeans.length;
  if (n < 3) return 0;
  // Pele de referência: linhas do topo e da base (fora da faixa central).
  const edgeCount = Math.max(1, Math.floor(n * 0.25));
  let topSkin = 0;
  let botSkin = 0;
  for (let i = 0; i < edgeCount; i++) {
    topSkin += rowMeans[i];
    botSkin += rowMeans[n - 1 - i];
  }
  topSkin /= edgeCount;
  botSkin /= edgeCount;
  const skin = (topSkin + botSkin) / 2;

  // Linha mais escura na região central.
  let darkest = Infinity;
  const start = edgeCount;
  const end = n - edgeCount;
  for (let i = start; i < end; i++) {
    if (rowMeans[i] < darkest) darkest = rowMeans[i];
  }
  if (!Number.isFinite(darkest)) return 0;
  return Math.max(0, skin - darkest);
}

/** Há faixa escura suficiente? */
export function hasDarkBand(rowMeans: number[]): boolean {
  return darkBandDepth(rowMeans) >= DARK_BAND_MIN_DROP;
}

/** Decisão pura: quantas regiões têm faixa escura → há óculos. */
export function analyzeBandRegions(bandsFound: boolean[]): boolean {
  return bandsFound.filter(Boolean).length >= GLASSES_MIN_BAND_REGIONS;
}

/** Luminância média por linha de um bloco RGBA `w`x`h`. */
export function rowMeansFromRGBA(
  data: Uint8ClampedArray,
  w: number,
  h: number,
): number[] {
  const means: number[] = [];
  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let x = 0; x < w; x++) sum += luminanceRGBA(data, (y * w + x) * 4);
    means.push(sum / Math.max(1, w));
  }
  return means;
}

/**
 * Wrapper com canvas: amostra as 3 regiões âncora (ponte + 2 vãos brow-olho) e
 * procura faixa escura da armação em cada uma. Depende de DOM.
 */
export function detectGlasses(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  points: Point[],
): boolean | null {
  const debug = detectGlassesDebug(video, canvas, points);
  if (!debug) return null;
  return analyzeBandRegions(debug.regions.map((r) => r.hasBand));
}

export interface GlassesDebugRegion {
  /** Retângulo amostrado, em coordenadas do frame de análise (160x120). */
  x: number;
  y: number;
  w: number;
  h: number;
  depth: number;
  hasBand: boolean;
}

export interface GlassesDebugInfo {
  /** Dimensões do frame de análise (para escalar no overlay). */
  frameW: number;
  frameH: number;
  regions: GlassesDebugRegion[];
  detected: boolean;
}

/**
 * Igual a `detectGlasses`, mas devolve as janelas amostradas e a profundidade
 * medida em cada uma — para visualização no overlay de debug e calibração.
 */
export function detectGlassesDebug(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  points: Point[],
): GlassesDebugInfo | null {
  if (!video || !canvas || points.length < 468) return null;
  const width = 160;
  const height = 120;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(video, 0, 0, width, height);

  const px = (i: number) => points[i].x * width;
  const py = (i: number) => points[i].y * height;

  const eyeDist = Math.abs(
    px(LANDMARK_EYE_RIGHT_CENTER) - px(LANDMARK_EYE_LEFT_CENTER),
  );
  if (eyeDist < 8) return null;
  const halfW = Math.max(3, Math.round(eyeDist * 0.22));
  const bandH = Math.max(6, Math.round(eyeDist * 0.5));

  const sampleRegion = (cx: number, cy: number): GlassesDebugRegion => {
    const left = Math.max(0, Math.round(cx - halfW));
    const right = Math.min(width - 1, Math.round(cx + halfW));
    const top = Math.max(0, Math.round(cy - bandH / 2));
    const bottom = Math.min(height - 1, Math.round(cy + bandH / 2));
    const w = right - left + 1;
    const h = bottom - top + 1;
    if (w < 3 || h < 3) {
      return { x: left, y: top, w, h, depth: 0, hasBand: false };
    }
    const img = context.getImageData(left, top, w, h);
    const depth = darkBandDepth(rowMeansFromRGBA(img.data, w, h));
    return { x: left, y: top, w, h, depth, hasBand: depth >= DARK_BAND_MIN_DROP };
  };

  const bridgeX = (px(LANDMARK_NOSE_BRIDGE_TOP) + px(LANDMARK_BETWEEN_EYES)) / 2;
  const bridgeY = (py(LANDMARK_NOSE_BRIDGE_TOP) + py(LANDMARK_BETWEEN_EYES)) / 2;
  const leftX = (px(LANDMARK_BROW_LEFT) + px(LANDMARK_EYE_LEFT_CENTER)) / 2;
  const leftY = (py(LANDMARK_BROW_LEFT) + py(LANDMARK_EYE_LEFT_CENTER)) / 2;
  const rightX = (px(LANDMARK_BROW_RIGHT) + px(LANDMARK_EYE_RIGHT_CENTER)) / 2;
  const rightY = (py(LANDMARK_BROW_RIGHT) + py(LANDMARK_EYE_RIGHT_CENTER)) / 2;

  const regions = [
    sampleRegion(bridgeX, bridgeY),
    sampleRegion(leftX, leftY),
    sampleRegion(rightX, rightY),
  ];
  return {
    frameW: width,
    frameH: height,
    regions,
    detected: analyzeBandRegions(regions.map((r) => r.hasBand)),
  };
}
