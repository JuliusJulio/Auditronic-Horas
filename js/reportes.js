// ========== REPORTES ==========
function switchReporte(name, el) {
  currentReporte = name;
  document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  ['encargos', 'auditores', 'tareas', 'otros'].forEach(n => document.getElementById('rep-' + n).style.display = n === name ? '' : 'none');
  renderReporteActual();
}

// Helpers para leer todos los filtros
function getReportFilters() {
  return {
    ini: document.getElementById('rep-fecha-ini').value,
    fin: document.getElementById('rep-fecha-fin').value,
    plan: document.getElementById('rep-plan-filtro').value,
    auditor: document.getElementById('rep-filtro-auditor').value,
    tipo: document.getElementById('rep-filtro-tipo').value,
    sociedad: (document.getElementById('rep-filtro-sociedad').value || '').toLowerCase(),
    busqueda: (document.getElementById('rep-search').value || '').toLowerCase()
  };
}

// Filtra los REGISTROS (afecta los cálculos de horas)
function filtrarRegsPorRango() {
  const f = getReportFilters();
  let regs = [...db.registros];
  if (f.ini) regs = regs.filter(r => r.fecha >= f.ini);
  if (f.fin) regs = regs.filter(r => r.fecha <= f.fin);
  if (f.plan) regs = regs.filter(r => {
    const enc = db.encargos.find(e => e.id === (r.encargo_id || r.encargoId));
    return enc && enc.plan === f.plan;
  });
  if (f.auditor) regs = regs.filter(r => (r.auditor_id || r.auditorId) === f.auditor);
  if (f.tipo) regs = regs.filter(r => {
    if (r.tipo === 'encargo') {
      const enc = db.encargos.find(e => e.id === (r.encargo_id || r.encargoId));
      return enc && enc.tipo === f.tipo;
    }
    return false;
  });
  if (f.sociedad) regs = regs.filter(r => {
    if (r.tipo === 'encargo') {
      const enc = db.encargos.find(e => e.id === (r.encargo_id || r.encargoId));
      return enc && (enc.cliente || '').toLowerCase().includes(f.sociedad);
    }
    if (r.tipo === 'otro') {
      const otro = db.otros.find(o => o.id === r.otro_id);
      return otro && (otro.sociedad || '').toLowerCase().includes(f.sociedad);
    }
    return false;
  });
  if (f.busqueda) regs = regs.filter(r => {
    const aud = (db.auditores.find(a => a.id === (r.auditor_id || r.auditorId)) || { nombre: '' }).nombre.toLowerCase();
    const enc = (db.encargos.find(e => e.id === (r.encargo_id || r.encargoId)) || { nombre: '', cliente: '' });
    const otro = (db.otros.find(o => o.id === r.otro_id) || { nombre: '' });
    return aud.includes(f.busqueda) ||
      enc.nombre.toLowerCase().includes(f.busqueda) ||
      (enc.cliente || '').toLowerCase().includes(f.busqueda) ||
      otro.nombre.toLowerCase().includes(f.busqueda) ||
      (r.tarea || '').toLowerCase().includes(f.busqueda) ||
      (r.notas || '').toLowerCase().includes(f.busqueda);
  });
  return regs;
}

function renderReporteActual() {
  // Guardar valores ANTES de reconstruir selects
  const savedPlan = document.getElementById('rep-plan-filtro').value;
  const savedAud = document.getElementById('rep-filtro-auditor').value;
  const savedTipo = document.getElementById('rep-filtro-tipo').value;

  llenarSelectPlanes('rep-plan-filtro', true);
  updateAuditorSelect('rep-filtro-auditor');

  // Restaurar
  if (savedPlan) document.getElementById('rep-plan-filtro').value = savedPlan;
  if (savedAud) document.getElementById('rep-filtro-auditor').value = savedAud;
  if (savedTipo) document.getElementById('rep-filtro-tipo').value = savedTipo;

  const regs = filtrarRegsPorRango();
  if (currentReporte === 'encargos') renderRepEncargos(regs);
  if (currentReporte === 'auditores') renderRepAuditores(regs);
  if (currentReporte === 'tareas') renderRepTareas(regs);
  if (currentReporte === 'otros') renderRepOtros(regs);
}

// ========== POR TRABAJO ==========
function renderRepEncargos(regs) {
  const tbody = document.getElementById('rep-enc-tbody');
  const empty = document.getElementById('rep-enc-empty');
  tbody.innerHTML = '';

  const f = getReportFilters();
  // FILTRAR LAS FILAS (no solo los regs)
  const encs = db.encargos.filter(e => {
    if (f.plan && e.plan !== f.plan) return false;
    if (f.tipo && e.tipo !== f.tipo) return false;
    if (f.auditor && !toArray(e.auditores_ids).includes(f.auditor)) return false;
    if (f.sociedad && !(e.cliente || '').toLowerCase().includes(f.sociedad)) return false;
    if (f.busqueda) {
      const txt = ((e.nombre || '') + ' ' + (e.cliente || '') + ' ' + (e.codigo || '') + ' ' + (e.notas || '')).toLowerCase();
      if (!txt.includes(f.busqueda)) return false;
    }
    return true;
  });

  if (!encs.length) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  const planActivo = getPlanActivo();
  const tipoBadge = { 'Aseguramiento': 'badge-blue', 'Consultoría': 'badge-purple', 'Auditoría Continua': 'badge-teal' };

  encs.forEach(e => {
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

// ========== POR AUDITOR ==========
function renderRepAuditores(regs) {
  const tbody = document.getElementById('rep-aud-tbody');
  const empty = document.getElementById('rep-aud-empty');
  tbody.innerHTML = '';

  const f = getReportFilters();
  // Si hay filtro de auditor, mostrar solo ese
  let auds = f.auditor ? db.auditores.filter(a => a.id === f.auditor) : [...db.auditores];

  // Si hay búsqueda de texto, filtrar por nombre/rol/email
  if (f.busqueda) {
    auds = auds.filter(a => ((a.nombre || '') + ' ' + (a.rol || '') + ' ' + (a.email || '')).toLowerCase().includes(f.busqueda));
  }

  if (!auds.length) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  auds.forEach(a => {
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

// ========== POR TAREA GENERAL ==========
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

// ========== OTROS TRABAJOS (REPORTE) ==========
function renderRepOtros(regs) {
  const tbody = document.getElementById('rep-otros-tbody');
  const empty = document.getElementById('rep-otros-empty');
  tbody.innerHTML = '';

  const f = getReportFilters();
  // FILTRAR LAS FILAS (no aplica plan ni tipo, que son específicos de encargos)
  const otros = db.otros.filter(o => {
    if (f.auditor && !toArray(o.auditores_ids).includes(f.auditor)) return false;
    if (f.sociedad && !(o.sociedad || '').toLowerCase().includes(f.sociedad)) return false;
    if (f.busqueda) {
      const txt = ((o.nombre || '') + ' ' + (o.sociedad || '') + ' ' + (o.codigo || '') + ' ' + (o.descripcion || '')).toLowerCase();
      if (!txt.includes(f.busqueda)) return false;
    }
    return true;
  });

  if (!otros.length) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  otros.forEach(o => {
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
