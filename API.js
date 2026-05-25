// ========== API SUPABASE ==========
const SB = {
  async get(tabla) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${tabla}?select=*&order=created_at.desc`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    return r.ok ? r.json() : [];
  },

  async insert(tabla, data) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${tabla}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(data)
    });
    return r.ok ? r.json() : null;
  },

  async update(tabla, id, data) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${tabla}?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(data)
    });
    return r.ok ? r.json() : null;
  },

  async delete(tabla, id) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${tabla}?id=eq.${id}`, {
      method: 'DELETE',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    return r.ok;
  }
};

// ========== CARGAR DATOS ==========
async function cargarDatos() {
  if (SB_LISTO) {
    showToast('Cargando datos…', '⟳');
    try {
      const [auditores, encargos, registros, otros] = await Promise.all([
        SB.get('auditores'),
        SB.get('encargos'),
        SB.get('registros'),
        SB.get('otros_trabajos')
      ]);
      db.auditores = auditores || [];
      db.encargos = encargos || [];
      db.registros = registros || [];
      db.otros = otros || [];
      showToast('Datos cargados', '✓');
    } catch (e) {
      showToast('Error al cargar datos', '⚠');
    }
  } else {
    db.auditores = JSON.parse(localStorage.getItem('at_auditores') || '[]');
    db.encargos = JSON.parse(localStorage.getItem('at_encargos') || '[]');
    db.registros = JSON.parse(localStorage.getItem('at_registros') || '[]');
    db.otros = JSON.parse(localStorage.getItem('at_otros') || '[]');
  }
}

function saveLocal(key) {
  localStorage.setItem('at_' + key, JSON.stringify(db[key]));
}
