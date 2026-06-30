// ========== HELPERS ==========
function toArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch (e) { return []; }
  }
  return [];
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function saveLocal(key) {
  localStorage.setItem('at_' + key, JSON.stringify(db[key]));
}

// ========== DATA ==========
async function cargarDatos() {
  if (SB_LISTO) {
    showToast('Cargando datos…', '⟳');
    try {
      const [auditores, encargos, registros, otros, sociedades] = await Promise.all([
        SB.get('auditores'), SB.get('encargos'), SB.get('registros'), SB.get('otros_trabajos'), SB.get('sociedades')
      ]);
      db.auditores = auditores || [];
      db.encargos = encargos || [];
      db.registros = registros || [];
      db.otros = otros || [];
      db.sociedades = sociedades || [];
      showToast('Datos cargados', '✓');
    } catch (e) { showToast('Error al cargar datos', '⚠'); }
  } else {
    db.auditores = JSON.parse(localStorage.getItem('at_auditores') || '[]');
    db.encargos = JSON.parse(localStorage.getItem('at_encargos') || '[]');
    db.registros = JSON.parse(localStorage.getItem('at_registros') || '[]');
    db.otros = JSON.parse(localStorage.getItem('at_otros') || '[]');
    db.sociedades = JSON.parse(localStorage.getItem('at_sociedades') || '[]');
  }
}

// ========== TOAST ==========
function showToast(msg, icon = '✓') {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  document.getElementById('toast-icon').textContent = icon;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ========== MODALS ==========
function cerrarModal(id) {
  document.getElementById(id).classList.remove('open');
}

function initModalOverlays() {
  document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => {
      if (e.target === o) o.classList.remove('open');
    });
  });
}

// ========== VALIDACIONES FORM ==========
function validarHoras(input) {
  const v = parseFloat(input.value);
  const err = document.getElementById('reg-horas-error');
  const hint = document.getElementById('reg-horas-hint');
  if (v > 10) {
    input.classList.add('error');
    err.style.display = 'block';
    hint.style.display = 'none';
  } else {
    input.classList.remove('error');
    err.style.display = 'none';
    hint.style.display = 'block';
  }
}

function actualizarContador() {
  const ta = document.getElementById('reg-notas');
  const c = document.getElementById('notas-counter');
  const len = ta.value.length;
  c.textContent = `${len}/140`;
  c.className = 'char-counter' + (len > 120 ? ' warn' : '') + (len >= 140 ? ' over' : '');
}

// ========== SELECTS COMUNES ==========
function updateAuditorSelect(id) {
  const sel = document.getElementById(id);
  if (!sel) return;
  const prev = sel.value;
  const firstOpt = sel.querySelector('option')?.textContent || '— seleccionar —';
  sel.innerHTML = `<option value="">${firstOpt}</option>`;
  db.auditores.forEach(a => {
    const o = document.createElement('option');
    o.value = a.id;
    o.textContent = a.nombre + ' (' + a.rol + ')';
    sel.appendChild(o);
  });
  if (prev) sel.value = prev;
}

function updateEncargoSelect() {
  const sel = document.getElementById('reg-encargo');
  const prev = sel.value;
  sel.innerHTML = '<option value="">— seleccionar trabajo —</option>';
  db.encargos.filter(e => e.estado === 'Activo').forEach(e => {
    const o = document.createElement('option');
    o.value = e.id;
    o.textContent = e.cliente + ' — ' + e.nombre;
    sel.appendChild(o);
  });
  if (prev) sel.value = prev;
}

function updateOtroSelect() {
  const sel = document.getElementById('reg-otro');
  const prev = sel.value;
  sel.innerHTML = '<option value="">— seleccionar —</option>';
  db.otros.forEach(o => {
    const op = document.createElement('option');
    op.value = o.id;
    op.textContent = o.nombre;
    sel.appendChild(op);
  });
  if (prev) sel.value = prev;
}

// ========== AUDITORES CHECKBOX CHIPS ==========
function renderAuditoresCheck(containerId, selectedIds = []) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  if (db.auditores.length === 0) {
    container.innerHTML = '<span style="font-size:12px;color:var(--muted);">No hay auditores registrados</span>';
    return;
  }
  db.auditores.forEach(a => {
    const isSelected = selectedIds.includes(a.id);
    const chip = document.createElement('div');
    chip.style.cssText = `display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:99px;cursor:pointer;font-size:12px;border:1px solid ${isSelected ? 'var(--accent)' : 'var(--border2)'};background:${isSelected ? 'rgba(22,163,74,0.08)' : 'var(--bg)'};color:${isSelected ? 'var(--accent)' : 'var(--muted2)'};transition:all 0.15s;`;
    chip.innerHTML = `<div style="width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#16a34a,#166534);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:600;color:#fff;">${(a.iniciales || a.nombre.slice(0, 2)).toUpperCase()}</div>${a.nombre}`;
    chip.dataset.id = a.id;
    chip.dataset.selected = isSelected ? '1' : '0';
    chip.onclick = () => {
      const sel = chip.dataset.selected === '1';
      chip.dataset.selected = sel ? '0' : '1';
      chip.style.border = `1px solid ${!sel ? 'var(--accent)' : 'var(--border2)'}`;
      chip.style.background = !sel ? 'rgba(22,163,74,0.08)' : 'var(--bg)';
      chip.style.color = !sel ? 'var(--accent)' : 'var(--muted2)';
    };
    container.appendChild(chip);
  });
}

function getSelectedAuditores(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  return [...container.querySelectorAll('[data-selected="1"]')].map(c => c.dataset.id);
}

// ========== SOCIEDADES HELPERS ==========
function llenarSelectSociedades(selId, incluirVacio = true) {
  const sel = document.getElementById(selId);
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '';
  if (incluirVacio) {
    const o = document.createElement('option');
    o.value = '';
    o.textContent = '— seleccionar sociedad —';
    sel.appendChild(o);
  }
  db.sociedades.sort((a, b) => a.numero.localeCompare(b.numero)).forEach(s => {
    const o = document.createElement('option');
    o.value = s.nombre;
    o.textContent = `${s.numero} - ${s.nombre}`;
    sel.appendChild(o);
  });
  if (prev) sel.value = prev;
}
