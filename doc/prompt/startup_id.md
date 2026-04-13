# 📑 Prompt de Desenvolvimento: Página de Edição de Startup (iSelfToken)

## 📋 Contexto Técnico
- **Framework:** Next.js v15.5.3 (App Router)
- **Estilização:** Tailwind CSS v3.4+
- **Linguagem:** TypeScript
- **Design System:** iSelfToken (Baseado em `padroes.md` - *Magenta Elegante*).
- **Arquitetura:**
    - `page.tsx`: **Server Component** (Responsável pelo fetch inicial dos dados pelo ID).
    - `StartupEditForm.tsx`: **Client Component** (Responsável por todo o estado, validação, tabs e envio).

---

## 🎯 Objetivo
Desenvolver o módulo de edição de Startups dentro do painel administrativo. O layout deve ser profissional (Fintech/Premium), responsivo e suportar temas Dark/Light (prioridade Dark).

Como o **Menu Lateral e Header já existem** no layout global, este componente deve focar exclusivamente na **Área de Conteúdo**, utilizando um sistema de **Abas Internas** para organizar a grande quantidade de dados.

---

## 🎨 Diretrizes de Design (iSelfToken)

Utilize estritamente as classes do guia de estilos:

### Paleta e Superfícies
- **Background Geral:** `bg-primary` (Dark: #171717 / Light: Cinza Suave).
- **Cards/Seções:** `card-premium` (`bg-card border border-subtle`).
- **Destaque:** `text-accent` (#d500f9) para elementos ativos ou títulos principais.

### Componentes de Formulário
- **Inputs:** `input-premium` (Borda sutil, foco magenta, fundo escuro em dark mode).
- **Botões:**
    - Salvar: `btn-success` (Gradiente/Sólido Magenta + Sombra).
    - Adicionar Item: `btn-secondary` (Outline discreto).
    - Cancelar: `btn-cancel` ou `btn-ghost`.
- **Tipografia:**
    - Títulos de Seção: `text-lg font-medium text-primary`.
    - Labels: `text-sm font-medium text-secondary`.
    - Placeholders: `text-muted`.

---

## 📐 Representação do Layout (Wireframe da Área de Conteúdo)

Para evitar um scroll infinito, utilize um componente de **Tabs (Abas)** no topo do formulário.

```text
+-----------------------------------------------------------------------+
|  [ Título: Editar Startup: TechStart ]      [ Status: Ativa 🟢 ]      |
+-----------------------------------------------------------------------+
|                                                                       |
|  [ NAV TABS: border-b border-subtle                                ]  |
|  | [🏢 Dados Gerais] [🌍 Localização] [💰 Financeiro] [👥 Time] [⚙️ Config] |
|  | (Aba Ativa: border-b-2 border-accent text-accent)               |  |
|                                                                       |
|  +-----------------------------------------------------------------+  |
|  |  CONTEÚDO DA ABA (Animado: Fade In)                             |  |
|  |                                                                 |  |
|  |  +--- Card Premium: Identidade ------------------------------+  |  |
|  |  |                                                           |  |
|  |  | [ Logo (Circle Avatar) ]  [ Upload Botão (Ghost) ]        |  |
|  |  |                                                           |  |
|  |  | Grid 2 Cols:                                              |  |
|  |  | [ Label: Nome Fantasia ]    [ Label: Razão Social       ] |  |
|  |  | [ Input Premium        ]    [ Input Premium             ] |  |
|  |  |                                                           |  |
|  |  | Grid 3 Cols:                                              |  |
|  |  | [ CNPJ (Mask)   ]  [ Dt Fundação ]  [ Área Atuação      ] |  |
|  |  +-----------------------------------------------------------+  |  |
|  |                                                                 |  |
|  |  +--- Card Premium: Descritivo (Rich Text/Area) -------------+  |  |
|  |  | [ Label: O Problema                                     ] |  |
|  |  | [ Textarea (min-h-[100px])                              ] |  |
|  |  |                                                           |  |
|  |  | [ Label: A Solução                                      ] |  |
|  |  | [ Textarea                                              ] |  |
|  |  +-----------------------------------------------------------+  |  |
|  |                                                                 |  |
|  +-----------------------------------------------------------------+  |
|                                                                       |
|  +--- Action Bar (Sticky Bottom ou Footer) -----------------------+   |
|  |                                    [ Cancelar ] [ Salvar 💾 ]  |   |
|  +----------------------------------------------------------------+   |
+-----------------------------------------------------------------------+
```

## 🛠️ Regras de Negócio e Comportamento

1. Componente de Seleção de País (Lógica Complexa)
- API: Ao montar, buscar GET /api/location/countries.
- Interface: Select ou Combobox pesquisável.
- Visualização: ${emoji} ${nome} (ex: 🇧🇷 Brasil).
- Estado: O valor selecionado no input é o iso3 (chave única).
- Persistência: Ao salvar, deve-se enviar o objeto completo:

```JSON

"pais": { "iso3": "BRA", "nome": "Brasil", "emoji": "🇧🇷" }
```
2. Seção de Recursos (Financeiro) - Validação de Soma
- O campo recursos possui várias chaves (marketing, desenvolvimento, etc).
- Utilizar Sliders (Range) estilizados com a cor accent.
- Exibir a porcentagem ao lado de cada slider.
- Regra: Exibir um totalizador grande. Se Soma != 100%, mostrar alerta visual (vermelho) e desabilitar o botão de salvar.

3. Listas Dinâmicas (Arrays)
- Para os campos redes, socios, teams, selos:
- Layout: Grid de cards pequenos (não usar tabelas largas).
- Ações: Botão "Adicionar" (abre modal ou form inline). Nos cards existentes: botões de "Editar" e "Excluir".
- Teams: Incluir preview da foto_url (Avatar) se houver.

4. Validação e Máscaras
- CNPJ: Máscara 00.000.000/0000-00.
- Moeda: Campos como valuation_calculado e meta_captacao devem formatar BRL automaticamente.

- Datas: Inputs date padrão, convertidos para string YYYY-MM-DD no payload.

## 🧬 Estrutura de Dados (Payload PUT)
O formulário deve mapear os inputs para este JSON exato no submit:

```typescript
interface StartupUpdatePayload {
  nome: string;
  razao_social: string;
  cnpj: string;
  pais: { iso3: string; nome: string; emoji: string }; // Select
  area_atuacao: string;
  estagio: string;
  campanha: Array<{
    id: number;
    status: string;
    dt_inicio: string;
    dt_fim: string;
    meta_captacao: number;
    equity_oferecido: number;
  }>;
  valuation_calculado: number;
  redes: Array<{ id: number; nome: string; url: string }>;
  status: string;
  data_fundacao: string;
  site: string;
  logo_url: string;
  descritivo_basico: string;
  total_captado: number;
  pdf_url: string;
  youtube_url: string;
  banco: {
    nome: string;
    agencia: string;
    conta: string;
    tipo: "Conta Corrente" | "Conta Poupança";
    nome_titular: string;
  };
  recursos: { // Soma deve ser 100
    fundados: number;
    desenvolvimento: number;
    comercial: number;
    marketing: number;
    nuvem: number;
    juridico: number;
    reserva: number;
  };
  problema: string;
  solucao: string;
  diferencial: string;
  modelo_receita: string;
  mercado_alvo: string;
  compradores: string;
  socios: Array<{ id: number; nome: string; porcentagem: number; percentual_time: string }>;
  teams: Array<{ id: number; nome: string; cargo: string; foto_url: string }>;
  // Configurações e Flags
  part_lucro: boolean;
  part_lucro_regras: string;
  beneficios: boolean;
  beneficios_regras: string;
  termos: boolean;
  repasse: boolean;
  selos: Array<{ id: number; nome: string; url: string }>;
  premio: boolean;
  premio_dt: string;
  premio_pg: string;
  ativo: string;     // Status cliente
  ativo_adm: string; // Status admin
}
```
## ✅ Instruções para o AI Developer
1. Crie page.tsx:
    - Obtenha o params.id.
    - Faça o fetch inicial dos dados (Server Side).
    - Renderize <StartupEditForm initialData={data} />.

2. Crie StartupEditForm.tsx:
    - Use useForm (react-hook-form) com zod para validação.
    - Implemente o estado para controle das abas (activeTab).
    - Implemente useEffect para carregar a lista de países.
    - Implemente componentes auxiliares visuais (ResourceSlider, DynamicList, MoneyInput) para manter o código limpo.
    - Garanta que o botão "Salvar" envie o método PUT com o JSON estruturado corretamente.

3. UX Final:
    - Adicione feedback visual (Toast) ao salvar.
    - Adicione loading state (isSubmitting) desabilitando o botão salvar.