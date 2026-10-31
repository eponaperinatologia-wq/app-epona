const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

webpush.setVapidDetails(
  'mailto:epona.perinatologia@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const ANON_KEY = process.env.REACT_APP_SUPABASE_KEY;

// As inscrições (push_subscriptions) só são lidas com a service role: as
// regras do banco não deixam a chave pública ler. Sem a variável na Vercel,
// cai na chave pública — só funciona enquanto o banco está em transição.
const supabase = createClient(
  SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// Quem pode disparar: equipe / Repro logados (token da sessão) ou o pg_cron
// do banco (segredo no header x-push-secret, guardado no Vault do Supabase).
async function autorizado(req) {
  const segredo = req.headers['x-push-secret'];
  if (segredo) {
    const { data } = await supabase.rpc('push_segredo_confere', { p_segredo: String(segredo) });
    return data === true;
  }
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return false;
  const comoUsuario = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: acesso } = await comoUsuario.rpc('meu_acesso');
  return !!acesso && (acesso.tipo === 'equipe' || acesso.tipo === 'repro');
}

module.exports = async function handler(req, res) {
  // Diagnóstico sem dados: esta publicação tem a chave de serviço? (sem ela,
  // com o banco fechado para quem não tem login, o push não lê as inscrições)
  if (req.method === 'GET') {
    // Só a chave de serviço lê a tabela acessos — confere que não colaram a pública.
    const { error } = await supabase.from('acessos').select('user_id', { count: 'exact', head: true });
    return res.status(200).json({ chaveServico: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY), chaveServicoValida: !error });
  }
  if (req.method !== 'POST') return res.status(405).end();
  if (!(await autorizado(req))) return res.status(401).json({ error: 'unauthorized' });

  // target aceito:
  //   'all'                          → toda a equipe (proprietários não)
  //   'admin'                        → só admins
  //   'repro'                        → todos os vets do repro team
  //   { logins: ['a','b'] }          → subs específicos por user_login
  //   { role: 'repro' }              → equivalente a 'repro'
  const { title, body, target } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });

  let query = supabase.from('push_subscriptions').select('*');
  if (typeof target === 'string') {
    if (target === 'admin' || target === 'repro') query = query.eq('role', target);
    else query = query.neq('role', 'proprietario');
  } else if (target && typeof target === 'object') {
    if (target.role) query = query.eq('role', target.role);
    if (Array.isArray(target.logins) && target.logins.length > 0) query = query.in('user_login', target.logins);
  } else {
    query = query.neq('role', 'proprietario');
  }

  const { data: subs, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const payload = JSON.stringify({ title, body: body || '' });
  const stale = [];

  await Promise.allSettled(
    (subs || []).map(async (row) => {
      try {
        await webpush.sendNotification(row.subscription, payload);
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) stale.push(row.id);
      }
    }),
  );

  if (stale.length) {
    await supabase.from('push_subscriptions').delete().in('id', stale);
  }

  res.status(200).json({ sent: (subs?.length ?? 0) - stale.length });
};
