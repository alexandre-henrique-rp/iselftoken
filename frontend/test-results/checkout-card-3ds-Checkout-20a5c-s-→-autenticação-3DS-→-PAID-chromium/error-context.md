# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: checkout-card-3ds.spec.ts >> Checkout Cartão + 3DS — E2E (S08-S10) >> Cartão parcelado (6x) → mostra juros → autenticação 3DS → PAID
- Location: test/e2e/flows/checkout-card-3ds.spec.ts:59:3

# Error details

```
Error: browserType.launch: Executable doesn't exist at /home/kingdev/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell
╔════════════════════════════════════════════════════════════╗
║ Looks like Playwright was just installed or updated.       ║
║ Please run the following command to download new browsers: ║
║                                                            ║
║     pnpm exec playwright install                           ║
║                                                            ║
║ <3 Playwright Team                                         ║
╚════════════════════════════════════════════════════════════╝
```