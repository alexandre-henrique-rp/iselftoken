-- Reversao aprovada: remove a unicidade composta (userId, sha256) do model Upload.
-- Motivacao: o indice unico "Upload_userId_sha256_key" barrava reenvios do mesmo
-- usuario com bytes identicos (P2002) e produzia o erro "constraint unique violada
-- mas registro nao encontrado". Cada upload volta a ser um registro novo, sem dedup.
--
-- Esta migration NAO apaga dados. Em SQLite, remover apenas o indice unico basta
-- (nao e necessario recriar a tabela). Os indices nao-unicos permanecem intactos.
DROP INDEX IF EXISTS "Upload_userId_sha256_key";
