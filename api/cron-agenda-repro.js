// Cron diário 06h (America/Sao_Paulo) — dispara push aos vets do repro
// team lembrando dos eventos do dia: IA, TE (coleta), controles/DGs e
// retornos agendados. Cada evento gera uma notificação individual.
//
// Agendado via vercel.json: "0 9 * * *" (09:00 UTC = 06:00 SP).

const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

webpush.setVapidDetails(
  'mailto:epona.perinatologia@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY,
);

// Mensagens fixas pedidas pelo produto (não editar sem alinhar).
const CHECKLIST_IA = 'assegure-se de que pegou o ultrassom, o botijão e todo o material para a inseminação';
const CHECKLIST_TE = 'assegure-se de que pegou ringer, filtro de embrião, sonda estéril, meio de embrião, lupa e material para manipular o embrião';

function hojeSp() {
  // Data ISO no fuso de São Paulo (UTC-3)
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

module.exports = async function handler(req, res) {
  // Vercel Cron manda GET; aceitamos GET e POST.
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end();

  const hoje = hojeSp();

  // Puxa tudo do dia em 3 buckets:
  //  A) registros com data = hoje (procedimento hoje)
  //  B) registros com data_retorno = hoje (retorno hoje)
  //  C) registros com dados.dataColetaAgendada = hoje (coleta hoje)
  const { data: registros, error } = await supabase
    .from('reproducao_registros')
    .select('id, egua_id, data, tipo, dados, data_retorno, vet_id, local_id')
    .eq('workspace_id', 'repro');

  if (error) return res.status(500).json({ error: error.message });

  // Cachear nomes de éguas/vets/locais numa varredura só
  const eguaIds = [...new Set((registros || []).map(r => r.egua_id).filter(Boolean))];
  const localIds = [...new Set((registros || []).map(r => r.local_id).filter(Boolean))];

  const [eguasResp, locaisResp] = await Promise.all([
    eguaIds.length ? supabase.from('cavalos').select('id, nome').in('id', eguaIds) : { data: [] },
    localIds.length ? supabase.from('locais_repro').select('id, nome').in('id', localIds) : { data: [] },
  ]);
  const eguaNome = Object.fromEntries((eguasResp.data || []).map(x => [x.id, x.nome]));
  const localNome = Object.fromEntries((locaisResp.data || []).map(x => [x.id, x.nome]));

  const eventos = [];
  for (const r of (registros || [])) {
    const dados = typeof r.dados === 'string' ? JSON.parse(r.dados || '{}') : (r.dados || {});
    const egua = eguaNome[r.egua_id] || 'égua';
    const local = r.local_id ? ` — ${localNome[r.local_id] || ''}` : '';

    if (r.data === hoje) {
      if (r.tipo === 'inseminacao_artificial') {
        eventos.push({ title: `IA hoje: ${egua}${local}`, body: CHECKLIST_IA });
      } else if (r.tipo === 'transferencia_embriao') {
        eventos.push({ title: `TE hoje: ${egua}${local}`, body: CHECKLIST_TE });
      } else if (r.tipo === 'controle_folicular') {
        eventos.push({ title: `Controle folicular hoje: ${egua}${local}`, body: '' });
      } else if (r.tipo === 'diagnostico_gestacao') {
        eventos.push({ title: `Diagnóstico gestacional hoje: ${egua}${local}`, body: '' });
      }
    }

    if (r.data_retorno === hoje) {
      const short = r.tipo === 'inseminacao_artificial' ? 'IA' : r.tipo === 'transferencia_embriao' ? 'TE' : r.tipo === 'controle_folicular' ? 'CF' : 'DG';
      eventos.push({ title: `Retorno ${short}: ${egua}${local}`, body: '' });
    }

    if (dados.dataColetaAgendada === hoje) {
      eventos.push({ title: `Coleta de embrião hoje: ${egua}${local}`, body: CHECKLIST_TE });
    }

    // Indução de ovulação NÃO entra aqui — a notificação sai no
    // horário exato via pg_cron a cada 15min (ver
    // migration_repro_inducao_cron.sql).
  }

  // Aviso persistente (RESERVAR RECEPTORA...) — inclui na notificação
  // do dia enquanto estiver aberto, pra ninguém esquecer.
  const { data: pend } = await supabase
    .from('avisos_repro')
    .select('id, texto')
    .eq('workspace_id', 'repro')
    .is('resolvido_em', null);
  for (const a of (pend || [])) {
    eventos.push({ title: 'Aviso Repro', body: a.texto });
  }

  if (eventos.length === 0) return res.status(200).json({ hoje, sent: 0, eventos: 0 });

  const { data: subs } = await supabase
    .from('push_subscriptions').select('*').eq('role', 'repro');

  let totalSent = 0;
  const stale = [];
  await Promise.allSettled(
    (subs || []).flatMap(sub =>
      eventos.map(async (ev) => {
        try {
          await webpush.sendNotification(sub.subscription, JSON.stringify(ev));
          totalSent += 1;
        } catch (err) {
          if (err.statusCode === 410 || err.statusCode === 404) stale.push(sub.id);
        }
      }),
    ),
  );
  if (stale.length) {
    await supabase.from('push_subscriptions').delete().in('id', stale);
  }

  res.status(200).json({ hoje, eventos: eventos.length, subs: (subs || []).length, sent: totalSent });
};
