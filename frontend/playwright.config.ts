import { defineConfig, devices } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Playwright E2E configuration — iSelftoken frontend.
 *
 * **Estrutura de saida (1 pasta por teste):**
 * test-results/
 * └── <test-slug>-chromium/
 *     ├── video.webm     ← gravacao completa do teste
 *     ├── report.html    ← relatorio visual individual deste teste
 *     └── final.png      ← ultimo screenshot do teste
 *
 * webServer: spawna `npm run dev` (Vite SSR) em background.
 * Backend ja deve estar rodando em http://localhost:7077.
 */

export default defineConfig({
  testDir: "./test/e2e/flows",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,

  // outputDir: cada teste ganha sua propria pasta aqui
  outputDir: path.resolve(__dirname, "test-results"),
  preserveOutput: "always",  // SEMPRE preservar (mesmo em sucesso)

  // Apenas 2 reporters: list (terminal) + custom HTML por teste
  reporter: [
    ["list"],
    // Custom HTML reporter: gera 1 report.html POR TESTE em test-results/<test>/
    ["./test/e2e/reporters/per-test-html-reporter.ts"],
  ],

  use: {
    baseURL: "http://localhost:5173",
    trace: "off",        // OFF (video + HTML cobrem o debug)
    screenshot: "only-on-failure", // apenas final.png em falha
    video: "on",         // SEMPRE grava video
    // slowMo: 250ms entre cada acao do Playwright (click, fill, type, hover).
    // Isso faz a gravacao parecer um humano (e nao um robo a 1000cps).
    // Combinado com type() com delay entre chars, o video fica fluido.
    launchOptions: { slowMo: 250 },
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
