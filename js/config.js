// ========== SUPABASE CONFIG ==========
const SUPABASE_URL = 'https://lktucbibgebxxhrihazj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrdHVjYmliZ2VieHhocmloYXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNTMzMjQsImV4cCI6MjA4ODkyOTMyNH0.-GPhVPoawI8VM0JF1ZRsL28GwOuRWoV8R9vynDj3qiM';

const SB = {
  async get(tabla) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${tabla}?select=*&order=created_at.desc`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${getAuthToken()}` }
    });
    return r.ok ? r.json() : [];
  },
  async insert(tabla, data) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${tabla}`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${getAuthToken()}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
      body: JSON.stringify(data)
    });
    return r.ok ? r.json() : null;
  },
  async update(tabla, id, data) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${tabla}?id=eq.${id}`, {
      method: 'PATCH',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${getAuthToken()}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
      body: JSON.stringify(data)
    });
    return r.ok ? r.json() : null;
  },
  async delete(tabla, id) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${tabla}?id=eq.${id}`, {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${getAuthToken()}` }
    });
    return r.ok;
  }
};
const SB_LISTO = SUPABASE_URL !== 'PEGA_AQUI_TU_PROJECT_URL';

// ========== PLANES (Jul-Jun) ==========
function getPlanActivo() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return m >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

function generarPlanes(n = 10) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const base = m >= 7 ? y : y - 1;
  const planes = [];
  for (let i = -(n - 3); i <= 3; i++) {
    planes.push(`${base + i}-${base + i + 1}`);
  }
  return planes;
}

function llenarSelectPlanes(selId, incluirTodos = false) {
  const sel = document.getElementById(selId);
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '';
  if (incluirTodos) {
    const o = document.createElement('option');
    o.value = '';
    o.textContent = 'Todos los planes';
    sel.appendChild(o);
  }
  const activo = getPlanActivo();
  generarPlanes().forEach(p => {
    const o = document.createElement('option');
    o.value = p;
    o.textContent = `Plan ${p}${p === activo ? ' (activo)' : ''}`;
    sel.appendChild(o);
  });
  if (prev) sel.value = prev;
  else if (!incluirTodos) sel.value = activo;
}

// ========== CONSTANTES ==========
const SUBTAREAS = {
  'COLABORACIÓN': ['Auditoría externa', 'Interdepartamental', 'Organismos externos'],
  'FORMACIÓN': ['Interna', 'Externa'],
  'SEGUIMIENTO A RECOMENDACIONES': ['--'],
  'COORDINACIÓN Y SUPERVISIÓN': ['Reunión entre auditores', 'Plan Anual de Auditoría', 'Soporte a Accionistas', 'Transición a MIPP'],
  'OTRAS ACTIVIDADES': ['Relacionadas con Auditoría Interna', 'No relacionadas con Auditoría Interna', 'Trabajo administrativo y de archivo', 'OKR Organización o de Equipo', 'Decomiso', 'Inventarios (No trabajos de auditoría)', 'Calibración equipos', 'Participación tareas Ganadera'],
  'AUSENCIAS JUSTIFICADAS': ['--'],
  'FESTIVOS Y VACACIONES': ['--']
};

// ========== STATE ==========
let db = { auditores: [], encargos: [], registros: [], otros: [], sociedades: [] };
let editEncId = null, editAudId = null, editOtroId = null, editSocId = null;
let currentTipo = 'encargo', currentReporte = 'encargos';
