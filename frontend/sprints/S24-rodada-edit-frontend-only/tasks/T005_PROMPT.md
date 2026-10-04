---
id: "T005"
status: "pending"
type: "frontend"
sprint: "S24-rodada-edit-frontend-only"
milestone: "M4"
owner: "frontend"
estimatedEffort: 1.5
complexity: "simple"
dependencies: ["T003", "T004"]
---

# Task T005 — Rota `edit-startup-rodada.tsx`

## Contexto

Esta rota é o shell que compõe a aba "Rodada" dentro de `/founder/startups/:id/edit`. Segue o mesmo padrão de `edit-startup-identidade.tsx` (route shell que orquestra seções + aside + handlers mock).

## Descrição

Criar `app/routes/private/edit-startup-rodada.tsx` com:

```typescript
import { useEffect, useState } from "react";
import { useRouteLoaderData } from "react-router";
import type { Route } from "./+types/edit-startup-rodada";
import { RodadaCaptacaoTab } from "~/components/founder/rodada-captacao-tab";
import { RodadaDistribuicaoTab } from "~/components/founder/rodada-distribuicao-tab";
import { TipCard } from "~/components/founder/edit-startup-rail";
import { PublicPreviewCard } from "~/components/founder/public-preview-card";
import { useEditStartupForm } from "~/lib/edit-startup-form-context";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import type { loader as layoutLoader } from "./edit-startup-layout";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Rodada | Editar Startup | iSelfToken" },
    { name: "description", content: "Edite os termos e a distribuição de recursos da rodada de captação." },
  ];
}

type ActiveTab = 'captacao' | 'distribuicao';

export default function EditStartupRodadaPage() {
  const startup = useRouteLoaderData<typeof layoutLoader>("routes/private/edit-startup-layout");
  const { registerHandlers, reportStatus, registerSectionReset } = useEditStartupForm();
  const [activeTab, setActiveTab] = useState<ActiveTab>('captacao');

  useEffect(() => {
    registerHandlers({
      onSave: () => toast.success("Alterações salvas (mock)"),
      onDiscard: () => toast.info("Alterações descartadas"),
    });
  }, [registerHandlers]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-8 space-y-8">
        {/* Segmented control — pattern current-metrics.tsx:62-80 */}
        <div className="flex items-center bg-background/60 border border-white/10 rounded-xl p-1 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('captacao')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition",
              activeTab === 'captacao' ? "bg-primary text-black" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Captação
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('distribuicao')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition",
              activeTab === 'distribuicao' ? "bg-primary text-black" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Distribuição
          </button>
        </div>

        {/* Tabs */}
        {activeTab === 'captacao' && <RodadaCaptacaoTab startup={startup} />}
        {activeTab === 'distribuicao' && <RodadaDistribuicaoTab reportStatus={reportStatus} registerReset={registerSectionReset} />}
      </div>

      <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
        <TipCard>
          Configure a rodada em 2 abas: <strong>Captação</strong> define meta, prazo e status da reserva; <strong>Distribuição</strong> aloca os recursos captados em 7 categorias (soma deve = 100%).
        </TipCard>
        <PublicPreviewCard startup={startup} />
      </aside>
    </div>
  );
}
```

## Escopo Cirúrgico

### Paths allowlist (CRIAÇÃO)

- `app/routes/private/edit-startup-rodada.tsx` (novo)

### Paths proibidos

- `app/routes/private/edit-startup-layout.tsx` (apenas consumir — `useRouteLoaderData`)
- `app/routes.ts` (T006 adiciona a rota)
- `app/components/founder/rodada-{captacao,distribuicao}-tab.tsx` (apenas consumir — T03/T04)

## Acceptance Criteria

- [ ] Rota renderiza sem erro (loader mock retorna dados via `useRouteLoaderData`)
- [ ] Tab `'captacao'` é default ao carregar
- [ ] Segmented control alterna entre Captação/Distribuição via `useState<ActiveTab>`
- [ ] Aside contém `TipCard` (texto novo: "Configure a rodada em 2 abas...") + `PublicPreviewCard`
- [ ] `registerHandlers({ onSave, onDiscard })` chamado em `useEffect` com toasts mock
- [ ] `meta()` retorna título `"Rodada | Editar Startup | iSelfToken"`
- [ ] Tipo `StartupDetail` consumido via `useRouteLoaderData<typeof layoutLoader>`
- [ ] `reportStatus` + `registerSectionReset` propagados para `RodadaDistribuicaoTab`
- [ ] `RodadaCaptacaoTab` recebe `startup` prop diretamente
- [ ] `npm run typecheck` passa
- [ ] Sem warnings no dev server console

## Ponteiros de Contexto

- **Reference:** `app/routes/private/edit-startup-identidade.tsx:1-85` (route shell completo)
- **Pattern segmented control:** `app/components/founder/current-metrics.tsx:62-80`
- **Context:** `useEditStartupForm()` de `app/lib/edit-startup-form-context`
- **AGENTS.md:** `app/routes/AGENTS.md` (route shells ≤ 30-40 linhas — esta task é exceção controlada por composição de tabs)

## Dependências

- **Bloqueia:** T006 (registra rota em `routes.ts`), T007 (nav item — requer rota), T008 (AGENTS.md — menciona rota), T010 (smoke test)
- **Bloqueada por:** T003 + T004 (componentes Tab prontos)

## Status Final Esperado

Arquivo `app/routes/private/edit-startup-rodada.tsx` (~80 LOC) com shell completo + segmented control + 2 tabs + aside + handlers mock. Typecheck verde.