-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "publicId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "oldEmails" JSONB,
    "nome" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "telefone" TEXT,
    "data_nascimento" DATETIME,
    "genero" TEXT,
    "endereco" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "cep" TEXT,
    "pais" JSONB,
    "termosAceitos" BOOLEAN NOT NULL DEFAULT false,
    "politicaAceita" BOOLEAN NOT NULL DEFAULT false,
    "tipo_documento" TEXT,
    "reg_documento" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "avatar_id" INTEGER,
    "comprovante_id" INTEGER,
    "documento_id" INTEGER,
    "biofacial_id" INTEGER,
    CONSTRAINT "User_avatar_id_fkey" FOREIGN KEY ("avatar_id") REFERENCES "KYCProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_comprovante_id_fkey" FOREIGN KEY ("comprovante_id") REFERENCES "KYCProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_documento_id_fkey" FOREIGN KEY ("documento_id") REFERENCES "KYCProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_biofacial_id_fkey" FOREIGN KEY ("biofacial_id") REFERENCES "KYCProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BackupUser" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "process" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "EmailValidation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER,
    "type" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "KYCProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "originalName" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mineType" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "url_sm" TEXT,
    "url_md" TEXT,
    "url_lg" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "balance" DECIMAL NOT NULL DEFAULT 0.00,
    "blocked" DECIMAL NOT NULL DEFAULT 0.00,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "walletId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "description" TEXT NOT NULL,
    "relatedPaymentId" INTEGER,
    "relatedInvestId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "plans" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descricao" TEXT,
    "preco" DECIMAL NOT NULL,
    "periodoMeses" INTEGER NOT NULL DEFAULT 12,
    "periodo" TEXT NOT NULL DEFAULT '/ano',
    "icon" TEXT,
    "beneficios" JSONB,
    "visivel" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "recomendado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "planId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" DATETIME,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "categories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "areas_atuacao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "categoryId" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "areas_atuacao_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "startups" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "founderId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "razao_social" TEXT,
    "cnpj" TEXT NOT NULL,
    "site" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "pais" JSONB,
    "redes_sociais" JSONB,
    "area_atuacao" TEXT,
    "category" TEXT,
    "categoryId" INTEGER,
    "areaAtuacaoId" INTEGER,
    "needs_manual_review" BOOLEAN NOT NULL DEFAULT false,
    "estagio" TEXT,
    "descricao" TEXT,
    "problema" TEXT,
    "solucao" TEXT,
    "modelo_receita" TEXT,
    "descritivo_basico" TEXT,
    "youtube_url" TEXT,
    "diferencial" TEXT,
    "mercado_alvo" TEXT,
    "espera_alcancar" TEXT,
    "dedicacao" TEXT,
    "compradores" TEXT,
    "investimento_previo" TEXT,
    "concorrencia" TEXT,
    "oferece_lucros" BOOLEAN NOT NULL DEFAULT false,
    "lucros_descricao" TEXT,
    "oferece_beneficios" BOOLEAN NOT NULL DEFAULT false,
    "beneficios_descricao" TEXT,
    "socios" JSONB,
    "teams" JSONB,
    "uso_recursos" JSONB,
    "banco" TEXT,
    "agencia" TEXT,
    "conta" TEXT,
    "digito" TEXT,
    "tipo_conta" TEXT,
    "pix_key" TEXT,
    "titular" TEXT,
    "documento_titular" TEXT,
    "data_fundacao" DATETIME,
    "logo_id" INTEGER,
    "cover_id" INTEGER,
    "mie_id" INTEGER,
    "contrato_social_id" INTEGER,
    "cnpj_id" INTEGER,
    "balanco_atual_id" INTEGER,
    "declaracao_veracidade_id" INTEGER,
    "ata_eleicao_id" INTEGER,
    "balanco_anterior_id" INTEGER,
    "procuracao_id" INTEGER,
    "cv_socios_id" INTEGER,
    "pitch_deck_id" INTEGER,
    "projecoes_id" INTEGER,
    "modelo_contrato_oferta_id" INTEGER,
    "comprovante_endereco_id" INTEGER,
    "declaracao_receita_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING_RESERVATION_PAYMENT',
    "verificationStatus" TEXT NOT NULL DEFAULT 'NOT_REQUESTED',
    "score" INTEGER NOT NULL DEFAULT 0,
    "isAccelerated" BOOLEAN NOT NULL DEFAULT false,
    "isExited" BOOLEAN NOT NULL DEFAULT false,
    "exitValuation" DECIMAL,
    "exitDate" DATETIME,
    "exitDescription" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "startups_founderId_fkey" FOREIGN KEY ("founderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "startups_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "startups_areaAtuacaoId_fkey" FOREIGN KEY ("areaAtuacaoId") REFERENCES "areas_atuacao" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "startups_logo_id_fkey" FOREIGN KEY ("logo_id") REFERENCES "KYCProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "startups_cover_id_fkey" FOREIGN KEY ("cover_id") REFERENCES "KYCProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "startups_mie_id_fkey" FOREIGN KEY ("mie_id") REFERENCES "KYCProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "startups_contrato_social_id_fkey" FOREIGN KEY ("contrato_social_id") REFERENCES "KYCProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "startups_cnpj_id_fkey" FOREIGN KEY ("cnpj_id") REFERENCES "KYCProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "startups_balanco_atual_id_fkey" FOREIGN KEY ("balanco_atual_id") REFERENCES "KYCProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "startups_declaracao_veracidade_id_fkey" FOREIGN KEY ("declaracao_veracidade_id") REFERENCES "KYCProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "startups_ata_eleicao_id_fkey" FOREIGN KEY ("ata_eleicao_id") REFERENCES "KYCProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "startups_balanco_anterior_id_fkey" FOREIGN KEY ("balanco_anterior_id") REFERENCES "KYCProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "startups_procuracao_id_fkey" FOREIGN KEY ("procuracao_id") REFERENCES "KYCProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "startups_cv_socios_id_fkey" FOREIGN KEY ("cv_socios_id") REFERENCES "KYCProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "startups_pitch_deck_id_fkey" FOREIGN KEY ("pitch_deck_id") REFERENCES "KYCProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "startups_projecoes_id_fkey" FOREIGN KEY ("projecoes_id") REFERENCES "KYCProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "startups_modelo_contrato_oferta_id_fkey" FOREIGN KEY ("modelo_contrato_oferta_id") REFERENCES "KYCProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "startups_comprovante_endereco_id_fkey" FOREIGN KEY ("comprovante_endereco_id") REFERENCES "KYCProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "startups_declaracao_receita_id_fkey" FOREIGN KEY ("declaracao_receita_id") REFERENCES "KYCProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StartupDocument" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "startupId" INTEGER NOT NULL,
    "categoria" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedById" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StartupDocument_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "startups" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StartupDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "startupId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "targetAmount" DECIMAL NOT NULL,
    "minInvestment" DECIMAL NOT NULL,
    "valuation" DECIMAL NOT NULL,
    "tokenPrice" DECIMAL NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "tokensSold" INTEGER NOT NULL DEFAULT 0,
    "deadline" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "affiliateCommissionPct" DECIMAL,
    "reservationFeePaid" BOOLEAN NOT NULL DEFAULT false,
    "adminFeeValue" DECIMAL,
    "tokenBaseValue" DECIMAL,
    "tokenSellPrice" DECIMAL,
    "tokenMintingCost" DECIMAL,
    "complianceFeeBilled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "closedAt" DATETIME,
    "dataLancamentoRodada" DATETIME,
    "objetivoCaptacao" TEXT,
    "oQueEsperaAlcancar" TEXT,
    "participacaoLucros" BOOLEAN NOT NULL DEFAULT false,
    "faturamentoMinimoLucros" DECIMAL,
    "beneficiosAdicionais" BOOLEAN NOT NULL DEFAULT false,
    "beneficiosDescricao" TEXT,
    "aceiteTermoRepasse" BOOLEAN NOT NULL DEFAULT false,
    "declaracaoVeracidade" BOOLEAN NOT NULL DEFAULT false,
    "problema" TEXT,
    "solucao" TEXT,
    "modeloReceita" TEXT,
    "diferencial" TEXT,
    "mercadoAlvo" TEXT,
    "sociosCount" INTEGER,
    "dedicacao" TEXT,
    "compradores" TEXT,
    "investimentoPrevio" TEXT,
    "concorrencia" TEXT,
    "totalRaised" DECIMAL,
    "transferStarted" BOOLEAN NOT NULL DEFAULT false,
    "repasseConfigured" BOOLEAN NOT NULL DEFAULT false,
    "repasseParcelas" INTEGER NOT NULL DEFAULT 12,
    "repasseIntervaloDias" INTEGER NOT NULL DEFAULT 30,
    CONSTRAINT "Campaign_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "startups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "campaign_resource_allocations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "campaignId" INTEGER NOT NULL,
    "categoria" TEXT NOT NULL,
    "percentual" INTEGER NOT NULL,
    "descricaoCustomizada" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "campaign_resource_allocations_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "campaign_offer_audit_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "campaignId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "userId" INTEGER,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "campaign_offer_audit_logs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "document_requests" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "startupId" INTEGER NOT NULL,
    "requestedById" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "deadline" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "fulfilledDocId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "document_requests_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "startups" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "document_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "document_requests_fulfilledDocId_fkey" FOREIGN KEY ("fulfilledDocId") REFERENCES "StartupDocument" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Token" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hash" TEXT NOT NULL,
    "certificate" TEXT,
    "userId" INTEGER NOT NULL,
    "startupId" INTEGER NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "investmentId" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "purchaseVal" DECIMAL NOT NULL,
    "currentVal" DECIMAL,
    "dtAquisicao" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Token_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "startups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Token_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Token_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TokenHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tokenId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TokenHistory_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "Token" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TokenHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "subscriptionId" INTEGER,
    "investmentId" INTEGER,
    "purpose" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "txid" TEXT,
    "endToEndId" TEXT,
    "qrCodeBase64" TEXT,
    "copyPastePix" TEXT,
    "paidAt" DATETIME,
    "campaignId" INTEGER,
    "serviceDetails" JSONB,
    "manualApprovedById" INTEGER,
    "manualApprovedAt" DATETIME,
    "manualJustification" TEXT,
    "manualComprovanteKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_manualApprovedById_fkey" FOREIGN KEY ("manualApprovedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Investment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "amount" DECIMAL NOT NULL,
    "tokensQty" INTEGER NOT NULL,
    "affiliateCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Investment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Investment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Withdrawal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "startupId" INTEGER NOT NULL,
    "amount" DECIMAL NOT NULL,
    "bankInfo" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "approvedBy" INTEGER,
    "txIdBancario" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Withdrawal_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "startups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ip" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AccessLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "method" TEXT,
    "path" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccessLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebhookLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "errorLog" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "countries" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "iso3" TEXT NOT NULL,
    "iso2" TEXT NOT NULL,
    "numeric_code" TEXT,
    "phonecode" INTEGER,
    "capital" TEXT,
    "currency" TEXT,
    "currency_name" TEXT,
    "currency_symbol" TEXT,
    "tld" TEXT,
    "native" TEXT,
    "region" TEXT,
    "region_id" INTEGER,
    "subregion" TEXT,
    "subregion_id" INTEGER,
    "nationality" TEXT,
    "timezones" JSONB,
    "latitude" DECIMAL,
    "longitude" DECIMAL,
    "emoji" TEXT,
    "emojiU" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "states" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "country_id" INTEGER NOT NULL,
    "country_code" TEXT NOT NULL,
    "country_name" TEXT NOT NULL,
    "iso2" TEXT NOT NULL,
    "iso3166_2" TEXT NOT NULL,
    "fips_code" INTEGER,
    "type" TEXT,
    "level" INTEGER,
    "parent_id" INTEGER,
    "latitude" DECIMAL,
    "longitude" DECIMAL,
    "timezone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "states_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cities" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "state_id" INTEGER NOT NULL,
    "state_code" TEXT NOT NULL,
    "state_name" TEXT NOT NULL,
    "country_id" INTEGER NOT NULL,
    "country_code" INTEGER NOT NULL,
    "country_name" TEXT NOT NULL,
    "latitude" DECIMAL,
    "longitude" DECIMAL,
    "timezone" TEXT,
    "wikiDataId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME,
    CONSTRAINT "cities_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "cities_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "finance_config" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "system_configs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "value" DECIMAL NOT NULL,
    "description" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" INTEGER
);

-- CreateTable
CREATE TABLE "config_parameter_values" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "effectiveFrom" DATETIME NOT NULL,
    "note" TEXT,
    "createdById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "coupon" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "percent" INTEGER NOT NULL,
    "validUntil" DATETIME,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "seals" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imagePath" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'CUSTOM',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Upload" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "publicId" TEXT NOT NULL,
    "startupId" INTEGER,
    "userId" INTEGER NOT NULL,
    "type" TEXT,
    "mime_type" TEXT,
    "originalName" TEXT,
    "size_bytes" INTEGER,
    "extension" TEXT,
    "bucket" TEXT,
    "key" TEXT,
    "sha256" TEXT,
    "variants" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "fileKey" TEXT,
    "url" TEXT,
    "documentType" TEXT,
    "applicancy" TEXT NOT NULL DEFAULT 'APPLICABLE',
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Upload_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "startups" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Upload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "startup_seals" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "startupId" INTEGER NOT NULL,
    "sealId" INTEGER NOT NULL,
    "issuedBy" INTEGER,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    CONSTRAINT "startup_seals_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "startups" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "startup_seals_sealId_fkey" FOREIGN KEY ("sealId") REFERENCES "seals" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "startup_opinions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "startupId" INTEGER NOT NULL,
    "mensagem" TEXT NOT NULL,
    "autor" TEXT NOT NULL,
    "cargos" JSONB,
    "youtube" TEXT,
    "site" TEXT,
    "linkedin" TEXT,
    "instagram" TEXT,
    "facebook" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "startup_opinions_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "startups" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "depoimentos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "mensagem" TEXT NOT NULL,
    "autor" TEXT NOT NULL,
    "cargos" JSONB,
    "youtube" TEXT,
    "site" TEXT,
    "linkedin" TEXT,
    "instagram" TEXT,
    "facebook" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "curated_picks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "startupId" INTEGER NOT NULL,
    "quote" TEXT NOT NULL,
    "curatorName" TEXT NOT NULL,
    "curatorRole" TEXT NOT NULL,
    "curatorAvatar" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "curated_picks_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "startups" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "certificate_authority" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "parent_ca_id" TEXT,
    "certificate_pem" TEXT NOT NULL,
    "private_key_ref" TEXT NOT NULL,
    "issued_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "common_name" TEXT NOT NULL,
    "organization" TEXT NOT NULL DEFAULT 'Iselftoken',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "certificate_authority_parent_ca_id_fkey" FOREIGN KEY ("parent_ca_id") REFERENCES "certificate_authority" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "digital_certificate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issuerCaId" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "certificatePem" TEXT NOT NULL,
    "privateKeyRef" TEXT NOT NULL,
    "publicKeyFingerprint" TEXT NOT NULL,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "revokedAt" DATETIME,
    "revocationReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "digital_certificate_issuerCaId_fkey" FOREIGN KEY ("issuerCaId") REFERENCES "certificate_authority" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "signed_document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startupId" INTEGER NOT NULL,
    "founderId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "templateVersion" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "documentHash" TEXT NOT NULL,
    "signatureFounderCertId" TEXT NOT NULL,
    "signatureFounderAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "signatureStartupCertId" TEXT NOT NULL,
    "signatureStartupAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "signed_document_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "startups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "signed_document_signatureFounderCertId_fkey" FOREIGN KEY ("signatureFounderCertId") REFERENCES "digital_certificate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "signed_document_signatureStartupCertId_fkey" FOREIGN KEY ("signatureStartupCertId") REFERENCES "digital_certificate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "signature_audit_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "signedDocumentId" TEXT,
    "actorType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "signature_audit_log_signedDocumentId_fkey" FOREIGN KEY ("signedDocumentId") REFERENCES "signed_document" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "startup_delete_audit_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startup_id" TEXT NOT NULL,
    "startup_snapshot" TEXT NOT NULL,
    "rodada_snapshot" TEXT,
    "investments_snapshot" TEXT,
    "payments_snapshot" TEXT,
    "documents_snapshot" TEXT,
    "signed_docs_snapshot" TEXT,
    "deleted_by_user_id" TEXT NOT NULL,
    "deleted_by_role" TEXT NOT NULL,
    "deleted_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "reason" TEXT,
    "retention_until" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "data_change_requests" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "startupId" INTEGER NOT NULL,
    "requestedByUserId" INTEGER NOT NULL,
    "field" TEXT NOT NULL,
    "currentValue" TEXT NOT NULL,
    "requestedValue" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" INTEGER,
    "reviewNote" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "data_change_requests_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "startups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "data_change_requests_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "data_change_requests_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "currentVersionId" TEXT,
    "createdByUserId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmailTemplate_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "EmailTemplateVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EmailTemplate_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailTemplateVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlTemplate" TEXT NOT NULL,
    "textTemplate" TEXT NOT NULL,
    "variablesSchema" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "changeNote" TEXT,
    "createdByUserId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" DATETIME,
    "publishedByUserId" INTEGER,
    CONSTRAINT "EmailTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmailTemplateVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EmailTemplateVersion_publishedByUserId_fkey" FOREIGN KEY ("publishedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "nota_fiscais" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "startupId" INTEGER NOT NULL,
    "number" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "xmlUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "nota_fiscais_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "startups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fund_transfers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "startupId" INTEGER NOT NULL,
    "notaFiscalId" INTEGER NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "amount" DECIMAL NOT NULL,
    "scheduledDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'AWAITING_REQUEST',
    "paidAt" DATETIME,
    "txIdBancario" TEXT,
    "allocation" JSONB,
    "observacao" TEXT,
    "rejectionReason" TEXT,
    "requestedAt" DATETIME,
    "approvedAt" DATETIME,
    "approvedBy" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "fund_transfers_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "startups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "fund_transfers_notaFiscalId_fkey" FOREIGN KEY ("notaFiscalId") REFERENCES "nota_fiscais" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "repasses" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "campaignId" INTEGER NOT NULL,
    "numeroParcelas" INTEGER NOT NULL DEFAULT 12,
    "complianceApprovedAt" DATETIME,
    "complianceApprovedByUserId" INTEGER,
    "complianceObservacao" TEXT,
    "valorParcela" DECIMAL NOT NULL DEFAULT 0,
    "valorUltimaParcela" DECIMAL,
    "intervaloDias" INTEGER NOT NULL DEFAULT 30,
    "valorTotalCaptacao" DECIMAL NOT NULL DEFAULT 0,
    "financeiroConfiguredAt" DATETIME,
    "financeiroConfiguredByUserId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'CONFIGURED',
    "cancelledAt" DATETIME,
    "cancelledMotivo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "repasses_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "repasses_complianceApprovedByUserId_fkey" FOREIGN KEY ("complianceApprovedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "repasses_financeiroConfiguredByUserId_fkey" FOREIGN KEY ("financeiroConfiguredByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "installments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "repasseId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL DEFAULT 1,
    "valor" DECIMAL NOT NULL,
    "scheduledDate" DATETIME,
    "paidAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'AWAITING_REQUEST',
    CONSTRAINT "installments_repasseId_fkey" FOREIGN KEY ("repasseId") REFERENCES "repasses" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "installment_requests" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "installmentId" INTEGER NOT NULL,
    "startupId" INTEGER NOT NULL,
    "founderUserId" INTEGER NOT NULL,
    "allocationPercents" JSONB NOT NULL,
    "allocationValues" JSONB,
    "observacao" TEXT,
    "bankInfoSnapshot" JSONB NOT NULL,
    "valorSolicitado" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tsLimitePagamento" DATETIME NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "approvedAt" DATETIME,
    "approvedByUserId" INTEGER,
    "valorOverride" DECIMAL,
    "observacaoFinanceiro" TEXT,
    "rejectedAt" DATETIME,
    "rejectedByUserId" INTEGER,
    "rejectionReason" TEXT,
    "completedAt" DATETIME,
    "txidC6" TEXT,
    "endToEndId" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "installment_requests_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "installments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "installment_requests_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "startups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "installment_requests_founderUserId_fkey" FOREIGN KEY ("founderUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "installment_requests_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "installment_requests_rejectedByUserId_fkey" FOREIGN KEY ("rejectedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "token_reservations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "investmentId" INTEGER,
    "expiresAt" DATETIME NOT NULL,
    "confirmedAt" DATETIME,
    "discardedAt" DATETIME,
    "discardReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "token_reservations_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "token_reservations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "token_reservations_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "affiliate_programs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "startupId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "affiliateCommissionPct" DECIMAL NOT NULL,
    "platformCommissionPct" DECIMAL NOT NULL,
    "maxAffiliates" INTEGER,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedBy" INTEGER NOT NULL,
    "decidedAt" DATETIME,
    "decidedBy" INTEGER,
    "decisionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "affiliate_programs_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "startups" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "affiliations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "programId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_FOUNDER',
    "code" TEXT NOT NULL,
    "tokensAllocated" INTEGER,
    "purchaseLinkUrl" TEXT,
    "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "founderDecidedAt" DATETIME,
    "founderDecidedBy" INTEGER,
    "adminDecidedAt" DATETIME,
    "adminDecidedBy" INTEGER,
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "affiliations_programId_fkey" FOREIGN KEY ("programId") REFERENCES "affiliate_programs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "affiliations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "affiliate_referrals" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "affiliationId" INTEGER NOT NULL,
    "investorId" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'LINK',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "affiliate_referrals_affiliationId_fkey" FOREIGN KEY ("affiliationId") REFERENCES "affiliations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "affiliate_referrals_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "affiliate_commissions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "affiliationId" INTEGER NOT NULL,
    "investmentId" INTEGER NOT NULL,
    "baseAmount" DECIMAL NOT NULL,
    "affiliatePct" DECIMAL NOT NULL,
    "affiliateAmount" DECIMAL NOT NULL,
    "platformPct" DECIMAL NOT NULL,
    "platformAmount" DECIMAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "walletTransactionId" INTEGER,
    "attributedBy" TEXT NOT NULL,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "affiliate_commissions_affiliationId_fkey" FOREIGN KEY ("affiliationId") REFERENCES "affiliations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "affiliate_commissions_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "token_issuance_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedByUserId" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "processingStartedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "token_issuance_orders_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransparencyPost" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "startupId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'GENERAL',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "periodMonth" INTEGER,
    "periodYear" INTEGER,
    "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "sourceType" TEXT,
    "sourceId" TEXT,
    CONSTRAINT "TransparencyPost_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "startups" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TransparencyPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "transparency_post_attachments" (
    "postId" INTEGER NOT NULL,
    "uploadId" INTEGER NOT NULL,

    PRIMARY KEY ("postId", "uploadId"),
    CONSTRAINT "transparency_post_attachments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "TransparencyPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "transparency_post_attachments_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "transparency_discussions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startupId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GERAL',
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "upvotesCount" INTEGER NOT NULL DEFAULT 0,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "pinnedAt" DATETIME,
    "pinnedByUserId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "transparency_discussions_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "startups" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "transparency_discussions_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "transparency_discussions_pinnedByUserId_fkey" FOREIGN KEY ("pinnedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "transparency_replies" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "discussionId" TEXT NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "transparency_replies_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "transparency_discussions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "transparency_replies_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "discussion_upvotes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "discussionId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "discussion_upvotes_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "transparency_discussions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "discussion_upvotes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StartupDraft" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "founderId" INTEGER NOT NULL,
    "paymentId" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StartupDraft_founderId_fkey" FOREIGN KEY ("founderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StartupDraft_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_publicId_key" ON "User"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "EmailValidation_token_key" ON "EmailValidation"("token");

-- CreateIndex
CREATE INDEX "EmailValidation_email_idx" ON "EmailValidation"("email");

-- CreateIndex
CREATE INDEX "EmailValidation_token_idx" ON "EmailValidation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "plans_slug_key" ON "plans"("slug");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "areas_atuacao_slug_key" ON "areas_atuacao"("slug");

-- CreateIndex
CREATE INDEX "areas_atuacao_categoryId_idx" ON "areas_atuacao"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "startups_slug_key" ON "startups"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "startups_cnpj_key" ON "startups"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "StartupDocument_s3Key_key" ON "StartupDocument"("s3Key");

-- CreateIndex
CREATE INDEX "StartupDocument_startupId_idx" ON "StartupDocument"("startupId");

-- CreateIndex
CREATE INDEX "campaign_resource_allocations_campaignId_idx" ON "campaign_resource_allocations"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_resource_allocations_campaignId_categoria_key" ON "campaign_resource_allocations"("campaignId", "categoria");

-- CreateIndex
CREATE INDEX "campaign_offer_audit_logs_campaignId_idx" ON "campaign_offer_audit_logs"("campaignId");

-- CreateIndex
CREATE INDEX "document_requests_startupId_idx" ON "document_requests"("startupId");

-- CreateIndex
CREATE INDEX "document_requests_status_idx" ON "document_requests"("status");

-- CreateIndex
CREATE INDEX "document_requests_requestedById_idx" ON "document_requests"("requestedById");

-- CreateIndex
CREATE UNIQUE INDEX "Token_hash_key" ON "Token"("hash");

-- CreateIndex
CREATE INDEX "Token_userId_idx" ON "Token"("userId");

-- CreateIndex
CREATE INDEX "Token_startupId_idx" ON "Token"("startupId");

-- CreateIndex
CREATE INDEX "Token_investmentId_idx" ON "Token"("investmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_investmentId_key" ON "Payment"("investmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_txid_key" ON "Payment"("txid");

-- CreateIndex
CREATE INDEX "AccessLog_userId_idx" ON "AccessLog"("userId");

-- CreateIndex
CREATE INDEX "AccessLog_createdAt_idx" ON "AccessLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "countries_iso3_key" ON "countries"("iso3");

-- CreateIndex
CREATE UNIQUE INDEX "countries_iso2_key" ON "countries"("iso2");

-- CreateIndex
CREATE INDEX "states_country_id_idx" ON "states"("country_id");

-- CreateIndex
CREATE INDEX "cities_state_id_idx" ON "cities"("state_id");

-- CreateIndex
CREATE INDEX "cities_country_id_idx" ON "cities"("country_id");

-- CreateIndex
CREATE UNIQUE INDEX "system_configs_key_key" ON "system_configs"("key");

-- CreateIndex
CREATE INDEX "config_parameter_values_key_effectiveFrom_idx" ON "config_parameter_values"("key", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_code_key" ON "coupon"("code");

-- CreateIndex
CREATE UNIQUE INDEX "seals_slug_key" ON "seals"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Upload_publicId_key" ON "Upload"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "Upload_sha256_key" ON "Upload"("sha256");

-- CreateIndex
CREATE INDEX "Upload_startupId_idx" ON "Upload"("startupId");

-- CreateIndex
CREATE INDEX "Upload_userId_idx" ON "Upload"("userId");

-- CreateIndex
CREATE INDEX "Upload_sha256_idx" ON "Upload"("sha256");

-- CreateIndex
CREATE INDEX "Upload_status_idx" ON "Upload"("status");

-- CreateIndex
CREATE INDEX "Upload_deletedAt_idx" ON "Upload"("deletedAt");

-- CreateIndex
CREATE INDEX "startup_seals_startupId_idx" ON "startup_seals"("startupId");

-- CreateIndex
CREATE INDEX "startup_seals_sealId_idx" ON "startup_seals"("sealId");

-- CreateIndex
CREATE UNIQUE INDEX "startup_seals_startupId_sealId_key" ON "startup_seals"("startupId", "sealId");

-- CreateIndex
CREATE INDEX "startup_opinions_startupId_idx" ON "startup_opinions"("startupId");

-- CreateIndex
CREATE INDEX "curated_picks_active_publishedAt_idx" ON "curated_picks"("active", "publishedAt");

-- CreateIndex
CREATE INDEX "certificate_authority_type_status_idx" ON "certificate_authority"("type", "status");

-- CreateIndex
CREATE INDEX "certificate_authority_common_name_idx" ON "certificate_authority"("common_name");

-- CreateIndex
CREATE UNIQUE INDEX "digital_certificate_serialNumber_key" ON "digital_certificate"("serialNumber");

-- CreateIndex
CREATE INDEX "digital_certificate_ownerType_ownerId_status_idx" ON "digital_certificate"("ownerType", "ownerId", "status");

-- CreateIndex
CREATE INDEX "digital_certificate_expiresAt_status_idx" ON "digital_certificate"("expiresAt", "status");

-- CreateIndex
CREATE INDEX "signed_document_startupId_idx" ON "signed_document"("startupId");

-- CreateIndex
CREATE UNIQUE INDEX "signed_document_startupId_type_founderId_key" ON "signed_document"("startupId", "type", "founderId");

-- CreateIndex
CREATE INDEX "signature_audit_log_signedDocumentId_idx" ON "signature_audit_log"("signedDocumentId");

-- CreateIndex
CREATE INDEX "signature_audit_log_action_createdAt_idx" ON "signature_audit_log"("action", "createdAt");

-- CreateIndex
CREATE INDEX "startup_delete_audit_log_startup_id_idx" ON "startup_delete_audit_log"("startup_id");

-- CreateIndex
CREATE INDEX "startup_delete_audit_log_deleted_by_user_id_idx" ON "startup_delete_audit_log"("deleted_by_user_id");

-- CreateIndex
CREATE INDEX "startup_delete_audit_log_deleted_at_idx" ON "startup_delete_audit_log"("deleted_at");

-- CreateIndex
CREATE INDEX "data_change_requests_startupId_idx" ON "data_change_requests"("startupId");

-- CreateIndex
CREATE INDEX "data_change_requests_status_idx" ON "data_change_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_slug_key" ON "EmailTemplate"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_currentVersionId_key" ON "EmailTemplate"("currentVersionId");

-- CreateIndex
CREATE INDEX "EmailTemplate_slug_idx" ON "EmailTemplate"("slug");

-- CreateIndex
CREATE INDEX "EmailTemplate_isActive_idx" ON "EmailTemplate"("isActive");

-- CreateIndex
CREATE INDEX "EmailTemplateVersion_templateId_status_idx" ON "EmailTemplateVersion"("templateId", "status");

-- CreateIndex
CREATE INDEX "EmailTemplateVersion_status_idx" ON "EmailTemplateVersion"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplateVersion_templateId_version_key" ON "EmailTemplateVersion"("templateId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "nota_fiscais_number_key" ON "nota_fiscais"("number");

-- CreateIndex
CREATE INDEX "nota_fiscais_startupId_idx" ON "nota_fiscais"("startupId");

-- CreateIndex
CREATE INDEX "nota_fiscais_status_idx" ON "nota_fiscais"("status");

-- CreateIndex
CREATE INDEX "fund_transfers_startupId_idx" ON "fund_transfers"("startupId");

-- CreateIndex
CREATE INDEX "fund_transfers_status_idx" ON "fund_transfers"("status");

-- CreateIndex
CREATE INDEX "fund_transfers_scheduledDate_idx" ON "fund_transfers"("scheduledDate");

-- CreateIndex
CREATE UNIQUE INDEX "fund_transfers_notaFiscalId_installmentNumber_key" ON "fund_transfers"("notaFiscalId", "installmentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "repasses_campaignId_key" ON "repasses"("campaignId");

-- CreateIndex
CREATE INDEX "repasses_campaignId_idx" ON "repasses"("campaignId");

-- CreateIndex
CREATE INDEX "repasses_status_idx" ON "repasses"("status");

-- CreateIndex
CREATE INDEX "installments_repasseId_idx" ON "installments"("repasseId");

-- CreateIndex
CREATE INDEX "installments_status_idx" ON "installments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "installments_repasseId_numero_key" ON "installments"("repasseId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "installment_requests_installmentId_key" ON "installment_requests"("installmentId");

-- CreateIndex
CREATE INDEX "installment_requests_installmentId_idx" ON "installment_requests"("installmentId");

-- CreateIndex
CREATE INDEX "installment_requests_founderUserId_idx" ON "installment_requests"("founderUserId");

-- CreateIndex
CREATE INDEX "installment_requests_startupId_idx" ON "installment_requests"("startupId");

-- CreateIndex
CREATE INDEX "installment_requests_status_idx" ON "installment_requests"("status");

-- CreateIndex
CREATE INDEX "installment_requests_tsLimitePagamento_idx" ON "installment_requests"("tsLimitePagamento");

-- CreateIndex
CREATE UNIQUE INDEX "token_reservations_investmentId_key" ON "token_reservations"("investmentId");

-- CreateIndex
CREATE INDEX "token_reservations_campaignId_status_idx" ON "token_reservations"("campaignId", "status");

-- CreateIndex
CREATE INDEX "token_reservations_userId_idx" ON "token_reservations"("userId");

-- CreateIndex
CREATE INDEX "token_reservations_status_expiresAt_idx" ON "token_reservations"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_programs_startupId_key" ON "affiliate_programs"("startupId");

-- CreateIndex
CREATE INDEX "affiliate_programs_status_idx" ON "affiliate_programs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "affiliations_code_key" ON "affiliations"("code");

-- CreateIndex
CREATE INDEX "affiliations_status_idx" ON "affiliations"("status");

-- CreateIndex
CREATE INDEX "affiliations_userId_idx" ON "affiliations"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "affiliations_programId_userId_key" ON "affiliations"("programId", "userId");

-- CreateIndex
CREATE INDEX "affiliate_referrals_investorId_idx" ON "affiliate_referrals"("investorId");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_referrals_affiliationId_investorId_key" ON "affiliate_referrals"("affiliationId", "investorId");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_commissions_investmentId_key" ON "affiliate_commissions"("investmentId");

-- CreateIndex
CREATE INDEX "affiliate_commissions_affiliationId_idx" ON "affiliate_commissions"("affiliationId");

-- CreateIndex
CREATE INDEX "affiliate_commissions_status_idx" ON "affiliate_commissions"("status");

-- CreateIndex
CREATE INDEX "token_issuance_orders_status_idx" ON "token_issuance_orders"("status");

-- CreateIndex
CREATE INDEX "token_issuance_orders_campaignId_idx" ON "token_issuance_orders"("campaignId");

-- CreateIndex
CREATE INDEX "TransparencyPost_startupId_publishedAt_idx" ON "TransparencyPost"("startupId", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "TransparencyPost_startupId_type_idx" ON "TransparencyPost"("startupId", "type");

-- CreateIndex
CREATE INDEX "TransparencyPost_startupId_periodYear_periodMonth_idx" ON "TransparencyPost"("startupId", "periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "TransparencyPost_sourceType_sourceId_idx" ON "TransparencyPost"("sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "TransparencyPost_sourceType_sourceId_key" ON "TransparencyPost"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "transparency_post_attachments_uploadId_idx" ON "transparency_post_attachments"("uploadId");

-- CreateIndex
CREATE INDEX "transparency_discussions_startupId_idx" ON "transparency_discussions"("startupId");

-- CreateIndex
CREATE INDEX "transparency_discussions_authorId_idx" ON "transparency_discussions"("authorId");

-- CreateIndex
CREATE INDEX "transparency_discussions_startupId_isPinned_idx" ON "transparency_discussions"("startupId", "isPinned");

-- CreateIndex
CREATE INDEX "transparency_discussions_startupId_createdAt_idx" ON "transparency_discussions"("startupId", "createdAt");

-- CreateIndex
CREATE INDEX "transparency_discussions_startupId_upvotesCount_idx" ON "transparency_discussions"("startupId", "upvotesCount");

-- CreateIndex
CREATE INDEX "transparency_replies_discussionId_idx" ON "transparency_replies"("discussionId");

-- CreateIndex
CREATE INDEX "transparency_replies_authorId_idx" ON "transparency_replies"("authorId");

-- CreateIndex
CREATE INDEX "discussion_upvotes_discussionId_idx" ON "discussion_upvotes"("discussionId");

-- CreateIndex
CREATE INDEX "discussion_upvotes_userId_idx" ON "discussion_upvotes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "discussion_upvotes_discussionId_userId_key" ON "discussion_upvotes"("discussionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "StartupDraft_paymentId_key" ON "StartupDraft"("paymentId");
