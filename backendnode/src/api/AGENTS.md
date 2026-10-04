# API Feature Modules

**Generated:** 2026-03-21
**Location:** `backend/src/api/`
**Files:** 68 TypeScript files across 8 NestJS modules

## OVERVIEW

NestJS feature modules for iSelfToken platform API endpoints, each handling a distinct business domain.

## MODULES

| Module | Files | Responsibility |
|--------|-------|----------------|
| `country` | 8 | Countries/States/Cities CRUD for geographic data |
| `payment` | 8 | C6 Bank PIX and card payment integration |
| `plans` | 9 | SaaS subscription plan management |
| `startup` | 11 | Startup and investment campaign management |
| `subscriptions` | 8 | User plan subscription lifecycle |
| `transactions` | 8 | Investment transaction records |
| `uploads` | 8 | File uploads via AWS S3 |
| `users` | 8 | User profile and account management |

## STRUCTURE

Each module follows consistent organization:

```
module-name/
├── module-name.module.ts      # Module definition, imports
├── module-name.controller.ts  # Route handlers, decorators
├── module-name.service.ts     # Business logic, Prisma calls
├── dto/                       # Data Transfer Objects (class-validator)
│   └── create-*.dto.ts
│   └── update-*.dto.ts
└── entities/                  # Response type definitions
    └── *.entity.ts
```

Note: `startup` module nests service in `service/` subdirectory with additional validators.

## PATTERNS

**Request Flow:**
```
Controller (route + validation) → Service (business logic) → Prisma (DB access)
```

**Module Registration:**
- Each module exports `*Module` class with `@Module()` decorator
- All modules imported in root `AppModule` (`backend/src/app.module.ts`)
- Controllers registered in `controllers: []`, services in `providers: []`

**Validation:**
- DTOs use `class-validator` decorators (`@IsString()`, `@IsEmail()`, etc.)
- Global `ValidationPipe` in `main.ts` auto-validates incoming requests

**Database:**
- Prisma ORM exclusively, no raw SQL
- Services inject `PrismaService` for all DB operations
- Models defined in `backend/prisma/schema.prisma`

**Auth:**
- Protected routes use `@UseGuards(AuthGuard)` from `auth/` module
- JWT token validation, 2FA via email codes
