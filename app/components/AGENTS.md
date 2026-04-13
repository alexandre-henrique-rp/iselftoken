# COMPONENTS KNOWLEDGE BASE

**Generated:** 2026-03-21
**Domain:** UI Component Library

## OVERVIEW

React component library: shadcn/ui primitives, startup investment cards, geographic selectors, and public page layouts.

## STRUCTURE

```
components/
├── ui/                   # shadcn/ui primitives (19 files)
├── startup/              # Investment opportunity cards (6 files)
├── layout_public/        # Public page layouts (Hero, AuthHero)
├── selectCidade.tsx      # City selector (Brazilian municipalities)
├── selectEstado.tsx      # State selector (Brazilian states)
├── selectPais.tsx        # Country selector
├── app-sidebar.tsx       # Main app sidebar
├── nav-main.tsx          # Primary navigation
├── nav-user.tsx          # User menu dropdown
└── team-switcher.tsx     # Team/organization switcher
```

## UI LIBRARY

shadcn/ui primitives in `ui/` — Radix + Tailwind CSS v4:
- **Layout:** card, separator, skeleton, sidebar
- **Forms:** button, input, label, select, textarea
- **Overlays:** dialog, dropdown-menu, sheet, tooltip
- **Data:** badge, avatar, breadcrumb, collapsible
- **Feedback:** sonner (toast notifications), animated-theme-toggler

## PATTERNS

- Radix primitives wrapped with Tailwind classes
- `cn()` from `lib/utils.ts` for conditional class merging
- `class-variance-authority` (cva) for variant-based styling
- Forward refs for all interactive components
- Slot-based composition via Radix `asChild` prop

## COMPONENTS

**startup/:** Investment-focused cards
- `OpportunityCard` — main investment opportunity display
- `RodadaCard` — funding round information
- `MediumCard` — medium-sized content card
- `Badge` — status/label badges
- `Carousel3D` — 3D carousel for featured startups

**layout_public/:** Public-facing page sections
- `AuthHero` — authentication page hero section

**Geographic selectors:** Cascading location pickers
- `selectPais` → `selectEstado` → `selectCidade`
