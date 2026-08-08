// Camada de multi-sessão do app. A ideia é o mesmo padrão do Instagram
// e do Gmail: várias contas persistidas em localStorage, uma delas
// marcada como ativa; trocar de conta só muda a "activeKey" sem
// re-autenticar. Nenhuma senha é armazenada — cada nova conta entra
// via login normal e o objeto de usuário sanitizado é empilhado aqui.
//
// Formato:
//   localStorage.epona_sessions = [{ key, user }]
//   localStorage.epona_active_session = "<key>"
// Onde `key` é único por conta (role + login), pra permitir a mesma
// pessoa em dois roles diferentes (ex.: admin haras + vet repro).

const SESSIONS_KEY = 'epona_sessions';
const ACTIVE_KEY = 'epona_active_session';
const LEGACY_KEY = 'epona_user';

function sanitize(user) {
  if (!user || typeof user !== 'object') return user;
  const { _sessionPassword, ...safe } = user;
  return safe;
}

function keyFor(user) {
  const role = user?.role || 'unknown';
  const id = user?.login || user?.id || user?.nome || 'anon';
  return `${role}:${String(id).toLowerCase()}`;
}

function readSessionsRaw() {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter(s => s && s.user && s.key) : [];
  } catch {
    return [];
  }
}

function writeSessions(arr) {
  try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(arr)); } catch {}
}
function writeActive(key) {
  try {
    if (key) localStorage.setItem(ACTIVE_KEY, key);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {}
}

// Migração do formato antigo (epona_user único) → array de sessões.
// Roda uma vez; depois a chave legada é removida.
function migrateLegacyIfNeeded() {
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (!legacy) return;
    const existing = readSessionsRaw();
    if (existing.length > 0) {
      // Já migrou — só limpa a chave antiga sem sobrescrever
      localStorage.removeItem(LEGACY_KEY);
      return;
    }
    const parsed = JSON.parse(legacy);
    if (!parsed || !parsed.role) {
      localStorage.removeItem(LEGACY_KEY);
      return;
    }
    const key = keyFor(parsed);
    writeSessions([{ key, user: sanitize(parsed) }]);
    writeActive(key);
    localStorage.removeItem(LEGACY_KEY);
  } catch {}
}

// API pública ─────────────────────────────────────────────────

export function getSessions() {
  migrateLegacyIfNeeded();
  return readSessionsRaw();
}

export function getActiveKey() {
  migrateLegacyIfNeeded();
  try { return localStorage.getItem(ACTIVE_KEY) || null; } catch { return null; }
}

export function getActiveSession() {
  const key = getActiveKey();
  if (!key) return null;
  return getSessions().find(s => s.key === key) || null;
}

// Adiciona/atualiza uma conta e marca como ativa.
// Se já existir uma sessão com o mesmo key (mesmo role+login), atualiza
// o user (permite refresh dos dados sem duplicar). Retorna a key.
export function upsertActive(user) {
  const safe = sanitize(user);
  const key = keyFor(safe);
  const sessions = readSessionsRaw();
  const idx = sessions.findIndex(s => s.key === key);
  if (idx >= 0) sessions[idx] = { key, user: safe };
  else sessions.push({ key, user: safe });
  writeSessions(sessions);
  writeActive(key);
  return key;
}

// Atualiza o user da sessão ativa (ex.: quando o próprio user muda no
// banco — troca de senha, cadastro completo etc.). Não muda active key.
export function updateActiveUser(user) {
  const active = getActiveKey();
  if (!active) return;
  const safe = sanitize(user);
  const sessions = readSessionsRaw().map(s => s.key === active ? { key: active, user: safe } : s);
  writeSessions(sessions);
}

// Marca outra sessão como ativa. Retorna o user dessa sessão (ou null).
export function switchTo(key) {
  const sess = readSessionsRaw().find(s => s.key === key);
  if (!sess) return null;
  writeActive(key);
  return sess.user;
}

// Remove uma sessão. Se era a ativa, ativa outra qualquer (ou nenhuma).
// Retorna o novo user ativo (ou null se não sobrou nenhuma).
export function removeSession(key) {
  const sessions = readSessionsRaw().filter(s => s.key !== key);
  writeSessions(sessions);
  const active = getActiveKey();
  if (active === key) {
    const next = sessions[0]?.key || null;
    writeActive(next);
    return sessions[0]?.user || null;
  }
  return getActiveSession()?.user || null;
}

// Remove todas — usado no "Sair de todas as contas".
export function clearAllSessions() {
  writeSessions([]);
  writeActive(null);
}

export function keyForUser(user) {
  return keyFor(user);
}
