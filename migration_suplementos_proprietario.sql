-- ─────────────────────────────────────────────────────────────────
-- Migração: insumos trazidos pelo proprietário
--
-- Caso de uso: o proprietário compra o insumo com o dinheiro dele e
-- traz para o haras. Vale para qualquer insumo — ração, feno, serragem,
-- suplemento, medicamento, vacina, vermífugo. O consumo continua
-- organizado pelo app, mas o item NÃO é cobrado dele enquanto houver
-- saldo.
--
-- A tabela mantém o nome suplementos_proprietario por já estar criada
-- em produção; no código ela é tratada como insumos de proprietário
-- (src/utils/insumosProp.js).
--
-- Uma linha por proprietário + suplemento. cavalo_ids lista quais
-- cavalos consomem desse estoque — nunca é automático para todos os
-- cavalos do proprietário, porque ele pode comprar para um só.
--
-- entregas: [{ "data": "YYYY-MM-DD", "qtd": 2 }] — histórico, não
-- quantidade única, porque o fluxo esperado é ele reabastecer.
--
-- Idempotente. Rode uma vez.
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS suplementos_proprietario (
  id TEXT PRIMARY KEY,
  proprietario_id TEXT NOT NULL,
  insumo_id TEXT NOT NULL,
  cavalo_ids JSONB DEFAULT '[]',
  entregas JSONB DEFAULT '[]',
  ativo BOOLEAN DEFAULT TRUE,
  obs TEXT DEFAULT '',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sup_prop_proprietario
  ON suplementos_proprietario (proprietario_id);

NOTIFY pgrst, 'reload schema';
