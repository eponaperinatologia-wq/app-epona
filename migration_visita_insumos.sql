-- ─────────────────────────────────────────────────────────────────
-- App Epona — Migração: insumos a cobrar nas visitas clínicas
--
-- Em contratos de assessoria o cliente geralmente compra vacinas e
-- insumos por fora, então vacinas/vermífugos registrados não entram
-- na fatura automaticamente. Mas em algumas visitas o Epona fornece
-- insumos específicos que ENTRAM na cobrança. Esse campo guarda
-- essa lista: [{insumoId, qtd, valorUnit, descricao}].
--
-- Também guarda um "valor extra" calculado = valor_cobrado + soma
-- dos insumos. Em calcFaturaRepro a linha de assessoria soma tudo.
--
-- Idempotente.
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE visitas_clinicas
  ADD COLUMN IF NOT EXISTS insumos_cobrados JSONB NOT NULL DEFAULT '[]'::jsonb;
