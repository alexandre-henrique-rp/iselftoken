# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `npm run dev` (opens on http://localhost:3000)
- **Build**: `npm run build` (Next.js production build)
- **Production server**: `npm run start`
- **Standalone server**: `npm run server` (runs .next/standalone/server.js)
- **Linting**: `npm run lint` (ESLint with Next.js config)
- **Testing**: `npm test` (Jest with jsdom environment)
- **Single test**: `npm test -- --testNamePattern="test name"` or `npm test path/to/test.test.tsx`

## Project Architecture

This is a Next.js 15.4.6 application using the App Router with React 19.1.0 and TypeScript, designed to connect investors and startups through a digital platform.

### Key Technologies & Libraries

- **UI Framework**: Custom UI components in `src/components/ui/` inspired by shadcn, built with Radix UI primitives
- **Forms**: `react-hook-form` 7.62 with `zod` 4.0.17 for validation
- **Styling**: Tailwind CSS 4 with `class-variance-authority`, `clsx`, and `tailwind-merge`
- **Input Masking**: `remask` 1.2.2 with utilities in `src/lib/mask-utils.ts`
- **Icons**: Lucide React and Tabler Icons
- **Animation**: Framer Motion 12.23 for smooth transitions
- **Internationalization**: next-intl 4.3 with i18next 25.5 for multi-language support
- **Theme**: next-themes 0.4 for dark/light mode switching
- **Data Tables**: TanStack React Table 8.21 for complex data visualization
- **Notifications**: Sonner 2.0 for toast notifications
- **Charts**: Recharts 3.2 for data visualization
- **Authentication**: JWT handling with `jose` 6.1
- **Email**: Nodemailer 7.0 for transactional emails

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
- **Investor** (`investidor`): Investment opportunities, profile management, financial dashboard
- **Startup/Founder** (`fundador`): Company dashboard, pitch management, startup analytics
- **Admin**: Administrative functions and system management
- **Consultant** (`consultor`): Advisory services and consulting features
- **Affiliate** (`afiliado`): Partner management and referral tracking

Route configurations are defined in `src/rotas/` with separate files:
- `src/rotas/public.ts` - Public routes accessible without authentication
- `src/rotas/private/` - Role-specific protected routes (investidor.ts, fundador.ts, admin.ts, consultor.ts)

Each route configuration includes icons from Lucide React, menu groupings, and active status flags.

### Form Handling Patterns

All forms use `react-hook-form` with Zod schemas for validation:
- Registration forms are componentized in `src/components/register/`
- Input masking is handled via `src/lib/mask-utils.ts` with predefined patterns for CPF, CNPJ, phone, and CEP
- Form data is sanitized (unmasked) before API submission

### API Routes

API endpoints are in `src/app/api/` following Next.js 13+ conventions:
- **Authentication**: `auth/` (login, logout, session, 2FA), `register/` (role-specific registration)
- **User Management**: `perfil/[id]/` for profile operations
- **Startup Operations**: `startup/` (CRUD), `startup/dashboard/` (analytics and stats)
- **Location Services**: `location/` (countries, states, cities for address forms)
- **Utilities**: `newcode/` for generating verification codes

All API routes return consistent JSON responses and follow RESTful conventions.

### Development Standards

- Follow Clean Architecture principles where applicable
- Use TypeScript strict mode - avoid `any` types
- Component naming and documentation in Portuguese for domain-specific content
- Variable and function names in English
- Commits follow semantic commit patterns with emojis (gitmoji style)
- SSR/CSR stability - avoid hydration mismatches

### Testing

- **Framework**: Jest with jsdom environment (configured in `jest.config.js`)
- **Setup**: Test setup in `src/setupTests.ts` with `@testing-library/jest-dom`
- **Path Aliases**: `@/*` maps to `src/*` for clean imports
- **Test Location**: Tests are co-located with components in `__tests__/` directories
- **Focus Areas**: Zod schemas, form validation, UI components, and authentication flows
- **Commands**:
  - Run all tests: `npm test`
  - Run specific test: `npm test path/to/test.test.tsx`
  - Run tests by pattern: `npm test -- --testNamePattern="test name"`

### Mask Utilities

The `src/lib/mask-utils.ts` provides comprehensive masking for Brazilian formats:
- **Patterns**: CPF (999.999.999-99), CNPJ (99.999.999/9999-99), Phone [(99) 9999-9999, (99) 9 9999-9999], CEP (99999-999)
- **Functions**: `applyCpfMask()`, `applyCnpjMask()`, `applyPhoneMask()`, `applyCepMask()`, `unmaskValue()`
- **Handlers**: Ready-to-use onChange handlers: `cpfMaskHandler`, `cnpjMaskHandler`, `phoneMaskHandler`, `cepMaskHandler`
- **Usage Pattern**: Apply masks for UI display, always unmask values before API submission using `unmaskValue()`

### Documentation References

The README.md mentions additional documentation in `doc/context/`:
- Technology and architecture details
- Implementation principles and rules
- Page-specific documentation for login, register, 2FA, password recovery
- Implementation checklist in `doc/todo/checklist-implementacoes.md`