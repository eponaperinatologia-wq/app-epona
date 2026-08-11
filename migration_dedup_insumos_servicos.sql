-- ─────────────────────────────────────────────────────────────
-- Limpeza definitiva de duplicados em insumos e servicos
--
-- Estratégia: para cada nome duplicado (case/accent insensitive),
-- mantém 1 registro com maior "score" e DELETA os demais.
--
-- Score (mesmo algoritmo do frontend dedupPorNome):
--   +2 workspace_id = 'haras' (ou NULL)
--   +3 servico com descartaveis_obrigatorios preenchido
--   +2 insumo com descartaveis preenchido
--   +1 valor_venda ou valor > 0
--   +1 valor_compra > 0
--   +1 fornecedor preenchido
--   +1 injetavel = true
--   +1 indutor_ovulacao = true
--
-- SEGURANÇA:
-- 1. Rode PRIMEIRO os blocos SELECT (linhas comentadas com --SEL)
--    pra ver os duplicados antes de apagar.
-- 2. Faça um backup: no dashboard Supabase → Database → Backups.
-- 3. Só depois rode os DELETE.
-- ─────────────────────────────────────────────────────────────

-- Função auxiliar de normalização (unaccent + lower)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ─────────────────────────────────────────────────────────────
-- INSUMOS — preview dos duplicados (SEL — só lê, não altera)
-- ─────────────────────────────────────────────────────────────
-- Descomenta pra ver quais estão duplicados antes de apagar:
--
-- SELECT lower(unaccent(trim(nome))) AS nome_norm, COUNT(*) AS n,
--        array_agg(id) AS ids, array_agg(workspace_id) AS workspaces
--   FROM insumos
--  GROUP BY lower(unaccent(trim(nome)))
-- HAVING COUNT(*) > 1
--  ORDER BY n DESC, nome_norm;

-- ─────────────────────────────────────────────────────────────
-- INSUMOS — DELETE dos duplicados (mantém 1 com melhor score)
-- ─────────────────────────────────────────────────────────────
WITH ranked AS (
  SELECT id,
         lower(unaccent(trim(nome))) AS nome_norm,
         ROW_NUMBER() OVER (
           PARTITION BY lower(unaccent(trim(nome)))
           ORDER BY
             -- prefere haras (workspace_id = 'haras' ou NULL) sobre repro
             (CASE WHEN COALESCE(workspace_id, 'haras') = 'haras' THEN 1 ELSE 0 END) DESC,
             -- prefere com mais campos preenchidos
             (CASE WHEN descartaveis IS NOT NULL
                    AND jsonb_typeof(descartaveis::jsonb) = 'array'
                    AND jsonb_array_length(descartaveis::jsonb) > 0 THEN 1 ELSE 0 END) DESC,
             (CASE WHEN COALESCE(valor_venda, 0) > 0 THEN 1 ELSE 0 END) DESC,
             (CASE WHEN COALESCE(valor_compra, 0) > 0 THEN 1 ELSE 0 END) DESC,
             (CASE WHEN COALESCE(fornecedor, '') <> '' THEN 1 ELSE 0 END) DESC,
             (CASE WHEN injetavel THEN 1 ELSE 0 END) DESC,
             (CASE WHEN indutor_ovulacao THEN 1 ELSE 0 END) DESC,
             created_at ASC  -- desempate: mais antigo fica
         ) AS rn
    FROM insumos
   WHERE nome IS NOT NULL AND trim(nome) <> ''
)
DELETE FROM insumos
 WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- ─────────────────────────────────────────────────────────────
-- SERVICOS — preview dos duplicados (SEL — só lê)
-- ─────────────────────────────────────────────────────────────
-- SELECT lower(unaccent(trim(nome))) AS nome_norm, COUNT(*) AS n,
--        array_agg(id) AS ids, array_agg(workspace_id) AS workspaces
--   FROM servicos
--  GROUP BY lower(unaccent(trim(nome)))
-- HAVING COUNT(*) > 1
--  ORDER BY n DESC, nome_norm;

-- ─────────────────────────────────────────────────────────────
-- SERVICOS — DELETE dos duplicados
-- ─────────────────────────────────────────────────────────────
WITH ranked AS (
  SELECT id,
         lower(unaccent(trim(nome))) AS nome_norm,
         ROW_NUMBER() OVER (
           PARTITION BY lower(unaccent(trim(nome)))
           ORDER BY
             (CASE WHEN COALESCE(workspace_id, 'haras') = 'haras' THEN 1 ELSE 0 END) DESC,
             (CASE WHEN descartaveis_obrigatorios IS NOT NULL
                    AND jsonb_typeof(descartaveis_obrigatorios::jsonb) = 'array'
                    AND jsonb_array_length(descartaveis_obrigatorios::jsonb) > 0 THEN 1 ELSE 0 END) DESC,
             (CASE WHEN COALESCE(valor, 0) > 0 THEN 1 ELSE 0 END) DESC,
             id ASC  -- desempate por id (o mais antigo em ordem lexical fica)
         ) AS rn
    FROM servicos
   WHERE nome IS NOT NULL AND trim(nome) <> ''
)
DELETE FROM servicos
 WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- ─────────────────────────────────────────────────────────────
-- Verificação: quantos ficaram
-- ─────────────────────────────────────────────────────────────
SELECT 'insumos' AS tabela, COUNT(*) AS total FROM insumos
UNION ALL
SELECT 'servicos', COUNT(*) FROM servicos;
