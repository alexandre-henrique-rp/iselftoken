-- URLs públicas estáveis para variantes de upload.
-- KYCProfile.url_web já existe desde a migration inicial.
-- Upload recebe as URLs públicas das variantes nesta migration.
ALTER TABLE "Upload" ADD COLUMN "url_md" TEXT;
ALTER TABLE "Upload" ADD COLUMN "url_web" TEXT;
