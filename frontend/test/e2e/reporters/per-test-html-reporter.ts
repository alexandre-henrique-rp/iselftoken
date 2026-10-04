/**
 * Per-Test HTML Reporter.
 *
 * ESTRUTURA FINAL (1 pasta por teste):
 * test-results/
 * └── <test-slug>-chromium/
 *     ├── video.webm     ← gravacao do teste (movido de result.attachments)
 *     ├── report.html    ← este reporter (standalone HTML)
 *     └── final.png      ← screenshot final (movido de result.attachments)
 *
 * O video e screenshot sao acessados via result.attachments[].path
 * ANTES do Playwright limpar o outputDir (que ocorre no final do onEnd).
 */
import type { FullResult, Reporter, Suite, TestCase, TestResult } from "@playwright/test/reporter";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEST_RESULTS_DIR = path.resolve(__dirname, "../../../test-results");

class PerTestHtmlReporter implements Reporter {
  private records: { test: TestCase; result: TestResult }[] = [];

  private friendlySlug(test: TestCase): string {
    const titleSlug = test.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
    const projectSlug = test.parent.project()?.name ?? "default";
    return `${titleSlug}-${projectSlug}`;
  }

  /**
   * Move video + screenshot de result.attachments para nossa pasta.
   * IMPORTANTE: isto deve rodar em onTestEnd porque o Playwright limpa
   * o outputDir DEPOIS de onEnd. Antes disso, attachments estao acessiveis.
   */
  private moveArtifacts(test: TestCase, result: TestResult, ourDir: string): void {
    if (!fs.existsSync(ourDir)) fs.mkdirSync(ourDir, { recursive: true });

    for (const att of result.attachments || []) {
      if (!att.path || !fs.existsSync(att.path)) continue;

      if (att.name === "video" || att.contentType === "video/webm") {
        try { fs.renameSync(att.path, path.join(ourDir, "video.webm")); } catch {}
      } else if (att.name.startsWith("test-") && att.contentType === "image/png") {
        try { fs.renameSync(att.path, path.join(ourDir, "final.png")); } catch {}
      }
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    this.records.push({ test, result });

    // MOVER ARTEFATOS AQUI (antes do Playwright limpar outputDir)
    const ourDir = path.join(TEST_RESULTS_DIR, this.friendlySlug(test));
    this.moveArtifacts(test, result, ourDir);
  }

  onEnd(result: FullResult): void {
    // Gerar report.html para cada teste
    for (const { test, result: r } of this.records) {
      const ourDir = path.join(TEST_RESULTS_DIR, this.friendlySlug(test));
      const reportPath = path.join(ourDir, "report.html");
      const videoPath = path.join(ourDir, "video.webm");
      const finalPath = path.join(ourDir, "final.png");
      const videoExists = fs.existsSync(videoPath);
      const finalExists = fs.existsSync(finalPath);

      const status = (r.status || "unknown").toUpperCase();
      const passed = status === "PASSED";
      const duration = ((r.duration || 0) / 1000).toFixed(1);
      const errorMsg = r.error?.message || "";
      const stack = r.error?.stack || "";
      const browser = test.parent.project()?.name ?? "chromium";

      const steps = r.steps || [];
      const stepsHtml = steps.length === 0
        ? '<p class="muted">Nenhum step registrado</p>'
        : `<ol class="steps">${steps.map((s) => {
            const stepError = !!s.error;
            const icon = stepError ? "❌" : "✅";
            const stepDur = ((s.duration || 0) / 1000).toFixed(2);
            return `<li class="${stepError ? "step-fail" : "step-ok"}">
              <span class="step-icon">${icon}</span>
              <span class="step-title">${escapeHtml(s.title)}</span>
              <span class="step-duration">${stepDur}s</span>
              ${stepError ? `<pre class="step-error">${escapeHtml(s.error?.message || "")}</pre>` : ""}
            </li>`;
          }).join("")}</ol>`;

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(test.title)} — ${status}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0a0a0a; color: #e5e5e5; padding: 24px; line-height: 1.6; }
  .container { max-width: 1200px; margin: 0 auto; }
  h1 { font-size: 28px; font-weight: 900; margin-bottom: 8px; }
  .badge { display: inline-block; padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
  .badge-pass { background: #10b98120; color: #10b981; border: 1px solid #10b98140; }
  .badge-fail { background: #ef444420; color: #ef4444; border: 1px solid #ef444440; }
  .meta { display: flex; gap: 16px; margin: 16px 0 24px; font-size: 13px; color: #a3a3a3; flex-wrap: wrap; }
  .meta-item { background: #1a1a1a; padding: 8px 14px; border-radius: 8px; border: 1px solid #262626; }
  .meta-label { color: #737373; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; display: block; }
  .meta-value { color: #f5f5f5; font-weight: 600; }
  .section { background: #111; border: 1px solid #262626; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
  .section h2 { font-size: 16px; font-weight: 700; margin-bottom: 12px; color: #f5f5f5; }
  .steps { list-style: none; padding: 0; }
  .steps li { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 8px; margin-bottom: 4px; font-size: 14px; }
  .step-ok { background: #10b98108; }
  .step-fail { background: #ef444408; }
  .step-icon { font-size: 16px; }
  .step-title { flex: 1; }
  .step-duration { color: #737373; font-size: 12px; font-family: monospace; }
  .step-error { width: 100%; margin-top: 8px; padding: 10px; background: #1a0505; border: 1px solid #ef444430; border-radius: 6px; color: #fca5a5; font-size: 12px; overflow-x: auto; }
  pre { background: #0a0a0a; border: 1px solid #262626; padding: 12px; border-radius: 8px; overflow-x: auto; font-size: 12px; color: #fca5a5; }
  .video-link { display: inline-flex; align-items: center; gap: 8px; padding: 12px 20px; background: #d500f9; color: white; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; }
  .video-link:hover { background: #b000d0; }
  video { width: 100%; max-height: 500px; background: #000; border-radius: 8px; }
  .screenshot { max-width: 100%; border: 1px solid #262626; border-radius: 8px; margin-top: 12px; }
  .muted { color: #737373; font-style: italic; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #262626; color: #525252; font-size: 11px; text-align: center; }
</style>
</head>
<body>
<div class="container">
  <h1>${escapeHtml(test.title)}</h1>
  <span class="badge ${passed ? "badge-pass" : "badge-fail"}">${passed ? "✅ PASSOU" : "❌ FALHOU"}</span>

  <div class="meta">
    <div class="meta-item"><span class="meta-label">Duracao</span><span class="meta-value">${duration}s</span></div>
    <div class="meta-item"><span class="meta-label">Browser</span><span class="meta-value">${browser}</span></div>
    <div class="meta-item"><span class="meta-label">Steps</span><span class="meta-value">${steps.length}</span></div>
    <div class="meta-item"><span class="meta-label">Arquivo</span><span class="meta-value">${escapeHtml(path.basename(test.location?.file || "unknown"))}:${test.location?.line || "?"}</span></div>
  </div>

  ${videoExists ? `
  <div class="section">
    <h2>🎬 Video da execucao</h2>
    <video controls src="video.webm"></video>
    <p style="margin-top:12px;"><a class="video-link" href="video.webm" download>⬇ Baixar video (WebM)</a></p>
  </div>` : `
  <div class="section">
    <h2>🎬 Video</h2>
    <p class="muted">Video nao disponivel para este teste.</p>
  </div>`}

  ${errorMsg ? `
  <div class="section">
    <h2>❌ Erro</h2>
    <pre>${escapeHtml(errorMsg)}</pre>
    ${stack ? `<details><summary style="cursor:pointer;color:#a3a3a3;margin-bottom:8px;">Stack trace</summary><pre>${escapeHtml(stack)}</pre></details>` : ""}
  </div>` : ""}

  <div class="section">
    <h2>📋 Steps executados (${steps.length})</h2>
    ${stepsHtml}
  </div>

  ${finalExists ? `
  <div class="section">
    <h2>📸 Ultimo screenshot</h2>
    <img class="screenshot" src="final.png" alt="Screenshot final do teste" />
  </div>` : ""}

  <div class="footer">
    Relatorio gerado em ${new Date().toISOString()} • Playwright Per-Test HTML Reporter
  </div>
</div>
</body>
</html>`;

      fs.writeFileSync(reportPath, html, "utf-8");
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default PerTestHtmlReporter;
