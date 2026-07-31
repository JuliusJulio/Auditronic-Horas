// ========== AUTH ==========
const AUTH_KEY = 'at_session';

async function signIn(email, password) {
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await r.json();
    if (!r.ok) {
      const msg = data.error_description || data.msg || data.message || 'Credenciales inválidas';
      return { error: msg };
    }
    localStorage.setItem(AUTH_KEY, JSON.stringify(data));
    return { session: data };
  } catch (e) {
    return { error: 'Error de conexión. Intenta de nuevo.' };
  }
}

async function signOut() {
  const session = getSession();
  if (session) {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${session.access_token}` }
      });
    } catch (e) { /* ignorar errores de red al hacer logout */ }
  }
  localStorage.removeItem(AUTH_KEY);
  window.location.href = 'login.html';
}

function getSession() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function getAuthToken() {
  const s = getSession();
  return s ? s.access_token : SUPABASE_KEY;
}

function getUserEmail() {
  const s = getSession();
  return s && s.user ? s.user.email : null;
}

// ========== INACTIVITY TIMEOUT ==========
const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 min en ms

function marcarActividad() {
  localStorage.setItem('at_last_activity', Date.now());
}

function iniciarVigilanteInactividad() {
  marcarActividad();
  ['click', 'keydown', 'mousemove'].forEach(ev =>
    document.addEventListener(ev, marcarActividad)
  );
  setInterval(() => {
    const last = parseInt(localStorage.getItem('at_last_activity') || '0');
    if (Date.now() - last > INACTIVITY_LIMIT) {
      signOut();
    }
  }, 60 * 1000); // revisa cada minuto
}
