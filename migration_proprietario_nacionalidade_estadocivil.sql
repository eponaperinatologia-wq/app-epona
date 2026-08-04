-- ─────────────────────────────────────────────────────────────
-- Migration: campos exigidos pelo template do contrato Assinafy
-- Data: 2026-08-04
-- Adiciona nacionalidade e estado civil ao cadastro do proprietário
-- porque o template "Proprietários Epona Stud" tem esses campos.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE proprietarios
  ADD COLUMN IF NOT EXISTS nacionalidade TEXT,
  ADD COLUMN IF NOT EXISTS estado_civil TEXT;
