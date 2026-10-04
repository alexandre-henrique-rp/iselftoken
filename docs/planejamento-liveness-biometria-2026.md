# Planejamento — Evolução do Sistema de Liveness e Telemetria Biométrica

> Documento de planejamento técnico. **Não** implementa nada ainda — define diagnóstico, pesquisa de mercado e um roadmap faseado para aprovação humana (mudanças em schema, regra de negócio e dependências exigem aprovação, conforme AGENTS.md §3).

Data: 2026-09-28 · Autor: Engenharia · Alvo: `frontend/app/components/profile/liveness-modal.tsx` + backend `uploads`/`users`/`admin-kyc` + schema Prisma.

---

## 1. Objetivo

O usuário quer:

1. **Analisar o sistema de liveness atual** e achar gargalos/falhas em: posicionamento inicial, detecção de óculos e detecção facial.
2. **Melhorar a detecção facial** com as melhores técnicas atuais.
3. **Evitar IA** (anti-deepfake / anti-injeção de vídeo).
4. **Gerar uma telemetria de rosto** (template biométrico) e **persistir** como padrão reutilizável.
5. **Comparar face × documento** para verificar se é a mesma pessoa.

---

## 2. Estado atual (diagnóstico do código)

### 2.1 Frontend — `liveness-modal.tsx` (~1130 linhas, componente único)

Fluxo: `intro → loading → positioning → countdown → recording → review/failed`. Usa **MediaPipe FaceLandmarker** (478 pontos, blendshapes, matriz de transformação facial) via CDN, rodando por `requestAnimationFrame`.

O que já faz bem:
- Pose (yaw/pitch/roll) a partir da matriz de transformação → instruções ativas (olhar cima/baixo/esquerda/direita/piscar).
- Blink via blendshapes (`eyeBlinkLeft/Right`).
- Qualidade de frame (brilho/contraste/nitidez) por amostragem de luminância.
- Tracking de movimento de landmarks (olhos/nariz/boca) como sinal anti-estático.
- Grava vídeo (`MediaRecorder`), monta `LivenessResult` rico com métricas e `rejectionReasons`.

### 2.2 Gargalos e falhas identificados

| # | Área | Problema | Impacto |
|---|------|----------|---------|
| G1 | **Posicionamento inicial** | Thresholds fixos (`Math.abs(cx-0.5)<0.12`, yaw/pitch `<12`) sem tolerância adaptativa a resolução/distância. Sem detecção de **distância** (rosto muito perto/longe) nem de **múltiplas faces**. | Falsos "posicione o rosto", frustração, drop-off. |
| G2 | **Detecção de óculos** | Heurística de "densidade de borda" (`edgeDensity`) por luminância na faixa dos olhos. Frágil a iluminação, franja, sombra, moldura fina/aro invisível. Confirmação por maioria de 3 amostras. | Falso-positivo bloqueia usuário sem óculos; falso-negativo deixa passar com óculos. |
| G3 | **Detecção facial** | Sem verificação de **oclusão** (máscara, mão, boné), sem **multi-face**, sem verificação de que é a mesma face ao longo do vídeo. | Prova de vida aceita rosto parcialmente coberto. |
| G4 | **Anti-IA / injeção** | Nenhuma defesa contra **injeção de vídeo** (virtual camera) nem **deepfake**. Instruções são aleatórias entre 2 fixas → previsível/regravável. | Vetor de fraude crítico para fintech (ISO/CEN). |
| G5 | **Telemetria descartada** | `handleLivenessComplete` (`profile-documents.tsx`) **descarta** todo o `LivenessResult` (yaw, blink, movimento, óculos, motivos) e envia só o `videoBlob` como upload comum. | Telemetria valiosa é perdida; auditoria fica cega. |
| G6 | **Sem embedding facial** | Não existe extração de vetor/template facial em lugar nenhum (nem front, nem back). Schema `User` só tem `biofacial_id` + consentimento. | Impossível comparar face×documento hoje. |
| G7 | **Sem face-match documento** | Não há comparação selfie×documento. Compliance decide olhando o vídeo manualmente. | Verificação de identidade 100% manual/subjetiva. |
| G8 | **Manutenibilidade** | Arquivo único de 1130 linhas viola o limite de 500 linhas/arquivo (AGENTS.md §7). | Difícil evoluir e testar. |
| G9 | **Robustez do loop** | Toda a lógica dentro de `setPhase(prev => …)` (efeitos colaterais dentro do updater) e refs manuais; `handleRetry`/`reinit` duplicam init com `setTimeout(50)`. | Bugs sutis de estado, difícil testar. |

### 2.3 Backend

- `User` (schema.sqlite.prisma): `biofacial_id → KYCProfile`, `biofacialConsentAt`, `biofacialConsentVersion`. **Nenhum campo biométrico** (embedding/template/score).
- `BiometricConsentController`: grava/revoga consentimento (LGPD Art. 11 I / 18 IX). ✅ base de compliance já existe.
- `UploadsService`: vídeo é tratado como arquivo genérico (sem transcodificação nem análise). O selfie/biofacial entra como `KYCProfile` PENDING para revisão manual.
- Decisão KYC (`admin-kyc`): aprovação sincroniza sessões Redis (BUG-FT-002 no CASE.md).

---

## 3. Pesquisa de mercado (fundamentação)

Fontes: Jumio (Deepfake Detection Guide), Datakeen (guia anti-spoofing 2026), ISO/IEC 30107-3:2023, Microsoft Azure Face Liveness, artigo DF-CAPTCHA (Frankovits/Mirsky, BGU), survey de anti-spoofing, InsightFace/ArcFace, MediaPipe.

### 3.1 Taxonomia de liveness (padrão de mercado 2026)

- **Ativo**: usuário faz um gesto (piscar, virar, seguir ponto). Boa contra ataques básicos; **vulnerável a replay se o desafio for previsível**. Mais fricção.
- **Passivo**: analisa alguns frames sem pedir ação (textura, profundidade por parallax, reflexos, rPPG). Zero fricção; exige modelo robusto.
- **Híbrido (recomendado)**: passivo em background + **desafio ativo aleatório não-reproduzível**. É o **standard 2026 para KYC bancário/fintech**.

### 3.2 Padrão ISO/IEC 30107-3 (PAD) — níveis de ataque

- **Nível 1**: foto impressa/tela.
- **Nível 2**: replay de vídeo, máscara básica, deepfake estático.
- **Nível 3**: máscara silicone movie-grade, **deepfake em tempo real**, **injeção no pipeline da câmera**.
- Métricas: **APCER** (ataques aceitos como reais — quanto menor melhor), **BPCER** (usuários reais rejeitados), **ACER** (média). Meta nível 2: APCER e BPCER < 5%.

### 3.3 Seis famílias de sinais passivos (Datakeen)

1. **Textura** (papel/tela/silicone via CNN).
2. **Microvariações / rPPG** (pulso sanguíneo nos pixels do rosto).
3. **Profundidade 3D** (sensor estruturado ou **parallax** entre frames — o que dá pra fazer no browser).
4. **Coerência física** (assimetrias, iluminação, sombras, reflexo ocular).
5. **Sinais do device** (IMU/giroscópio — limitado no browser, ausente no Safari).
6. **Detecção de deepfake** (artefatos GAN/diffusion).

### 3.4 Anti-deepfake ativo — DF-CAPTCHA (chave para "evitar IA")

Insight central: pipelines de deepfake em tempo real são **treinados para tarefas estreitas** (rosto frontal falando). **Desafios aleatórios** que são triviais para humanos mas fora do "envelope operacional" do deepfake **forçam artefatos** detectáveis. Verifica 4 restrições: **Realismo, Identidade, Tarefa (foi executada?), Tempo (< ~1s de resposta)**.

Desafios de vídeo mais eficazes medidos (AUC): **puff cheeks (bochechas cheias), open mouth (abrir boca), smile, eye movement, hand occlusion, press cheek, far/close (aproximar/afastar), turn head, remove glasses**. Combinar 2–3 aleatórios eleva a detecção de ~55–77% (passivo) para **87–100%**.

Aplicação direta aqui: trocar o pool fixo de 5 instruções por **desafios aleatórios não-reproduzíveis emitidos pelo servidor** (nonce + timestamp assinado), medindo tempo de resposta e coerência de identidade entre pré-desafio e resposta.

### 3.5 Detecção de injeção de vídeo (Jumio / CEN TS 18099:2025)

Injeção = virtual camera injeta stream sintético, **bypassa a câmera física**. Defesas viáveis no browser:
- Inspecionar `MediaStreamTrack.getSettings()`/`getCapabilities()` e `label` (virtual cameras costumam ter labels/caps atípicos: sem `deviceId` real, framerate perfeito, resolução exótica).
- **Nonce visual**: renderizar um flash/cor aleatória na tela e verificar reflexo/latência no frame (3D Flash — usado por Didit/Azure).
- Coerência temporal (timestamps de frame, jitter natural de câmera real).
- Assinar no servidor a sessão de captura + validar `User-Agent`/permissions.

### 3.6 Face matching selfie × documento (para "mesma pessoa")

- Padrão de indústria: **ArcFace/InsightFace (buffalo_l)** → embedding 512-D, comparação por **similaridade de cosseno**.
- **Cuidado documentado (arXiv 1912.10021)**: ArcFace "puro" tem acurácia **menor** em *document-to-selfie* (gap de qualidade webcam × foto impressa/plastificada). Recomenda-se **modelo ajustado** ou threshold calibrado no **próprio pipeline de captura**.
- **Threshold deve ser medido empiricamente** no seu fluxo real (coletar pares mesma-pessoa / pessoas-diferentes e escolher o ponto com FAR aceitável). Não usar threshold "de blog".

### 3.7 Detecção facial e óculos no browser (melhorias concretas)

- **MediaPipe FaceLandmarker** já é estado-da-arte para browser (478 pts + blendshapes + matriz). Manter, mas **usar melhor**: blendshapes `eyeLookIn/Out/Up/Down`, `jawOpen`, `mouthPucker`, `cheekPuff` para os desafios; `faceOval`/iris para distância e oclusão.
- **Óculos**: substituir a heurística de borda por abordagem geométrica/robusta (ex.: análise da região da ponte do nariz + reflexos especulares + linha superior da armação usando os landmarks de olho/sobrancelha; referência pública "GlassesJS" faz isso "zero-model"). Opcionalmente, um mini-classificador ONNX (eyeglasses/sunglasses) rodando em `onnxruntime-web`.
- **Distância/enquadramento**: usar a largura do `faceOval` (bbox) vs. frame para exigir rosto entre X% e Y% da largura.
- **Multi-face / oclusão**: `numFaces > 1` → rejeitar; checar presença de landmarks de nariz+boca+2 olhos com confiança.

---

## 4. Arquitetura proposta (visão)

```
┌────────────────────────── FRONTEND (browser) ──────────────────────────┐
│ CameraCapture ─ MediaPipe FaceLandmarker (loop)                          │
│   ├─ PositioningEngine   (distância, centro, oclusão, multi-face)        │
│   ├─ GlassesDetector      (geométrico + reflexo; opcional ONNX)          │
│   ├─ PassiveLiveness      (rPPG leve, parallax, coerência, reflexo)      │
│   ├─ ActiveChallenge      (desafios aleatórios do servidor + tempo)      │
│   ├─ InjectionGuard       (track settings, nonce visual/flash)           │
│   └─ FaceEmbedder         (ArcFace ONNX via onnxruntime-web) → 512-D      │
│                                                                          │
│  Envia: vídeo + telemetria(JSON) + embedding + prova do desafio          │
└──────────────────────────────────────────────────────────────────────────┘
                                   │  (HTTPS, cookie httpOnly, consent LGPD)
┌────────────────────────── BACKEND (NestJS) ──────────────────────────────┐
│ LivenessController → LivenessService                                      │
│   ├─ valida desafio (nonce/timestamp assinado, tempo de resposta)         │
│   ├─ persiste FaceBiometric (template cifrado) + LivenessTelemetry        │
│   ├─ (opcional) re-extrai embedding server-side p/ anti-tamper            │
│   └─ FaceMatchService: selfie×documento (cosine) → score + decisão        │
│ Admin KYC: exibe telemetria + score de match no painel de revisão         │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Roadmap faseado

Cada fase é independente e entregável. **Fases que mexem em schema, dependências pesadas ou regra de negócio exigem aprovação humana antes de codar** (AGENTS.md §3).

### Fase 0 — Refactor e base de testes (sem mudança funcional) — *baixo risco*
> **Status: em andamento (2026-09-28).** Núcleo concluído.
- Quebrar `liveness-modal.tsx` (1130 linhas) em módulos < 500 linhas: `liveness/` com `use-face-landmarker.ts`, `positioning.ts`, `glasses-detector.ts`, `pose.ts`, `movement.ts`, `types.ts`, e UI em subcomponentes.
- Extrair lógica pura (pose, meanDelta, quality, glasses) para funções testáveis + testes Vitest.
- **Sem** alterar comportamento. Entrega: mesma UX, código testável.

**Feito:** módulos puros criados em `app/components/profile/liveness/` — `types.ts`, `landmarks.ts`, `pose.ts`, `movement.ts`, `quality.ts` (`computeFaceQuality` puro), `glasses-detector.ts` (`analyzeGlassesRegions` + `regionStatsFromRGBA` puros), `debug-overlay.ts` (`drawLivenessDebugOverlay`) e `liveness-panels.tsx` (telas intro/error/failed + métricas do review). 26 testes Vitest passando + suíte de profile OK (31 no total). `liveness-modal.tsx` reduzido de 1288 → **1045 linhas**; importa dos módulos; `LivenessResult` re-exportado. typecheck/build OK; sem mudança de comportamento.
**Pendente:** extrair o loop `scheduleDetection` para um hook `use-liveness-detection` (a máquina de estados via refs + `startRecording`/`reinit`) para levar `liveness-modal.tsx` abaixo de 500 linhas — etapa mais invasiva, tratada separadamente por risco de regressão no estado.

### Fase 1 — Corrigir gargalos de captura (G1, G2, G3) — *baixo/médio risco*
> **Status: concluída (2026-09-28).**
- Posicionamento adaptativo: distância via bbox, tolerância relativa, mensagens específicas.
- Multi-face e oclusão (nariz+boca+olhos) → bloqueio com feedback.
- Novo `GlassesDetector` geométrico + reflexo (fallback ONNX opcional atrás de flag).
- Métricas de qualidade calibradas por resolução.
- Testes com fixtures de landmarks.

**Feito:** módulo puro `liveness/positioning.ts` (`computeFaceBox`, `hasEssentialFeatures`, `evaluatePositioning`, `positioningMessage`) + 15 testes. Detector passou a usar `numFaces: 2` → rejeita múltiplas faces; detecta oclusão (traços colapsados / ordem anatômica) e distância (bbox muito perto/longe) com mensagens PT-BR específicas no positioning. O `GlassesDetector` geométrico + reflexo e as métricas de qualidade invariantes a pele já haviam sido entregues antes desta fase. typecheck/build OK, 46 testes passando. Fallback ONNX de óculos permanece como melhoria futura (opcional).

### Fase 2 — Persistir telemetria (G5) — *médio risco (schema)*
> **Status: concluída (2026-09-28). Fases 2/5/6 aprovadas pelo responsável.**
- **[Aprovação] Migration**: novo modelo `LivenessTelemetry` (yaw/pitch amplitude, blinkCount, movementScore, glasses, qualidade, desafios+resultado, motivos, duração, mimeType, userAgent hash).
- Frontend: parar de descartar `LivenessResult`; enviar JSON junto ao upload.
- Backend: `LivenessController`/`Service` persiste e vincula ao `KYCProfile`/`User`.
- Admin KYC (`admin-kyc-biofacial.tsx`): exibir telemetria na revisão.

**Feito:**
- Schema: modelo `LivenessTelemetry` + relação em `User`; migration manual `20261002000000_add_liveness_telemetry` aplicada no `dev.db` (apenas nova tabela — o `db push` foi evitado por causa de drift pré-existente em colunas alheias de Investment/Payment/startups).
- Backend: `LivenessTelemetryController` (`POST /users/me/liveness-telemetry`) + `LivenessTelemetryService` (hash de user-agent, sem PII em log). Registrados em `UsersModule` (e corrigido o `BiometricConsentController`, que estava sem `@Body()` e não registrado).
- Frontend: `profile-documents.tsx` envia telemetria após o upload (fire-and-forget) via BFF `routes/api/users-me.liveness-telemetry.ts`; deixou de descartar o `LivenessResult`.
- Admin: `AdminService.getUserKycDetail` devolve `livenessTelemetry`; painel `AdminKycLivenessTelemetry` renderizado em `/admin/kyc`.
- Regra documentada em `CASE.md`. Backend build OK, frontend typecheck/build OK, 71 testes front + 10 back passando.

### Fase 3 — Desafios ativos anti-deepfake (G4) — *médio risco*
> **Status: concluída client-side (2026-09-28).**
- Servidor gera desafio assinado (nonce + timestamp + lista randômica de 2–3 gestos do catálogo DF-CAPTCHA: puff cheeks, open mouth, smile, eye move, turn head, far/close).
- Frontend executa, mede **tempo de resposta** por gesto e captura a **prova** (frames/timestamps).
- Backend valida sequência, tempo (< limiar), e não-reuso do nonce (Redis TTL curto).
- Substitui o pool fixo atual; mantém acessibilidade (fallback e limites de tentativa).

**Feito:**
- Módulo puro `liveness/challenges.ts` (`isChallengeSatisfied`, `pickChallenges`, `CHALLENGE_POOL`) + 9 testes. Catálogo ampliado com gestos anti-deepfake: **open_mouth (jawOpen), smile (mouthSmile), puff_cheeks (cheekPuff)** além dos de pose/blink.
- `Instruction` estendido (8 gestos); modal sorteia 2 aleatórios do catálogo e detecta via blendshapes.
- **Tempo de resposta por desafio** medido (`challengeResponseMs`) e propagado ao `LivenessResult` → telemetria (coluna nova `challengeResponseMs`, migration `20261002010000`). Exibido no painel admin.
- typecheck/build OK (front+back), 80 testes front passando.

**Pendente (incremento):** nonce assinado pelo servidor + validação de não-reuso (Redis) e limiar de tempo server-side — a base client-side (aleatoriedade + medição de tempo + prova) já está entregue; o desafio ainda é sorteado no cliente.

### Fase 4 — Anti-injeção (G4) — *médio risco*
> **Status: concluída client-side (2026-09-28).**
- `InjectionGuard`: inspeciona `track.getSettings/getCapabilities/label`; heurísticas de virtual camera.
- **3D Flash**: emite cor/brilho aleatório na tela e valida resposta luminosa no frame (parallax/reflexo).
- Sinais device quando disponíveis (IMU) — degradação graciosa no Safari/desktop.
- Registrar sinais na telemetria; decisão fica com Compliance (não bloquear cegamente no MVP).

**Feito:**
- Módulo puro `liveness/injection-guard.ts` (`analyzeInjection` + `analyzeVideoTrack`) + 8 testes. Heurística de câmera virtual por **label** (OBS, ManyCam, Snap Camera, DroidCam, XSplit, …), **deviceId ausente** e **framerate atípico** — regra conservadora (label forte sozinha; sinais fracos só combinados) para evitar falso positivo.
- Integrado ao `startFlow`/`reinit` (analisa o video track ao obter o stream). Propagado ao `LivenessResult` (`injectionSuspicious`, `injectionReasons`).
- Persistido na telemetria (colunas novas `injectionSuspicious` + `injectionReasons`, migration `20261002020000`). Painel admin exibe **banner de alerta** quando suspeito.
- typecheck/build OK (front+back), 63 testes liveness/profile + 13 admin-kyc passando.

**Pendente (incremento):** o **3D Flash** (emitir cor aleatória e validar resposta luminosa no frame) e sinais de IMU não foram implementados — a defesa por metadados do track está entregue; o 3D flash é o próximo reforço de vivacidade contra replay/injeção.

### Fase 5 — Embedding facial + telemetria de rosto persistente (G6) — *alto risco (biometria/LGPD)*
> **Status: base concluída (2026-09-28). Extração no servidor (Opção B) aprovada.**
- **[Aprovação]** Escolha do modelo: **ArcFace/InsightFace** exportado para **ONNX**, rodando em `onnxruntime-web` (client) e/ou server (`onnxruntime-node`).
- Extrair embedding 512-D do melhor frame frontal (após alinhamento por landmarks).
- **[Aprovação] Migration** `FaceBiometric`: template **cifrado** (KMS/Vault — já há PKI/`vault-transit` no projeto), versão do modelo, hash, `createdAt`, vínculo a `User`, `consentVersion`.
- LGPD: só extrair/persistir com `biofacialConsentAt` válido; purgar na revogação (Art. 18 IX) — já há hook de revogação.
- Este é o "padrão reutilizável" pedido: template versionado para comparações futuras.

**Feito:**
- Schema `FaceBiometric` (template cifrado + iv + authTag, modelVersion, dim, templateHash, consentVersion, kycProfileId, 1:1 com User) + migration `20261002030000` aplicada.
- `TemplateCipherService`: **AES-256-GCM** (chave via `BIOMETRIC_TEMPLATE_KEY`, aceita hex/base64/passphrase), encrypt/decrypt de `Float32Array`, hash irreversível. 6 testes (round-trip, IV único, integridade GCM, chave errada).
- `FaceEmbedder` (interface) + `NoopFaceEmbedder` (default) — **extração no servidor**, plugável. O slot do `OnnxArcFaceEmbedder` real fica atrás do token `FACE_EMBEDDER`.
- `FaceBiometricService`: `enroll` (gate de consentimento LGPD → extrai → cifra → upsert 1:1) e `purge` (revogação). 5 testes.
- Purga **integrada** ao `revokeConsent` (a mensagem "dados serão removidos" agora é real). Corrigido: o vetor nunca é persistido em claro.
- Backend build OK, 16 testes backend passando.

**Pendente (infra):** trocar `NoopFaceEmbedder` por `OnnxArcFaceEmbedder` real — requer hospedar o modelo ArcFace `.onnx`, instalar `onnxruntime-node` + detector/alinhador de face, e chamar `enroll` no fluxo de upload biofacial. A base cifrada/consentida está pronta para receber o vetor.

### Fase 6 — Face match selfie × documento (G7) — *alto risco*
> **Status: base concluída (2026-09-28).**
- `FaceMatchService`: extrai face do `documento` (KYCProfile) + embedding, compara com o template da selfie por **cosine similarity**.
- **Calibrar threshold** com dataset real do fluxo (medir FAR/FRR) — documentar em `CASE.md`.
- Resultado (score + faixa) exibido no painel do Compliance como **apoio à decisão** (nunca aprovação 100% automática no MVP).
- Reprocessamento assíncrono via RabbitMQ (já existe infra de fila).

**Feito:**
- `cosineSimilarity` (pura, testada) + `FaceMatchService` com `compareToDocument` (selfie×documento) e `status` (leve, p/ painel). Faixas **match / review / no_match** com threshold calibrável (`FACE_MATCH_THRESHOLD`, default 0.38, margem de revisão `FACE_MATCH_REVIEW_MARGIN`).
- Exposto no detalhe KYC (`AdminService.getUserKycDetail` → `faceMatch`), injeção `@Optional()` para não quebrar specs existentes. Painel admin (`AdminKycLivenessTelemetry` → `FaceMatchRow`) mostra faixa + score + corte, ou o motivo de indisponibilidade.
- **Apoio à decisão** (área de admin/Compliance): read-only, nunca aprova automaticamente. 29 testes backend (inclui 10 de match) + 63 front passando.

**Pendente (depende da Fase 5):** o match real só produz score quando o `OnnxArcFaceEmbedder` estiver ativo (extrai o vetor do documento). Enquanto o extrator é `Noop`, o painel mostra "Comparação facial ainda não habilitada no servidor". A calibração de threshold com FAR/FRR reais também aguarda dados do fluxo em produção.

---

## Observação sobre LGPD (área de admin)
Mesmo sendo o resultado do match visível **apenas ao admin/Compliance**, o template biométrico continua sendo **dado sensível**: consentimento, cifra em repouso e purga na revogação (Fase 5) permanecem obrigatórios — a restrição de acesso à tela não isenta o tratamento do dado.

---

## 6. Impactos em schema (resumo para aprovação)

| Modelo novo | Campos-chave | Fase |
|-------------|--------------|------|
| `LivenessTelemetry` | métricas + desafios + motivos + userAgentHash + kycProfileId/userId | 2 |
| `FaceBiometric` | templateEnc (cifrado), modelVersion, hash, dim, consentVersion, userId | 5 |
| (extensão) `KYCProfile`/`User` | `faceMatchScore?`, `livenessPassedAt?`, `livenessLevel?` | 6 |

---

## 7. Riscos, LGPD e compliance

- **Biometria = dado sensível (LGPD Art. 11)**: extração/persistência de embedding **só** com consentimento explícito válido; template **cifrado em repouso** (usar PKI/Vault existente); purga na revogação; retenção auditável (5 anos p/ logs, não p/ o template após revogação).
- **Nunca** logar embedding/telemetria com PII em texto livre (AGENTS.md §8).
- **Não** decidir identidade 100% automático em fintech: face-match é **apoio** ao Compliance no MVP.
- **Browser tem limites** (sem ToF, IMU inconsistente no Safari): assumir liveness passivo+ativo, não profundidade de hardware.
- **Threshold de match** deve ser medido, não copiado. Documentar decisão como regra de negócio.
- **Escalar para humano** (AGENTS.md §3): escolha de modelo biométrico, migrations, threshold, política de retenção.

---

## 8. Métricas de sucesso

- **Captura**: BPCER (rejeição de usuário real) < 5%; drop-off por etapa medido.
- **Óculos**: precisão/recall do detector vs. baseline atual (fixtures rotuladas).
- **Anti-deepfake**: taxa de detecção em conjunto de ataques simulados (replay/virtual cam).
- **Match**: FAR/FRR calibrados; concordância com decisão do Compliance.
- **Código**: nenhum arquivo > 500 linhas; cobertura de testes nas funções puras.

---

## 9. Próximos passos imediatos (aguardando seu aval)

1. Aprovar o roadmap e a ordem das fases.
2. Confirmar apetite para: (a) dependência `onnxruntime-web` + modelo ArcFace; (b) migrations das Fases 2/5/6.
3. Eu começo pela **Fase 0 (refactor + testes)** — risco baixo, sem mudança de comportamento — e sigo incremental com sua aprovação a cada fase que toca schema/dependência/regra de negócio.
