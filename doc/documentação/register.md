# ** nome:** Cadastro
# ** rota:** /register

## ** descrição:** 
- Página pública para criação de contas de investidores ou startups.
- Ao abrir, exibe um modal para escolha do tipo de cadastro. Após a escolha, mostra o formulário correspondente.
- Layout em duas colunas com imagem ilustrativa à direita.

## ** funcionalidades embarcadas:** 
- Modal para selecionar tipo de cadastro (Investidor ou Startup).
- Formulário de Investidor (`InvestorForm`) com validação Zod, máscaras (CPF, telefone, CEP) e busca automática de endereço pelo ViaCEP.
- Formulário de Startup (`StartupForm`) com validação Zod, máscaras (CNPJ/CPF quando aplicável, telefone, CEP) e ViaCEP.
- Senha e confirmação com validação (mín. 6 caracteres) e alerta de não coincidência.
- Máscaras com `remask` e handlers em `src/lib/mask-utils.ts`.
- Spinner de carregamento durante a busca de CEP.
- Link para voltar ao login.

## ** componentes e arquivos relacionados:**
- Página: `src/app/(public)/register/page.tsx`
  - Renderiza o grid, modal de escolha e o formulário selecionado (`InvestorForm` ou `StartupForm`).
  - Usa componentes `Dialog`, `Card`, `Button` e `Image`.
- Formulário Investidor: `src/components/register/InvestorForm.tsx`
  - Integração ViaCEP ao atingir 8 dígitos (onChange) e no onBlur do CEP.
  - Campos endereço auto-preenchidos: `endereco`, `bairro`, `cidade`, `uf`.
  - Senha e confirmação lado a lado, validação mínima de 6.
- Formulário Startup: `src/components/register/StartupForm.tsx`
  - Mesmo comportamento do CEP e validações.
- Utilitários de máscara: `src/lib/mask-utils.ts`
  - `MASK_PATTERNS.CEP = '99999-999'`, handlers desmascaram antes de aplicar máscara.

## ** UX/Validações:**
- CEP: dispara busca quando completar 8 dígitos numéricos e ao perder o foco.
- Spinner “Buscando CEP...” com aria-live durante requisições.
- `UF` normalizada para 2 caracteres (pode ser forçada para maiúsculas futuramente).
- Mensagens de erro exibidas abaixo dos campos.

## ** restrições:** 
- Sem envio real para backend ainda (TODO: integrar APIs de cadastro).
- Submissão deve ser bloqueada caso a busca de CEP esteja em andamento (sugerido).

## ** Request:** 

### ** POST **
- Cadastro de investidor (sugerido): `/api/auth/register/investor`
```json
{
  "nome": "string",
  "cpf": "string",
  "email": "string",
  "telefone": "string",
  "cep": "string",
  "endereco": "string",
  "bairro": "string",
  "cidade": "string",
  "uf": "string",
  "senha": "string",
  "confirmacaoSenha": "string"
}
```

- Cadastro de startup (sugerido): `/api/auth/register/startup`
```json
{
  "razaoSocial": "string",
  "nomeFantasia": "string",
  "cnpj": "string",
  "email": "string",
  "telefone": "string",
  "cep": "string",
  "endereco": "string",
  "bairro": "string",
  "cidade": "string",
  "uf": "string",
  "senha": "string",
  "confirmacaoSenha": "string"
}
```

Responses comuns:
- Sucesso (201):
```json
{
  "status": "success",
  "message": "Cadastro criado com sucesso",
  "data": { "id": 0 }
}
```
- Erro (409): e-mail já cadastrado.
- Erro de validação (422): mensagens por campo.

## ** Observações de UI:**
- Imagem lateral direita fixa: `/image-05.jpg`.
- Logo no topo da coluna esquerda: `/logo.png`.
