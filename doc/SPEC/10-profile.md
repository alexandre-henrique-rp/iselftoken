# SPEC — Perfil & KYC (10-profile)

## 1. Objetivo
- Padronizar a página de perfil e KYC.

## 2. Referências
- PRD: `../PRD/10-profile.md`
- Descritivo: `../descritivo/10-perfil.md`
- Style: `../style/10-perfil.md`
- Exemplo: `../style/10-perfil.jsx`
- CSS padrão: `../css_padrão.md`

## 3. Rotas e Caminhos
- **Rota:** `/perfil`
- **Path:** `app/routes/private/perfil/index.tsx`
- **Componentes únicos:** `app/routes/private/perfil/components/*`
- **Componentes reutilizáveis ou gerais:** `app/components/*`

## 4. APIs
- `/api/user/me`
- `/api/user/update` api externa PATCH `/users/{id}`
``` json
  {
    "email": "joao.araujo@gmail.com",
    "nome": "João Araújo",
    "role": "USER",
    "telefone": "1234567890",
    "data_nascimento": "1990-01-01",
    "genero": "HOMEM",
    "endereco": "Rua dos Bobos",
    "numero": "0",
    "complemento": "Casa 1",
    "bairro": "Bairro",
    "cidade": "Cidade",
    "uf": "SP",
    "cep": "00000-000",
    "pais": {
      "iso3": "BRA",
      "nome": "Brasil",
      "emoji": "🇧🇷"
    },
    "termosAceitos": true,
    "politicaAceita": true,
    "tipo_documento": "CPF", // podendo ser [ CPF, CNH, PASSAPORTE, CÉDULA_IDENTIDADE, CARTEIRA_MOTORISTA, DNI, CUIT, RUT, SSN, NATIONAL_ID, BIRTH_CERTIFICATE ]
    "reg_documento": "1234567890",
    "isActive": true,
    "avatar_id": 1, // id do retorno de upload (/api/user/upload-doc)
    "comprovante_id": 1, // id do retorno de upload (/api/user/upload-doc)
    "documento_id": 1, // id do retorno de upload (/api/user/upload-doc)
    "biofacial_id": 1 // id do retorno de upload (/api/user/upload-doc)
}
```
- `/api/user/upload-doc`
  - `tipo`: `comprovante`, `documento`, `biofacial`
  - `file`: arquivo
  - `tipo de envio`: form-data (aceita apenas arquivos de imagem e pdf)
  - `url api externa`: `/uploads`

- `/api/user/verify-phone`
  - verificar se o telefone tem a quantidade de caracteres necessária

## 5. Fluxo Principal
1. Carregar dados do usuário.
2. Renderizar formulários de dados pessoais e endereço.
3. Renderizar uploads KYC.
4. Salvar alterações.

## 6. Estados
- `kycStatus`, `isSaving`, `filePreviews`, `errors`.

## 7. Validações
- Campos obrigatórios (nome, e-mail, telefone, data).
- Formatos de arquivos permitidos (JPG, PNG, PDF).

## 8. Componentes
- `FileUpload`, `WebcamModal`.

## 9. Regras de UI
- Layout em cards e formulários longos.
- Preview de arquivos enviados.

## 10. Acessibilidade
- Labels em inputs e uploads.
- Foco visível em botões.

## 11. Exemplo JSX
```jsx
<FileUpload
  label="Documento oficial"
  accept=".pdf,.png,.jpg"
  onUpload={handleUpload}
/>
```
