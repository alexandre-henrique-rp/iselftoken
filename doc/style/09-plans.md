# Documentação Técnica - Plans (09-plans)

## Informações Gerais

| Propriedade | Valor |
|-------------|-------|
| **Rota** | `/plans` |
| **Path** | `/app/routes/private/plans/index.tsx` |
| **Componentes Únicos** | `/app/routes/private/plans/components/index.tsx` |
| **API Route** | `ApiPage.getPlans()` |
| **Tipo** | Private (requer autenticação) |
| **Framework** | React + Tailwind CSS v4 |
| **Tema** | Dark (stone) |
| **Design System** | shadcn/ui (tema stone) |

---

## Dependências

### Ícones (Lucide React)

```jsx
import {
  BadgeCheck,
  Check,
  Crown,
  Sparkles
} from 'lucide-react';
```

---

## Estrutura da Página

A página é composta por **2 blocos principais**:

1. **Cabeçalho de planos**: tag de destaque, título e subtítulo.
2. **Grid de planos**: cards com destaque visual para o plano recomendado.

---

## 1. Cabeçalho de Planos

### Descrição
Bloco centralizado com tag promocional, título e subtítulo.

### Características
- **Alinhamento**: centralizado
- **Tag**: badge com destaque visual e ícone
- **Título**: tipografia forte com gradiente na palavra-chave
- **Subtítulo**: texto secundário com largura controlada

### Código de Referência
```jsx
<header className="text-center mb-12">
  <div className="inline-flex items-center gap-2 rounded-full bg-fuchsia-500/15 text-fuchsia-200 text-xs font-bold px-4 py-1">
    <span className="h-2 w-2 rounded-full bg-fuchsia-400" />
    MAIS DE 1.000.000 DE USUÁRIOS
  </div>
  <h1 className="mt-6 text-4xl md:text-5xl font-extrabold text-stone-50">
    Planos para times de todos os tamanhos
  </h1>
  <p className="mt-4 text-stone-400 max-w-2xl mx-auto">
    Escolha o plano ideal para acelerar sua jornada na iSelfToken.
  </p>
</header>
```

---

## 2. Grid de Planos

### Estrutura
- **Grid responsivo**: 1 coluna (mobile), 2 colunas (tablet), 3 colunas (desktop)
- **Card recomendado**: maior, com gradiente e badge "Mais popular"

### Card de Plano

| Elemento | Descrição |
|----------|-----------|
| Header | Ícone + nome do plano |
| Preço | Valor mensal/anual |
| Descrição | Texto curto explicativo |
| CTA | Botão com destaque |
| Benefícios | Lista com ícones de check |

### Classes de Estilo

| Elemento | Classe Tailwind |
|----------|-----------------|
| Página | `bg-stone-950 text-stone-50` |
| Card padrão | `bg-stone-900 border border-stone-800` |
| Card destaque | `bg-gradient-to-b from-fuchsia-500 to-pink-500` |
| CTA padrão | `bg-stone-800 hover:bg-stone-700` |
| CTA destaque | `bg-white text-stone-900` |
| Lista de benefícios | `text-stone-300` |

---

## 3. Animações

### Fade in (entrada do cabeçalho)
```css
@keyframes fade-in-down {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## 4. Exemplo JSX

O exemplo completo está em:

- `doc/style/09-plans.jsx`
