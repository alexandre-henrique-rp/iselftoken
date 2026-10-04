-- Additive migration: preserve areaAtuacaoId while introducing the multi-area JSON contract.
ALTER TABLE "startups"
ADD COLUMN "areas_atuacao" TEXT;
-- Backfill legacy single-area records as one-item JSON arrays.
UPDATE "startups"
SET "areas_atuacao" = json_array("areaAtuacaoId")
WHERE "areaAtuacaoId" IS NOT NULL
  AND (
    "areas_atuacao" IS NULL
    OR "areas_atuacao" = ''
  );