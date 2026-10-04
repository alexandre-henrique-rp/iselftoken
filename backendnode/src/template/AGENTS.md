# Template

**Propósito:** Módulo de geração de PDFs a partir de templates Handlebars. Renderiza o Termo de Adesão Digital (texto legal, selo visual de assinatura e placeholder de QR Code) pronto para ser assinado pelo módulo Signature.

**Dependências:**
- `handlebars` — engine de template com helpers de data em PT-BR
- `qrcode` — geração de QR Code placeholder embutido no PDF
- `pdfkit` (transitivo) — renderização do PDF final
- `[../signature](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/signature/AGENTS.md)` (consumidor — recebe o buffer gerado para aplicar assinatura PAdES)
- `[../common/pki](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/common/pki/AGENTS.md)` (consumidor indireto — fingerprint do certificado é interpolado no template)

**Mapa de Arquivos:**
- [template.module.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/template/template.module.ts) - módulo NestJS que provê e exporta `PdfTemplateBuilderService`
- [pdf-template-builder.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/template/pdf-template-builder.service.ts) - serviço `generateTermoPdf(data)` que retorna `{ buffer, hash, pageCount }`
- [termo-adesao.template.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/template/termo-adesao.template.ts) - template Handlebars + interface `TermoAdesaoData` (startup, founder, signedAt, fingerprints, qrCodeUrl)
- [pdf-template-builder.service.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/template/pdf-template-builder.service.spec.ts) - testes unitários do gerador de PDF
