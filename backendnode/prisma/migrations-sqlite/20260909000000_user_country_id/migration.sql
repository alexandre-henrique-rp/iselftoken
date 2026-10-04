-- Migra o país do usuário de JSON para FK inteira e preserva o valor legado.
PRAGMA foreign_keys=OFF;

ALTER TABLE "User" RENAME COLUMN "pais" TO "pais_legacy";
ALTER TABLE "User" ADD COLUMN "pais" INTEGER REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "User" ADD COLUMN "bandeira" TEXT;

-- Backfill canônico pelo ISO3 salvo no JSON legado. O nome e o emoji vêm do catálogo Country.
UPDATE "User"
SET
  "pais" = (
    SELECT c."id"
    FROM "countries" c
    WHERE upper(c."iso3") = upper(json_extract("User"."pais_legacy", '$.iso3'))
    LIMIT 1
  ),
  "bandeira" = (
    SELECT c."emoji"
    FROM "countries" c
    WHERE upper(c."iso3") = upper(json_extract("User"."pais_legacy", '$.iso3'))
    LIMIT 1
  )
WHERE "pais_legacy" IS NOT NULL
  AND json_valid("pais_legacy")
  AND json_type("pais_legacy", '$') = 'object'
  AND json_extract("pais_legacy", '$.iso3') IS NOT NULL;

PRAGMA foreign_keys=ON;
