-- ─────────────────────────────────────────────────────────────
-- pg_cron a cada 15 min pra disparar push da indução de ovulação
-- exatamente no horário marcado (não às 06h como os outros eventos).
--
-- Fluxo:
-- 1. Job pg_cron chama notificar_inducoes_15min() a cada 15 min
-- 2. Função procura induções cujo (dataInducaoOvulacao, horaInducaoOvulacao)
--    cai na janela [agora-15min, agora+2min] em America/Sao_Paulo
-- 3. Faz HTTP POST em /api/send-push (target='repro') via pg_net
-- 4. Marca dados.inducaoNotificadaEm pra não repetir
--
-- IMPORTANTE — antes de rodar essa SQL:
-- - Habilite as extensions no Supabase Dashboard:
--     Database → Extensions → pg_cron   [enable]
--     Database → Extensions → pg_net    [enable]
-- - Substitua vercel_url dentro da função pela URL do seu Vercel
--   se for diferente de https://app-epona.vercel.app
--
-- Nota: usamos URL hardcoded na função em vez de GUC (ALTER DATABASE)
-- porque o SQL Editor do Supabase roda como role sem permissão pra
-- ALTER DATABASE. Pra rotate de domínio, basta rodar CREATE OR REPLACE
-- FUNCTION de novo com a URL nova.
-- ─────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION notificar_inducoes_15min()
RETURNS void AS $$
DECLARE
  rec RECORD;
  vercel_url TEXT := 'https://app-epona.vercel.app';
  agora_sp TIMESTAMP := (NOW() AT TIME ZONE 'America/Sao_Paulo');
  -- Janela [agora-15min, agora+2min]: pega tudo que "passou da hora"
  -- na última janela + margem de +2min. Combinado com o flag
  -- inducaoNotificadaEm, evita repetição e não perde eventos se um
  -- ciclo do cron falhou/atrasou até 15 min.
  ts_ini TIMESTAMP := agora_sp - INTERVAL '15 minutes';
  ts_fim TIMESTAMP := agora_sp + INTERVAL '2 minutes';
  ts_ind TIMESTAMP;
  nome_egua TEXT;
  titulo TEXT;
  corpo TEXT;
BEGIN
  FOR rec IN
    SELECT r.id, r.egua_id, r.dados,
           ((r.dados->>'dataInducaoOvulacao')::DATE
            + (r.dados->>'horaInducaoOvulacao')::TIME) AS ts_evento
      FROM reproducao_registros r
     WHERE r.workspace_id = 'repro'
       AND r.dados->>'dataInducaoOvulacao' IS NOT NULL
       AND r.dados->>'horaInducaoOvulacao' IS NOT NULL
       AND (r.dados->>'inducaoNotificadaEm') IS NULL
       AND ((r.dados->>'dataInducaoOvulacao')::DATE
            + (r.dados->>'horaInducaoOvulacao')::TIME) BETWEEN ts_ini AND ts_fim
  LOOP
    ts_ind := rec.ts_evento;
    SELECT nome INTO nome_egua FROM cavalos WHERE id = rec.egua_id;
    titulo := 'Induzir ovulacao: ' || COALESCE(nome_egua, 'egua');
    corpo := 'Horario programado: ' || TO_CHAR(ts_ind, 'HH24:MI');

    PERFORM net.http_post(
      url := vercel_url || '/api/send-push',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'title', titulo,
        'body', corpo,
        'target', 'repro'
      )
    );

    UPDATE reproducao_registros
       SET dados = COALESCE(dados, '{}'::jsonb)
                   || jsonb_build_object('inducaoNotificadaEm', to_jsonb(NOW()))
     WHERE id = rec.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove jobs antigos com mesmo nome (idempotente) e agenda novo
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'repro-inducao-15min') THEN
    PERFORM cron.unschedule('repro-inducao-15min');
  END IF;
  PERFORM cron.schedule(
    'repro-inducao-15min',
    '*/15 * * * *',
    'SELECT notificar_inducoes_15min()'
  );
END $$;

-- Verificação (opcional): listar jobs
-- SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE 'repro-%';
