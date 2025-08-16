# ** nome:** Termos de Uso
# ** rota:** /termos-de-uso

## ** descrição:** 
- Página pública com o documento de Termos de Uso da plataforma.
- Estrutura com conteúdo principal e sumário lateral.

## ** funcionalidades embarcadas:** 
- Seções numeradas (Introdução, Aceitação, Cadastro, Uso Permitido, etc.).
- Sumário lateral com âncoras para navegação rápida.
- Badge com data de atualização.
- Link para voltar ao início.

## ** componentes e arquivos relacionados:**
- Página: `src/app/(public)/termos-de-uso/page.tsx`
  - Usa `Card`, `Badge`, links com âncoras e classes utilitárias.
  - Exporta metadata da página (título e descrição).

## ** UX/Validações:**
- Conteúdo semanticamente estruturado com headings e seções.
- Links âncora no sumário apontando para as seções.

## ** restrições:** 
- Conteúdo estático no frontend; atualização manual.

## ** Observações de UI:**
- Badge de atualização: “Atualizado em 15/08/2025”.
- Ação de retorno: link “← Voltar para o início”.
