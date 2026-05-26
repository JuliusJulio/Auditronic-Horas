// ========== REPORTES ==========
function switchReporte(name, el) {
  currentReporte = name;
  document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  ['encargos', 'auditores', 'tareas', 'otros'].forEach(n => document.getElementById('rep-' + n).style.display = n === name ? '' : 'none');
  renderReporteActual();
}

// ▸ PUNTO 10: Filtros adicionales en Reportes
function filtrarRegsPorRango() {
  const ini = document.getElementById('rep-fecha-ini').value;
  const fin = document.getElementById('rep-fecha-fin').value;
  const plan = document.getElementById('rep-plan-filtro').value;
  const auditor = document.getElementById('rep-filtro-auditor')?.value || '';
  const tipo = document.getElementById('rep-filtro-tipo')?.value || '';
  const sociedad = document.getElementById('rep-filtro-sociedad')?.value?.toLowerCase() || '';
  const busqueda = document.getElementById('rep-search')?.value?.toLowerCase() || '';

  let regs = [...db.registros];
  if (ini) regs = regs.filter(r => r.fecha >= ini);
  if (fin) regs = regs.filter(r => r.fecha <= fin);
  if (plan) regs = regs.filter(r => {
    const enc = db.encargos.find(e => e.id === (r.encargo_id || r.encargoId));
    return enc && enc.plan === plan;
  });
  if (auditor) regs = regs.filter(r => (r.auditor_id || r.auditorId) === auditor);
  if (tipo) regs = regs.filter(r => {
    if (r.tipo === 'encargo') {
      const enc = db.encargos.find(e => e.id === (r.encargo_id || r.encargoId));
      return enc && enc.tipo === tipo;
    }
    return false;
  });
  if (sociedad) regs = regs.filter(r => {
    if (r.tipo === 'encargo') {
      const enc = db.encargos.find(e => e.id === (r.encargo_id || r.encargoId));
      return enc && (enc.cliente || '').toLowerCase().includes(sociedad);
    }
    if (r.tipo === 'otro') {
      const otro = db.otros.find(o => o.id === r.otro_id);
      return otro && (otro.sociedad || '').toLowerCase().includes(sociedad);
    }
    return false;
  });
  if (busqueda) regs = regs.filter(r => {
    const aud = (db.auditores.find(a => a.id === (r.auditor_id || r.auditorId)) || { nombre: '' }).nombre.toLowerCase();
    const enc = (db.encargos.find(e => e.id === (r.encargo_id || r.encargoId)) || { nombre: '', cliente: '' });
    const otro = (db.otros.find(o => o.id === r.otro_id) || { nombre: '' });
    return aud.includes(busqueda) ||
      enc.nombre.toLowerCase().includes(busqueda) ||
      (enc.cliente || '').toLowerCase().includes(busqueda) ||
      otro.nombre.toLowerCase().includes(busqueda) ||
      (r.tarea || '').toLowerCase().includes(busqueda) ||
      (r.notas || '').toLowerCase().includes(busqueda);
  });
  return regs;
}

function initReportFilters() {
  // Llenar select de auditores para reportes
  updateAuditorSelect('rep-filtro-auditor');
}

function renderReporteActual() {
  llenarSelectPlanes('rep-plan-filtro', true);
  updateAuditorSelect('rep-filtro-auditor');
  const regs = filtrarRegsPorRango();
  if (currentReporte === 'encargos') renderRepEncargos(regs);
  if (currentReporte === 'auditores') renderRepAuditores(regs);
  if (currentReporte === 'tareas') renderRepTareas(regs);
  if (currentReporte === 'otros') renderRepOtros(regs);
}

function renderRepEncargos(regs) {
  const tbody = document.getElementById('rep-enc-tbody');
  const empty = document.getElementById('rep-enc-empty');
  tbody.innerHTML = '';
  if (!db.encargos.length) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  const planActivo = getPlanActivo();
  const tipoBadge = { 'Aseguramiento': 'badge-blue', 'Consultoría': 'badge-purple', 'Auditoría Continua': 'badge-teal' };

  db.encargos.forEach(e => {
    const exec = regs.filter(r => (r.encargo_id || r.encargoId) === e.id).reduce((s, r) => s + r.horas, 0);
    const pct = e.presupuesto > 0 ? Math.min(100, Math.round(exec / e.presupuesto * 100)) : 0;
    const rest = e.presupuesto > 0 ? Math.max(0, e.presupuesto - exec) : 0;
    const color = pct >= 90 ? 'var(--red)' : pct >= 70 ? 'var(--amber)' : 'var(--green)';
    const bE = e.estado === 'Activo' ? 'badge-green' : e.estado === 'Finalizado' ? 'badge-muted' : 'badge-amber';
    const bT = tipoBadge[e.tipo] || 'badge-muted';
    tbody.innerHTML += `<tr>
      <td>${e.cliente}</td><td style="font-weight:500;">${e.nombre}</td>
      <td><span class="badge ${bT}">${e.tipo || '—'}</span></td>
      <td><span class="plan-badge ${e.plan === planActivo ? 'activo' : ''}">${e.plan || '—'}</span></td>
      <td style="font-family:var(--mono);font-size:12px;">${e.codigo || '—'}</td>
      <td style="font-family:var(--mono);">${e.presupuesto || '—'}</td>
      <td style="font-family:var(--mono);color:var(--accent);">${exec.toFixed(1)}</td>
      <td style="font-family:var(--mono);">${e.presupuesto > 0 ? rest.toFixed(1) : '—'}</td>
      <td>${e.presupuesto > 0 ? `<div class="prog-wrap"><div class="prog-bar"><div class="prog-fill" style="width:${pct}%;background:${color};"></div></div><span class="prog-pct">${pct}%</span></div>` : '—'}</td>
      <td><span class="badge ${bE}">${e.estado}</span></td>
    </tr>`;
  });
}

function renderRepAuditores(regs) {
  const tbody = document.getElementById('rep-aud-tbody');
  const empty = document.getElementById('rep-aud-empty');
  tbody.innerHTML = '';
  if (!db.auditores.length) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  db.auditores.forEach(a => {
    const myRegs = regs.filter(r => (r.auditor_id || r.auditorId) === a.id);
    const hEnc = myRegs.filter(r => r.tipo === 'encargo').reduce((s, r) => s + r.horas, 0);
    const hOtro = myRegs.filter(r => r.tipo === 'otro').reduce((s, r) => s + r.horas, 0);
    const hTar = myRegs.filter(r => r.tipo === 'tarea').reduce((s, r) => s + r.horas, 0);
    const rb = a.rol === 'Director de Auditoría' ? 'badge-amber' : a.rol === 'Gerente' ? 'badge-blue' : a.rol === 'Senior' ? 'badge-teal' : 'badge-muted';
    tbody.innerHTML += `<tr>
      <td><div style="display:flex;align-items:center;gap:8px;"><div class="avatar" style="width:26px;height:26px;font-size:10px;">${(a.iniciales || a.nombre.slice(0, 2)).toUpperCase()}</div>${a.nombre}</div></td>
      <td><span class="badge ${rb}">${a.rol}</span></td>
      <td style="font-family:var(--mono);">${hEnc.toFixed(1)}</td>
      <td style="font-family:var(--mono);">${hOtro.toFixed(1)}</td>
      <td style="font-family:var(--mono);">${hTar.toFixed(1)}</td>
      <td style="font-family:var(--mono);font-weight:600;color:var(--accent);">${(hEnc + hOtro + hTar).toFixed(1)}</td>
      <td style="font-family:var(--mono);">${myRegs.length}</td>
    </tr>`;
  });
}

function renderRepTareas(regs) {
  const tbody = document.getElementById('rep-tar-tbody');
  const empty = document.getElementById('rep-tar-empty');
  const tarRegs = regs.filter(r => r.tipo === 'tarea');
  tbody.innerHTML = '';
  if (!tarRegs.length) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  const total = tarRegs.reduce((s, r) => s + r.horas, 0);
  const grouped = {};
  tarRegs.forEach(r => {
    const k = r.tarea + '|||' + (r.subtarea || '--');
    if (!grouped[k]) grouped[k] = { tarea: r.tarea, subtarea: r.subtarea || '--', horas: 0, count: 0 };
    grouped[k].horas += r.horas;
    grouped[k].count++;
  });
  Object.values(grouped).sort((a, b) => b.horas - a.horas).forEach(g => {
    const pct = total > 0 ? Math.round(g.horas / total * 100) : 0;
    tbody.innerHTML += `<tr><td style="font-weight:500;">${g.tarea}</td><td style="color:var(--muted);">${g.subtarea === '--' ? '—' : g.subtarea}</td><td style="font-family:var(--mono);color:var(--teal);">${g.horas.toFixed(1)}</td><td style="font-family:var(--mono);">${g.count}</td><td><div class="prog-wrap"><div class="prog-bar" style="min-width:60px;"><div class="prog-fill" style="width:${pct}%;background:var(--teal);"></div></div><span class="prog-pct">${pct}%</span></div></td></tr>`;
  });
}

function renderRepOtros(regs) {
  const tbody = document.getElementById('rep-otros-tbody');
  const empty = document.getElementById('rep-otros-empty');
  tbody.innerHTML = '';
  if (!db.otros.length) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  db.otros.forEach(o => {
    const exec = regs.filter(r => r.otro_id === o.id).reduce((s, r) => s + r.horas, 0);
    const pct = o.presupuesto > 0 ? Math.min(100, Math.round(exec / o.presupuesto * 100)) : 0;
    const color = pct >= 90 ? 'var(--red)' : pct >= 70 ? 'var(--amber)' : 'var(--green)';
    tbody.innerHTML += `<tr>
      <td style="color:var(--muted);font-size:12px;">${o.sociedad || '—'}</td>
      <td style="font-weight:500;">${o.nombre}</td>
      <td style="font-family:var(--mono);font-size:12px;">${o.codigo || '—'}</td>
      <td style="color:var(--muted);font-size:12px;">${o.descripcion || '—'}</td>
      <td style="font-family:var(--mono);">${o.presupuesto || '—'}</td>
      <td style="font-family:var(--mono);color:var(--accent);">${exec.toFixed(1)}</td>
      <td>${o.presupuesto > 0 ? `<div class="prog-wrap"><div class="prog-bar"><div class="prog-fill" style="width:${pct}%;background:${color};"></div></div><span class="prog-pct">${pct}%</span></div>` : '—'}</td>
    </tr>`;
  });
}
