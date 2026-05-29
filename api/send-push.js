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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { title, body, target } = req.body; // target: 'all' | 'admin'
  if (!title) return res.status(400).json({ error: 'title required' });

  let query = supabase.from('push_subscriptions').select('*');
  if (target === 'admin') query = query.eq('role', 'admin');

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
