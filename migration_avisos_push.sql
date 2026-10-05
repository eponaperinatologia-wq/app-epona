-- ─────────────────────────────────────────────────────────────────
-- App Epona — Migração: rate-limit cross-device das notificações
--
-- Antes: a lógica de "não notificar 2 vezes" usava localStorage,
-- que é por dispositivo. Resultado: cada login de qualquer usuário
-- em qualquer aparelho disparava push de novo, inundando o Mural
-- com notificações do mesmo aviso o dia inteiro.
--
-- Agora: coluna ultimo_push_em (DATE) na tabela avisos. Antes de
-- disparar push, o app checa: se ultimo_push_em == hoje, não dispara.
-- Depois do push, atualiza no banco — todos os dispositivos veem.
--
-- Idempotente.
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE avisos
  ADD COLUMN IF NOT EXISTS ultimo_push_em DATE;
