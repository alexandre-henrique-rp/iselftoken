# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: notifications-multiline.spec.ts >> Notifications — descrição multi-linha (whitespace-pre-wrap) >> description com \n\n quebra em múltiplas linhas visíveis no card
- Location: test/e2e/flows/notifications-multiline.spec.ts:78:3

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