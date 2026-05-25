// ========== DASHBOARD ==========
function renderDashboard() {
  const now = new Date();
  const planActivo = getPlanActivo();
  document.getElementById('dash-date').textContent = now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('dash-plan-badge').textContent = `Plan ${planActivo}`;
  document.getElementById('encargos-plan-sub').textContent = `Plan activo: ${planActivo}`;

  const mes = now.toISOString().slice(0, 7);
  const regMes = db.registros.filter(r => r.fecha && r.fecha.startsWith(mes));
  const totalH = regMes.reduce((s, r) => s + r.horas, 0);
  const hEnc = regMes.filter(r => r.tipo === 'encargo').reduce((s, r) => s + r.horas, 0);
  const hOtra = regMes.filter(r => r.tipo === 'tarea' || r.tipo === 'otro').reduce((s, r) => s + r.horas, 0);
  const activos = db.encargos.filter(e => e.estado === 'Activo').length;

  document.getElementById('kpi-mes').textContent = totalH.toFixed(1);
  document.getElementById('kpi-mes-delta').textContent = db.registros.length + ' registros totales';
  document.getElementById('kpi-encargos').textContent = hEnc.toFixed(1);
  document.getElementById('kpi-encargos-delta').textContent = activos + ' trabajos activos';
  document.getElementById('kpi-otras').textContent = hOtra.toFixed(1);
  document.getElementById('kpi-equipo').textContent = db.auditores.length;

  // KPI Plan
  const encPlan = db.encargos.filter(e => e.plan === planActivo);
  const encFin = encPlan.filter(e => e.estado === 'Finalizado').length;
  const pctPlan = encPlan.length > 0 ? Math.round(encFin / encPlan.length * 100) : 0;
  document.getElementById('kpi-plan-pct').textContent = pctPlan + '%';
  document.getElementById('kpi-plan-detalle').textContent = `${encFin}/${encPlan.length} trabajos finalizados`;

  renderDashRecent();
  renderDashEncargos(planActivo);
  renderDashTareas(regMes);
}

function renderDashRecent() {
  const recent = [...db.registros].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 6);
  const tbody = document.getElementById('dash-recent');
  document.getElementById('dash-recent-empty').style.display = recent.length ? 'none' : 'block';
  tbody.innerHTML = '';
  recent.forEach(r => {
    const aud = db.auditores.find(a => a.id === (r.auditor_id || r.auditorId));
    let desc = '';
    if (r.tipo === 'encargo') desc = (db.encargos.find(e => e.id === (r.encargo_id || r.encargoId)) || { nombre: '?' }).nombre + (r.fase ? ' · ' + r.fase : '');
    else if (r.tipo === 'otro') desc = (db.otros.find(o => o.id === r.otro_id) || { nombre: '?' }).nombre + ' · Otro trabajo';
    else desc = (r.tarea || '?') + (r.subtarea && r.subtarea !== '--' ? ' · ' + r.subtarea : '');
    tbody.innerHTML += `<tr>
      <td style="font-family:var(--mono);font-size:12px;">${r.fecha}</td>
      <td>${aud ? aud.nombre : '?'}</td>
      <td style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${desc}</td>
      <td style="font-family:var(--mono);font-weight:600;color:var(--accent);">${r.horas.toFixed(1)}h</td>
    </tr>`;
  });
}

function renderDashEncargos(planActivo) {
  const etbody = document.getElementById('dash-encargos');
  const activosEnc = db.encargos.filter(e => e.plan === planActivo && e.estado === 'Activo');
  document.getElementById('dash-encargos-empty').style.display = activosEnc.length ? 'none' : 'block';
  etbody.innerHTML = '';
  activosEnc.slice(0, 5).forEach(e => {
    const exec = db.registros.filter(r => (r.encargo_id || r.encargoId) === e.id).reduce((s, r) => s + r.horas, 0);
    const pct = e.presupuesto > 0 ? Math.min(100, Math.round(exec / e.presupuesto * 100)) : 0;
    const color = pct >= 90 ? 'var(--red)' : pct >= 70 ? 'var(--amber)' : 'var(--green)';
    etbody.innerHTML += `<tr>
      <td>${e.nombre}<br><span style="font-size:11px;color:var(--muted);">${e.cliente}</span></td>
      <td style="font-family:var(--mono);">${exec.toFixed(1)}h${e.presupuesto > 0 ? ' / ' + e.presupuesto + 'h' : ''}</td>
      <td><div class="prog-wrap"><div class="prog-bar"><div class="prog-fill" style="width:${pct}%;background:${color};"></div></div><span class="prog-pct">${pct}%</span></div></td>
    </tr>`;
  });
}

function renderDashTareas(regMes) {
  const tareasRegs = regMes.filter(r => r.tipo === 'tarea');
  const ttbody = document.getElementById('dash-tareas');
  document.getElementById('dash-tareas-empty').style.display = tareasRegs.length ? 'none' : 'block';
  ttbody.innerHTML = '';
  const totalT = tareasRegs.reduce((s, r) => s + r.horas, 0);
  const grouped = {};
  tareasRegs.forEach(r => {
    const k = r.tarea + '|||' + (r.subtarea || '--');
    if (!grouped[k]) grouped[k] = { tarea: r.tarea, subtarea: r.subtarea || '--', horas: 0 };
    grouped[k].horas += r.horas;
  });
  Object.values(grouped).sort((a, b) => b.horas - a.horas).forEach(g => {
    const pct = totalT > 0 ? Math.round(g.horas / totalT * 100) : 0;
    ttbody.innerHTML += `<tr>
      <td style="font-weight:500;">${g.tarea}</td>
      <td style="color:var(--muted);font-size:12px;">${g.subtarea === '--' ? '—' : g.subtarea}</td>
      <td style="font-family:var(--mono);">${g.horas.toFixed(1)}h</td>
      <td><div class="prog-wrap"><div class="prog-bar" style="min-width:60px;"><div class="prog-fill" style="width:${pct}%;background:var(--teal);"></div></div><span class="prog-pct">${pct}%</span></div></td>
    </tr>`;
  });
}
