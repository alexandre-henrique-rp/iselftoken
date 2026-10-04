/**
 * Desenho do overlay de debug (landmarks + mini-gráfico de movimento) sobre um
 * canvas 2D. Efeito colateral puro sobre o contexto — extraído do loop de
 * detecção para reduzir o tamanho do componente principal (Fase 0).
 */
import { ALL_LANDMARK_GROUPS } from "./landmarks";
import type { GlassesDebugInfo } from "./glasses-detector";
import type { LandmarkFrame, MovementSample } from "./types";

export function drawLivenessDebugOverlay(
  overlay: HTMLCanvasElement,
  video: HTMLVideoElement,
  landmarkGroups: LandmarkFrame,
  history: MovementSample[],
  glasses?: GlassesDebugInfo | null,
): void {
  if (!(video.videoWidth > 0)) return;
  overlay.width = video.clientWidth;
  overlay.height = video.clientHeight;
  const ctx = overlay.getContext("2d");
  if (!ctx) return;

  const vw = overlay.width;
  const vh = overlay.height;
  ctx.clearRect(0, 0, vw, vh);

  for (const group of ALL_LANDMARK_GROUPS) {
    const ptsG = landmarkGroups[group.id];
    if (!ptsG) continue;
    ctx.fillStyle = group.color;
    ctx.strokeStyle = group.color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.8;

    for (const p of ptsG) {
      ctx.beginPath();
      ctx.arc(p.x * vw, p.y * vh, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    if (ptsG.length > 1) {
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(ptsG[0].x * vw, ptsG[0].y * vh);
      for (let i = 1; i < ptsG.length; i++) {
        ctx.lineTo(ptsG[i].x * vw, ptsG[i].y * vh);
      }
      ctx.stroke();
    }
  }

  if (history.length > 2) {
    ctx.globalAlpha = 0.7;
    const graphW = 120;
    const graphH = 40;
    const graphX = 8;
    const graphY = vh - graphH - 8;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(graphX, graphY, graphW, graphH);

    const colors = ["#22d3ee", "#22d3ee", "#facc15", "#f472b6"];
    const keys: (keyof MovementSample)[] = [
      "left_eye",
      "right_eye",
      "nose",
      "mouth",
    ];

    for (let k = 0; k < keys.length; k++) {
      ctx.strokeStyle = colors[k];
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < history.length; i++) {
        const val = Math.min(1, (history[i][keys[k]] as number) * 50);
        const x = graphX + (i / (history.length - 1)) * graphW;
        const y = graphY + graphH - val * graphH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "9px monospace";
    ctx.fillText("LANDMARK MOVEMENT", graphX + 2, graphY - 3);
  }

  // Janelas de amostragem de óculos + profundidade medida (calibração).
  if (glasses) {
    const sx = vw / glasses.frameW;
    const sy = vh / glasses.frameH;
    ctx.font = "10px monospace";
    ctx.lineWidth = 1.5;
    for (const r of glasses.regions) {
      ctx.strokeStyle = r.hasBand ? "#22ff88" : "#ff5577";
      ctx.globalAlpha = 0.9;
      ctx.strokeRect(r.x * sx, r.y * sy, r.w * sx, r.h * sy);
      ctx.fillStyle = r.hasBand ? "#22ff88" : "#ff5577";
      ctx.fillText(
        r.depth.toFixed(0),
        r.x * sx + 1,
        r.y * sy - 2 < 8 ? r.y * sy + r.h * sy + 10 : r.y * sy - 2,
      );
    }
    ctx.fillStyle = glasses.detected ? "#22ff88" : "#ff5577";
    ctx.fillText(
      glasses.detected ? "OCULOS: SIM" : "OCULOS: NAO",
      8,
      14,
    );
  }

  ctx.globalAlpha = 1;
}
