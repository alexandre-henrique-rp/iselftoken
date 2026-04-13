# SPEC — Criar Startup (12-create-startup)

## 1. Objetivo
- Padronizar o fluxo de criação de startups em wizard multi-etapas.

## 2. Referências
- PRD: `../PRD/12-create-startup.md`
- Descritivo: `../descritivo/12-create_startup.md`
- Style: `../style/12-create_startup.md`
- Exemplo: `../style/12-create_startup.jsx`
- CSS padrão: `../css_padrão.md`

## 3. Rotas e Caminhos
- **Rota:** `/startups/new`
- **Path:** `app/routes/private/startups/new/index.tsx`
- **Componentes únicos:** `app/routes/private/startups/new/components/*`

## 4. APIs
- fetch `api/document/upload`  **api externa** POST /uploads form-data
  - retorno: 
  ```json
  {
    "id": 1,
    "originalName": "documento.png",
    "size": 1024,
    "mineType": "image/png",
    "extension": "png",
    "url": "/documents/uuid.png",
    "url_sm": "/documents/sm/uuid.png",
    "url_md": "/documents/md/uuid.png",
    "url_lg": "/documents/lg/uuid.png",
    "status": "PENDING",
    "rejectionReason": null,
    "createdAt": "2026-02-17T13:34:49.359Z",
    "updatedAt": "2026-02-17T13:34:49.359Z"
  }
  ```
- fetch `api/startups/post`  **api externa** POST /startup
  - exemplo de envio
  ```json
  {
  "nome": "TechNova",
  "razaoSocial": "TechNova Tecnologia S.A.",
  "cnpj": "12345678000195",
  "paisIso3": "BRA",
  "areaAtuacao": "Tecnologia / SaaS",
  "estagio": "seed",
  "descricao": "Plataforma SaaS para automação de processos financeiros de PMEs.",
  "metaCaptacao": 500000,
  "equityOferecido": 10,
  "totalTokens": 100000,
  "prazoCapitacao": 90,
  "logo": 6, id retorno do upload
  "pitchDeck": 3, id retorno do upload
  "videoPitch": "https://www.youtube.com/watch?v=abc123",
  "redesSociais": {
    "website": "string",
    "linkedin": "string",
    "instagram": "string",
    "twitter": "string"
    },
  "dadosBancarios": {
    "banco": "string",
    "tipoConta": "string",
    "agencia": "string",
    "conta": "string",
    "digito": "string",
    "titular": "string",
    "documentoTitular": "string",
    "chavePix": "string"
    }
  }
  ```

## 5. Fluxo Principal
1. Renderizar header e stepper.
2. Validar etapa atual.
3. Avançar/retroceder etapas.
4. Submeter payload final.

## 6. Estados
- `step`, `formData`, `errors`, `isLoading`.

## 7. Validações
- Valuation calculado (meta / equity × 100).
- Máscaras de CNPJ e moeda.

## 8. Componentes
- `StepIndicator`, `DynamicSocialList`, `CurrencyInput`.

## 9. Regras de UI
- Botão **Voltar** oculto na etapa 1.
- Botão **Salvar e Criar** apenas na etapa final.

## 10. Acessibilidade
- Foco visível nos botões.

## 11. Exemplo JSX
```jsx
<StepIndicator step={step} total={4} />

{step === 2 && (
  <CurrencyInput value={formData.targetAmount} onChange={handleChange} />
)}
```
