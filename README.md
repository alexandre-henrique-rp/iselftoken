# iSelfToken – Frontend

Aplicação web para conectar investidores e startups. Construída com Next.js (App Router), React, TypeScript e componentes UI customizados. Segue Clean Architecture, Clean Code, SOLID e prioriza validações com Zod e formulários com react-hook-form.

## Stack

- Next.js 15.4.6 (App Router), React 19.1.0, TypeScript 5
- Tailwind CSS 4, componentes UI custom (inspirados em shadcn), Radix UI (Dialog, Label, Slot)
- Formulários: react-hook-form 7.62 + zod 4.0.17
- Máscaras: remask 1.2.2 com handlers em `src/lib/mask-utils.ts`
- Utilitários: class-variance-authority, clsx, tailwind-merge
- Dev: ESLint 9, Prettier 3.6.2, PostCSS

## Documentação

- Tecnologias e Arquitetura: `doc/context/01-tecnologias-arquitetura.md`
- Visão geral, princípios e regras: `doc/context/02-visao-geral-principios-regras.md`
- Páginas públicas: `doc/context/frontend-login.md`, `frontend-register.md`, `frontend-a2f.md`, `frontend-recuperar-redefinir-senha.md`
- Checklist de implementações: `doc/todo/checklist-implementacoes.md`

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
