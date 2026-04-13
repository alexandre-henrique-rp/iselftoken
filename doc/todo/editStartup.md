# Épico: Reformulação do Formulário de Cadastro e Edição de Startup

**Status:** A Fazer
**Responsável:** [Nome do Desenvolvedor]
**Arquivos Principais:**
- **Página:** `src/app/(protected)/dashboard_startups/startup/[id]/page.tsx`
- **Componente do Formulário:** `src/components/dashboard_startup/startup-form.tsx`

---

## 🎯 Objetivo Principal

Reformular completamente a página de edição de startups para oferecer uma experiência de usuário (UX) moderna, profissional e intuitiva. O formulário atual será expandido com novos campos e reestruturado em seções lógicas para facilitar o preenchimento, esse layout deve ser bonito profissional e moderno, tendo cuidado com a estética e a experiencia do usuario, suporte a responsividade e tema dark e light, e tambem isso deve ser aplicado somente para a pagina de edição de startups.

### obs
-pode criar um novo compomente para o formulário de edição de startups, deixando o formulário de cadastro como ele esta

## 🎨 Requisitos de UI/UX

1.  **Layout Profissional:** O design deve ser limpo, moderno e alinhado com a identidade visual do iSelfToken, seguindo os padrões de `doc/context/05-padroes-e-css.md`.
2.  **Navegação por Etapas:** Dado o grande número de campos, o formulário deve ser dividido em seções. Utilizar o componente `Tabs` da Shadcn ou um `Stepper` customizado para guiar o usuário.
3.  **Responsividade:** O layout deve ser totalmente funcional e esteticamente agradável em dispositivos móveis, tablets e desktops.
4.  **Tema Dark/Light:** Suporte completo e consistente para ambos os temas.
5.  **Feedback Visual:**
    *   Utilizar `skeleton loaders` enquanto os dados da startup (em modo de edição) são carregados.
    *   Exibir indicadores de `loading` nos botões durante o envio.
    *   Usar `toasts` (sonner) para mensagens de sucesso e erro.

## 🛠️ Requisitos Técnicos

1.  **Gerenciamento de Formulário:** Utilizar `react-hook-form` para gerenciar o estado e `zod` para validação dos dados.
2.  **Componentização:** Manter a lógica do formulário no componente `startup-form.tsx` e criar subcomponentes para cada seção/etapa (ex: `form-sections/informacoes-basicas.tsx`, `form-sections/documentacao.tsx`).
3.  **Upload de Arquivos:** Para os campos de upload, utilizar um componente de upload de arquivos robusto, como o `comp-545.json` da Origin UI (compatível com Shadcn), que suporte validação de tipo e tamanho.
4.  **Campos Dinâmicos:** O campo `redes_sociais` (JSON) deve ser implementado como uma lista de campos dinâmicos onde o usuário pode adicionar/remover inputs para diferentes redes (LinkedIn, Instagram, etc.).

## 🗂️ Estrutura do Formulário (Sugestão de Seções/Tabs)

### Seção 1: Informações Básicas
-   `nome` (antigo `nome da startup`)
-   `nome_fantasia`
-   `cnpj` (com máscara e botão de consulta de API externa)
-   `data_fundacao` (usar Date Picker)
-   `pais` (usar Select com busca, populado pela API de países)
-   `logo` (upload de imagem, `comp-543.json`)
-   `site`

### Seção 2: Classificação e Mercado
-   `area_atuacao` (Select)
-   `estagio` (Select)
-   `descritivo_basico` (Textarea com contador de caracteres, para o marketplace)
-   `imagem_marketplace` (upload de imagem)

### Seção 3: Apresentação e Pitch
-   `descricao_objetivo` (antigo `objetivo`, Textarea com editor de rich text, se possível)
-   `video_pitch` (Input de URL do YouTube com validação)
-   `pitch_pdf` (Upload de arquivo PDF)
-   `redes_sociais` (Campos dinâmicos para URLs de redes sociais)

### Seção 4: Investimento
-   `meta_captacao` (Input de moeda com máscara)
-   `equity_oferecido` (Input de percentual com máscara)
-   `valuation` (Campo calculado e somente leitura: `meta_captacao / (equity_oferecido / 100)`)

### Seção 5: Documentação (KYB - Know Your Business)
*Todos os campos são de upload de arquivos (PDF, DOCX, JPG, PNG).*
-   `comprovante_situacao_cadastral` (CNPJ)
-   `contrato_social`
-   `documento_nvp` (dados e documento sobre MVP)
-   `certificado_registro_software_patente`
-   `certificado_direitos_autorais`
-   `contrato_confidencialidade`
-   `planejamento_estrategico`
-   `mapeamento_processos_internos`
-   `mapeamento_riscos_juridicos_operacionais`

## 📝 Schema de Validação (Zod)

O schema Zod deve ser atualizado para incluir todos os novos campos, com validações apropriadas:
-   `string().min(1)` para campos obrigatórios.
-   `string().url()` para links.
-   `z.instanceof(File)` para uploads, com `refine` para tipo e tamanho.
-   Validação de CNPJ.
-   Regras de negócio (ex: `meta_captacao` deve estar dentro de um range específico).

## 🌐 Integração com API

-   **Consulta CNPJ:** O botão ao lado do campo CNPJ deve acionar uma chamada `GET /api/cnpj/:cnpj` para preencher automaticamente `nome`, `data_fundacao`, etc.
-   **Submissão:** O formulário deve enviar os dados via `POST /api/startup` (criação) ou `PUT /api/startup/:id` (edição), seguindo o padrão de resposta `{ status, message, data }`.
-   **Uploads:** Cada arquivo deve ser enviado para um endpoint de upload (ex: `POST /api/upload`) que retornará uma URL a ser salva no registro da startup.

## ✅ Critérios de Aceitação (Definition of Done)

-   [ ] O novo layout está implementado, seguindo as diretrizes de UI/UX.
-   [ ] O formulário está dividido em seções navegáveis (Tabs ou Stepper).
-   [ ] Todos os novos campos foram adicionados e estão funcionando.
-   [ ] A validação com Zod cobre todos os campos e regras de negócio.
-   [ ] O upload de arquivos está funcional, com feedback para o usuário.
-   [ ] A consulta de CNPJ preenche os campos corretamente.
-   [ ] O formulário é totalmente responsivo e compatível com os temas dark/light.
-   [ ] A submissão para o backend (simulada ou real) está funcionando para criação e edição.
-   [ ] O código está bem estruturado, componentizado e segue os padrões do projeto.
