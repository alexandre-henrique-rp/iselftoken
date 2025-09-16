# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `npm run dev` (opens on http://localhost:3000)
- **Build**: `npm run build` (Next.js production build)
- **Production server**: `npm run start`
- **Linting**: `npm run lint` (ESLint with Next.js config)
- **Testing**: `npm test` (Jest with jsdom environment)

## Project Architecture

This is a Next.js 15.4.6 application using the App Router with React 19.1.0 and TypeScript, designed to connect investors and startups through a digital platform.

### Key Technologies & Libraries

- **UI Framework**: Custom UI components in `src/components/ui/` inspired by shadcn, built with Radix UI primitives
- **Forms**: `react-hook-form` 7.62 with `zod` 4.0.17 for validation
- **Styling**: Tailwind CSS 4 with `class-variance-authority`, `clsx`, and `tailwind-merge`
- **Input Masking**: `remask` 1.2.2 with utilities in `src/lib/mask-utils.ts`
- **Icons**: Lucide React and Tabler Icons

### Folder Structure

- `src/app/` - Next.js App Router pages with route groups:
  - `(public)/` - Public routes (login, register, password recovery)
  - `(protected)/` - Authenticated routes with shared layout
- `src/components/` - Reusable components
  - `ui/` - Base UI components (Button, Input, Dialog, etc.)
  - `register/` - Registration form components
  - `business/` - Business logic components
- `src/lib/` - Utility functions and configurations
- `src/data/` - Mock data and static content
- `src/types/` - TypeScript type definitions
- `src/rotas/` - Route configuration by user role

### Authentication & User Roles

The application supports multiple user roles with role-based routing:
- **Investor**: Investment opportunities, profile management
- **Startup/Founder**: Company dashboard, pitch management  
- **Admin**: Administrative functions
- **Affiliate**: Partner management

Route configurations are defined in `src/rotas/` with separate files for public and private routes by role.

### Form Handling Patterns

All forms use `react-hook-form` with Zod schemas for validation:
- Registration forms are componentized in `src/components/register/`
- Input masking is handled via `src/lib/mask-utils.ts` with predefined patterns for CPF, CNPJ, phone, and CEP
- Form data is sanitized (unmasked) before API submission

### API Routes

API endpoints are in `src/app/api/` following Next.js 13+ conventions:
- Authentication endpoints (`auth/`, `register/`)
- User profile management (`perfil/`)
- Startup data (`startup/`)
- Location services (`location/`)

### Development Standards

- Follow Clean Architecture principles where applicable
- Use TypeScript strict mode - avoid `any` types
- Component naming and documentation in Portuguese for domain-specific content
- Variable and function names in English
- Commits follow semantic commit patterns with emojis (gitmoji style)
- SSR/CSR stability - avoid hydration mismatches

### Testing

- Jest configuration with jsdom environment
- Test setup in `src/setupTests.ts`
- Path aliases configured: `@/*` maps to `src/*`
- Focus on testing Zod schemas, form validation, and authentication flows

### Mask Utilities

The `src/lib/mask-utils.ts` provides:
- Predefined patterns for Brazilian document formats (CPF, CNPJ, phone, CEP)
- Apply/remove mask functions for each type
- Ready-to-use onChange handlers for form inputs
- Always unmask values before API submission