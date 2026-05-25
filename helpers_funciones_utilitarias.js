// ========== HELPERS ==========

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function toArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch (e) { return []; }
  }
  return [];
}

// ========== TOAST ==========
function showToast(msg, icon = '✓') {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  document.getElementById('toast-icon').textContent = icon;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ========== MODAL ==========
function cerrarModal(id) {
  document.getElementById(id).classList.remove('open');
}

// ========== PLANES (Jul-Jun) ==========
function getPlanActivo() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return m >= 7 ? `${y}-${y+1}` : `${y-1}-${y}`;
}

function generarPlanes(n = 10) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const base = m >= 7 ? y : y - 1;
  const planes = [];
  for (let i = -(n-3); i <= 3; i++) {
    planes.push(`${base+i}-${base+i+1}`);
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

// ========== SELECTOR AUDITORES (chips) ==========
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
    chip.style.cssText = `display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:99px;cursor:pointer;font-size:12px;border:1px solid ${isSelected?'var(--accent)':'var(--border2)'};background:${isSelected?'rgba(22,163,74,0.08)':'var(--bg)'};color:${isSelected?'var(--accent)':'var(--muted2)'};transition:all 0.15s;`;
    chip.innerHTML = `<div style="width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#16a34a,#166534);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:600;color:#fff;">${(a.iniciales||a.nombre.slice(0,2)).toUpperCase()}</div>${a.nombre}`;
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

// ========== EXPORT CSV ==========
function exportarCSV() {
  const headers = ['ID', 'Fecha', 'Auditor', 'Tipo', 'Sociedad', 'Trabajo', 'Plan', 'Código', 'Tarea', 'Sub-tarea', 'Fase', 'Horas', 'Notas'];
  const rows = db.registros.map(r => {
    const aud = (db.auditores.find(a => a.id === (r.auditor_id || r.auditorId)) || { nombre: '' }).nombre;
    const enc = r.tipo === 'encargo' ? (db.encargos.find(e => e.id === (r.encargo_id || r.encargoId)) || { nombre: '', cliente: '', codigo: '', plan: '' }) : null;
    const otro = r.tipo === 'otro' ? (db.otros.find(o => o.id === r.otro_id) || { nombre: '' }) : null;
    return [
      r.id, r.fecha, aud, r.tipo,
      enc ? enc.cliente : '',
      enc ? enc.nombre : (otro ? otro.nombre : ''),
      enc ? (enc.plan || '') : '',
      enc ? (enc.codigo || '') : '',
      r.tarea || '', r.subtarea || '', r.fase || '',
      r.horas, (r.notas || '').replace(/"/g, '""')
    ].map(v => `"${v}"`).join(',');
  });
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'auditronic_' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exportado', '↓');
}
