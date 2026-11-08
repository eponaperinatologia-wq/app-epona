-- ─────────────────────────────────────────────────────────────────
-- Migração: suplementos entregues pelo proprietário
--
-- Caso de uso: o proprietário compra o suplemento com o dinheiro dele e
-- entrega no haras. O consumo continua organizado pelo app (dose por
-- dia, trato), mas o item NÃO é cobrado dele na fatura.
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
