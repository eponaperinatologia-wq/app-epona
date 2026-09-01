-- Adiciona campos texto pra mãe e pai (genealogia livre).
-- Diferente de mae_id (que é FK pra um cavalo cadastrado), estes
-- servem pra registrar nomes de ancestrais que NÃO estão no plantel.
-- Uso principal: repro team (receptora que carrega embrião de doadora
-- externa) e outros casos de genealogia sem cavalo cadastrado.

ALTER TABLE cavalos
  ADD COLUMN IF NOT EXISTS mae TEXT,
  ADD COLUMN IF NOT EXISTS pai TEXT;
