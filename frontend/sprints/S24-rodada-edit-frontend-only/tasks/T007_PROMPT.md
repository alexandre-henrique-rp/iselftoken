---
id: "T007"
status: "pending"
type: "frontend"
sprint: "S24-rodada-edit-frontend-only"
milestone: "M4"
owner: "frontend"
estimatedEffort: 0.3
complexity: "simple"
dependencies: ["T005"]
---

# Task T007 — Adicionar nav item 'Rodada' em `edit-startup-nav.tsx`

## Contexto

O nav lateral de `/founder/startups/:id/edit` é controlado por `app/components/founder/edit-startup-nav.tsx`. O array `navItems` (linhas 17-22) define 4 itens: Identidade, Time, Documentos, Bancário. Precisamos adicionar "Rodada" na posição 2 (entre Identidade e Time) com ícone `Coins` (lucide-react) — alinhado com a nova rota registrada em T06.

## Descrição

Modificar `app/components/founder/edit-startup-nav.tsx`:

**Mudança 1 — imports (linha 2-8):** adicionar `Coins` ao import do `lucide-react`.

```typescript
// ANTES (linha 2-8):
import {
  User,
  Users,
  FileText,
  Landmark,
  type LucideIcon,
} from "lucide-react";

// DEPOIS:
import {
  User,
  Users,
  Coins,
  FileText,
  Landmark,
  type LucideIcon,
} from "lucide-react";
```

**Mudança 2 — array `navItems` (linhas 17-22):** inserir `{ label: "Rodada", href: "rodada", icon: Coins }` na posição 2.

```typescript
// ANTES (linha 17-22):
const navItems: NavItem[] = [
  { label: "Identidade", href: "",            icon: User },
  { label: "Time",       href: "time",        icon: Users },
  { label: "Documentos", href: "documentos",  icon: FileText },
  { label: "Bancário",   href: "bancario",    icon: Landmark },
];

// DEPOIS:
const navItems: NavItem[] = [
  { label: "Identidade", href: "",            icon: User },
  { label: "Rodada",     href: "rodada",      icon: Coins },
  { label: "Time",       href: "time",        icon: Users },
  { label: "Documentos", href: "documentos",  icon: FileText },
  { label: "Bancário",   href: "bancario",    icon: Landmark },
];
```

## Escopo Cirúrgico

### Paths allowlist (MODIFICAÇÃO)

- `app/components/founder/edit-startup-nav.tsx` (modificar — +3 linhas)

### Paths proibidos

- Qualquer outro arquivo

## Acceptance Criteria

- [ ] `navItems` contém 5 itens (Identidade, Rodada, Time, Documentos, Bancário)
- [ ] "Rodada" na posição 2 (índice 1 do array — entre Identidade e Time)
- [ ] Ícone `Coins` importado de `lucide-react` (não inventar outro)
- [ ] `href="rodada"` — vira `/founder/startups/:id/edit/rodada` via `base + item.href` (linha 31)
- [ ] Visual idêntico aos outros itens (mesma estrutura JSX no map)
- [ ] `npm run typecheck` passa

## Ponteiros de Contexto

- **Arquivo alvo:** `app/components/founder/edit-startup-nav.tsx:1-22` (imports + navItems)
- **AGENTS.md:** `app/components/founder/AGENTS.md` (seção "Edição de startup (header/nav/rail/action)")
- **Icons disponíveis:** lucide-react — `Coins` é o ícone correto (moedas/finanças) para representar Rodada/Captação

## Dependências

- **Bloqueia:** T010 (smoke test — nav precisa estar atualizado)
- **Bloqueada por:** T005 (rota precisa existir para o `href` apontar corretamente)

## Status Final Esperado

`app/components/founder/edit-startup-nav.tsx` com 5 nav items (3 linhas adicionadas). Typecheck verde. Nav lateral mostra "Rodada" entre Identidade e Time.