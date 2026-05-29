import { supabase } from './supabase';

function urlBase64ToUint8Array(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(b64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export async function subscribeToPush(userLogin, role) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  const vapidKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
  if (!vapidKey) return;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const sub = existing || await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    await supabase.from('push_subscriptions').upsert(
      [{ user_login: userLogin, role, subscription: sub.toJSON() }],
      { onConflict: 'user_login' },
    );
  } catch (err) {
    console.error('Push subscribe error:', err);
  }
}

export async function unsubscribeFromPush(userLogin) {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    await supabase.from('push_subscriptions').delete().eq('user_login', userLogin);
  } catch (err) {
    console.error('Push unsubscribe error:', err);
  }
}

export function sendPush(title, body, target = 'all') {
  fetch('/api/send-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body, target }),
  }).catch(() => {});
}
