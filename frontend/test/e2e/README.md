# E2E Playwright Tests

Testes E2E que simulam o fluxo UX real com cliques no navegador Chromium.

## Como rodar

```bash
cd frontend
npx playwright install chromium   # 1x only
npm run test:e2e:playwright      # headless
npm run test:e2e:playwright:ui  # Playwright UI (debug)
npm run test:e2e:playwright:headed  # headed mode
```

## Config

- `playwright.config.ts` — webServer sobe `npm run dev` automaticamente
- Backend deve estar rodando em `http://localhost:7077`

## Fluxo testado

`user-registration-to-plan-purchase.spec.ts` — 9 steps:

1. Registro 3 steps (dados / senha / termos)
2. Validacao email (backend)
3. Login
4. 2FA (captura codigo via BFF dev-only)
5. Pricing (lista de planos)
6. Comprar plano
7. Simular pagamento
8. Validar PAID
9. Home (layout autenticado)

## Debug

Videos e screenshots gerados automaticamente em `test-results/playwright/` em caso de falha.
