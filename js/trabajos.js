// ========== ENCARGOS / TRABAJOS ==========
function renderEncargos() {
  llenarSelectPlanes('encargos-filtro-plan', true);
  const search = document.getElementById('encargos-search').value.toLowerCase();
  const filtroEstado = document.getElementById('encargos-filtro-estado').value;
  const filtroTipo = document.getElementById('encargos-filtro-tipo').value;
  const filtroPlan = document.getElementById('encargos-filtro-plan').value;

  // ▸ PUNTO 5: Filtro "Personal a cargo"
  const filtroPersonal = document.getElementById('encargos-filtro-auditor')?.value || '';

  // Actualizar select de auditores para filtro
  updateAuditorSelect('encargos-filtro-auditor');
  if (filtroPersonal) document.getElementById('encargos-filtro-auditor').value = filtroPersonal;

  let encs = db.encargos.filter(e => {
    const match = (e.nombre + e.cliente).toLowerCase().includes(search);
    const estado = filtroEstado ? e.estado === filtroEstado : true;
    const tipo = filtroTipo ? e.tipo === filtroTipo : true;
    const plan = filtroPlan ? e.plan === filtroPlan : true;
    // ▸ PUNTO 5: filtrar por auditor asignado
    const personal = filtroPersonal ? toArray(e.auditores_ids).includes(filtroPersonal) : true;
    return match && estado && tipo && plan && personal;
  });

  const grid = document.getElementById('encargos-grid');
  document.getElementById('encargos-empty').style.display = encs.length ? 'none' : 'block';
  grid.innerHTML = '';

  const tipoBadge = { 'Aseguramiento': 'badge-blue', 'Consultoría': 'badge-purple', 'Auditoría Continua': 'badge-teal' };
  const tipoClass = { 'Aseguramiento': 'tipo-aseguramiento', 'Consultoría': 'tipo-consultoria', 'Auditoría Continua': 'tipo-continua' };
  const planActivo = getPlanActivo();

  encs.forEach(e => {
    const exec = db.registros.filter(r => (r.encargo_id || r.encargoId) === e.id).reduce((s, r) => s + r.horas, 0);
    const pct = e.presupuesto > 0 ? Math.min(100, Math.round(exec / e.presupuesto * 100)) : 0;
    const color = pct >= 90 ? 'var(--red)' : pct >= 70 ? 'var(--amber)' : 'var(--green)';
    const bE = e.estado === 'Activo' ? 'badge-green' : e.estado === 'Finalizado' ? 'badge-muted' : 'badge-amber';
    const tc = tipoClass[e.tipo] || '';
    const tb = tipoBadge[e.tipo] || 'badge-muted';
    const esPlanActivo = e.plan === planActivo;

    grid.innerHTML += `<div class="encargo-card ${tc}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;">
        <div class="encargo-client">${e.cliente}</div>
        <span class="badge ${tb}" style="margin-left:8px;">${e.tipo || '—'}</span>
      </div>
      <div class="encargo-name">${e.nombre}</div>
      ${e.codigo ? `<div style="font-size:11px;color:var(--muted);font-family:var(--mono);margin-bottom:6px;">Código: ${e.codigo}</div>` : ''}
      ${e.plan ? `<div style="margin-bottom:8px;"><span class="plan-badge ${esPlanActivo ? 'activo' : ''}">Plan ${e.plan}${esPlanActivo ? ' ✓' : ''}</span></div>` : ''}
      <div class="encargo-stats">
        <div>
          <div class="encargo-hours-val">${exec.toFixed(1)}h</div>
          <div class="encargo-budget-label">${e.presupuesto > 0 ? 'de ' + e.presupuesto + 'h presupuestadas' : 'Sin presupuesto'}</div>
        </div>
        <span class="badge ${bE}">${e.estado}</span>
      </div>
      ${e.presupuesto > 0 ? `<div class="prog-wrap" style="margin-bottom:8px;"><div class="prog-bar"><div class="prog-fill" style="width:${pct}%;background:${color};"></div></div><span class="prog-pct">${pct}%</span></div>` : ''}
      ${e.inicio || e.fin ? `<div style="font-size:11px;color:var(--muted);margin-bottom:8px;">${e.inicio || ''}${e.fin ? ' → ' + e.fin : ''}</div>` : ''}
      ${toArray(e.auditores_ids).length > 0 ? `
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">
        ${toArray(e.auditores_ids).map(aid => {
          const a = db.auditores.find(x => x.id === aid);
          return a ? `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:99px;font-size:10px;background:rgba(22,163,74,0.08);color:var(--accent);border:1px solid rgba(22,163,74,0.2);">
            <div style="width:14px;height:14px;border-radius:50%;background:#16a34a;display:flex;align-items:center;justify-content:center;font-size:8px;color:#fff;">${(a.iniciales || a.nombre.slice(0, 2)).toUpperCase()}</div>
            ${a.nombre}</span>` : '';
        }).join('')}
      </div>` : ''}
      <div class="encargo-actions">
        ${e.presupuesto > 0 ? `<button class="btn btn-ghost btn-sm" onclick="verDesglose('${e.id}')">▤ Detalle</button>` : ''}
        <button class="btn btn-ghost btn-sm" onclick="editarEncargo('${e.id}')">✎ Editar</button>
        <button class="btn btn-danger btn-sm" onclick="eliminarEncargo('${e.id}')">✕</button>
      </div>
    </div>`;
  });
}

// ========== DESGLOSE FASES (renombrado: Detalle) ==========
function verDesglose(encargoId) {
  const e = db.encargos.find(x => x.id === encargoId);
  if (!e) return;
  const regsEnc = db.registros.filter(r => (r.encargo_id || r.encargoId) === encargoId);
  const fases = ['Planificación', 'Trabajo de campo', 'Informe'];
  const totalExec = regsEnc.reduce((s, r) => s + r.horas, 0);
  // ▸ PUNTO 6: Renombrar "Cotejo" → "Detalle"
  document.getElementById('desglose-titulo').textContent = `Detalle: ${e.nombre}`;
  let html = `<div style="background:var(--bg3);border-radius:10px;padding:14px 16px;margin-bottom:16px;">
    <div style="display:flex;justify-content:space-between;align-items:baseline;">
      <span style="font-size:12px;color:var(--muted);">Presupuesto total</span>
      <span style="font-family:var(--mono);font-weight:600;font-size:18px;">${e.presupuesto}h</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:6px;">
      <span style="font-size:12px;color:var(--muted);">Total ejecutado</span>
      <span style="font-family:var(--mono);font-weight:600;font-size:18px;color:var(--accent);">${totalExec.toFixed(1)}h</span>
    </div>
    <div style="margin-top:10px;">
      <div class="prog-wrap">
        <div class="prog-bar" style="height:8px;">
          <div class="prog-fill" style="width:${Math.min(100, Math.round(totalExec / e.presupuesto * 100))}%;background:${totalExec / e.presupuesto >= 0.9 ? 'var(--red)' : totalExec / e.presupuesto >= 0.7 ? 'var(--amber)' : 'var(--green)'};"></div>
        </div>
        <span class="prog-pct">${Math.min(100, Math.round(totalExec / e.presupuesto * 100))}%</span>
      </div>
    </div>
  </div>
  <div style="font-size:11px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;font-family:var(--mono);margin-bottom:8px;">Desglose por fase</div>`;

  fases.forEach(f => {
    const hFase = regsEnc.filter(r => r.fase === f).reduce((s, r) => s + r.horas, 0);
    const pct = e.presupuesto > 0 ? Math.round(hFase / e.presupuesto * 100) : 0;
    html += `<div class="fase-row">
      <div><div class="fase-name">${f}</div><div class="fase-pct">${pct}% del presupuesto</div></div>
      <div class="fase-val">${hFase.toFixed(1)}h</div>
    </div>`;
  });

  const otrasFase = regsEnc.filter(r => r.fase === 'Revisión' || !fases.includes(r.fase)).reduce((s, r) => s + r.horas, 0);
  if (otrasFase > 0) html += `<div class="fase-row"><div><div class="fase-name">Otras fases</div></div><div class="fase-val">${otrasFase.toFixed(1)}h</div></div>`;
  html += `<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);display:flex;justify-content:space-between;"><span style="font-size:12px;color:var(--muted);">Horas restantes</span><span style="font-family:var(--mono);font-weight:600;color:${Math.max(0, e.presupuesto - totalExec) === 0 ? 'var(--red)' : 'var(--text)'};">${Math.max(0, e.presupuesto - totalExec).toFixed(1)}h</span></div>`;
  document.getElementById('desglose-content').innerHTML = html;
  document.getElementById('modal-desglose').classList.add('open');
}

// ========== MODAL ENCARGO ==========
function abrirModalEncargo(id) {
  editEncId = id || null;
  llenarSelectPlanes('enc-plan');
  // ▸ PUNTO 7: llenar select de sociedades
  llenarSelectSociedades('enc-cliente', true);

  document.getElementById('modal-enc-title').textContent = id ? 'Editar trabajo' : 'Nuevo trabajo de auditoría';
  if (id) {
    const e = db.encargos.find(x => x.id === id) || {};
    document.getElementById('enc-cliente').value = e.cliente || '';
    document.getElementById('enc-codigo').value = e.codigo || '';
    document.getElementById('enc-nombre').value = e.nombre || '';
    document.getElementById('enc-tipo').value = e.tipo || 'Aseguramiento';
    document.getElementById('enc-plan').value = e.plan || getPlanActivo();
    document.getElementById('enc-presupuesto').value = e.presupuesto || '';
    document.getElementById('enc-estado').value = e.estado || 'Activo';
    document.getElementById('enc-inicio').value = e.inicio || '';
    document.getElementById('enc-fin').value = e.fin || '';
    document.getElementById('enc-notas').value = e.notas || '';
    renderAuditoresCheck('enc-auditores-list', toArray(e.auditores_ids));
  } else {
    ['enc-codigo', 'enc-nombre', 'enc-presupuesto', 'enc-inicio', 'enc-fin', 'enc-notas'].forEach(i => document.getElementById(i).value = '');
    document.getElementById('enc-cliente').value = '';
    document.getElementById('enc-estado').value = 'Activo';
    document.getElementById('enc-tipo').value = 'Aseguramiento';
    document.getElementById('enc-plan').value = getPlanActivo();
    renderAuditoresCheck('enc-auditores-list', []);
  }
  document.getElementById('modal-encargo').classList.add('open');
}

function editarEncargo(id) { abrirModalEncargo(id); }

async function guardarEncargo() {
  const cliente = document.getElementById('enc-cliente').value.trim();
  const nombre = document.getElementById('enc-nombre').value.trim();
  if (!cliente || !nombre) { showToast('Sociedad y nombre son obligatorios', '⚠'); return; }

  const codigo = document.getElementById('enc-codigo').value.trim();

  // ▸ PUNTO 8: Control de duplicados en Código
  if (codigo) {
    const duplicado = db.encargos.find(e => e.codigo === codigo && e.id !== editEncId);
    if (duplicado) {
      showToast(`El código "${codigo}" ya existe en: ${duplicado.nombre}`, '⚠');
      return;
    }
  }

  const enc = {
    id: editEncId || uid(),
    cliente, nombre, codigo,
    tipo: document.getElementById('enc-tipo').value,
    plan: document.getElementById('enc-plan').value,
    presupuesto: parseFloat(document.getElementById('enc-presupuesto').value) || 0,
    estado: document.getElementById('enc-estado').value,
    inicio: document.getElementById('enc-inicio').value,
    fin: document.getElementById('enc-fin').value,
    notas: document.getElementById('enc-notas').value,
    auditores_ids: getSelectedAuditores('enc-auditores-list'),
  };

  if (SB_LISTO) {
    if (editEncId) { await SB.update('encargos', editEncId, enc); db.encargos = db.encargos.map(e => e.id === editEncId ? enc : e); }
    else { await SB.insert('encargos', enc); db.encargos.push(enc); }
  } else {
    if (editEncId) db.encargos = db.encargos.map(e => e.id === editEncId ? enc : e);
    else db.encargos.push(enc);
    saveLocal('encargos');
  }
  cerrarModal('modal-encargo');
  renderEncargos();
  showToast(editEncId ? 'Trabajo actualizado' : 'Trabajo creado', '✓');
  editEncId = null;
}

async function eliminarEncargo(id) {
  if (!confirm('¿Eliminar este trabajo?')) return;
  if (SB_LISTO) {
    await SB.delete('encargos', id);
    await Promise.all(db.registros.filter(r => (r.encargo_id || r.encargoId) === id).map(r => SB.delete('registros', r.id)));
  }
  db.encargos = db.encargos.filter(e => e.id !== id);
  db.registros = db.registros.filter(r => (r.encargo_id || r.encargoId) !== id);
  if (!SB_LISTO) { saveLocal('encargos'); saveLocal('registros'); }
  renderEncargos();
  showToast('Trabajo eliminado', '✕');
}
