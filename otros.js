// ========== OTROS TRABAJOS ==========

function renderOtros() {
  const grid = document.getElementById('otros-grid');
  document.getElementById('otros-empty').style.display = db.otros.length ? 'none' : 'block';
  grid.innerHTML = '';
  db.otros.forEach(o => {
    const exec = db.registros.filter(r => r.otro_id === o.id).reduce((s, r) => s + r.horas, 0);
    const pct = o.presupuesto > 0 ? Math.min(100, Math.round(exec / o.presupuesto * 100)) : 0;
    const color = pct >= 90 ? 'var(--red)' : pct >= 70 ? 'var(--amber)' : 'var(--green)';
    grid.innerHTML += `<div class="encargo-card tipo-otro">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;">
        <div class="encargo-client">${o.sociedad || ''}</div>
        <span class="badge badge-orange">Otro trabajo</span>
      </div>
      <div class="encargo-name">${o.nombre}</div>
      ${o.codigo ? `<div style="font-size:11px;color:var(--muted);font-family:var(--mono);margin-bottom:6px;">Código: ${o.codigo}</div>` : ''}
      ${o.descripcion ? `<div style="font-size:12px;color:var(--muted);margin-bottom:10px;line-height:1.4;">${o.descripcion}</div>` : ''}
      <div class="encargo-stats">
        <div>
          <div class="encargo-hours-val">${exec.toFixed(1)}h</div>
          <div class="encargo-budget-label">${o.presupuesto > 0 ? 'de ' + o.presupuesto + 'h presupuestadas' : 'Sin presupuesto'}</div>
        </div>
      </div>
      ${o.presupuesto > 0 ? `<div class="prog-wrap" style="margin-bottom:8px;"><div class="prog-bar"><div class="prog-fill" style="width:${pct}%;background:${color};"></div></div><span class="prog-pct">${pct}%</span></div>` : ''}
      ${toArray(o.auditores_ids).length > 0 ? `
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">
        ${toArray(o.auditores_ids).map(aid => {
          const a = db.auditores.find(x => x.id === aid);
          return a ? `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:99px;font-size:10px;background:rgba(22,163,74,0.08);color:var(--accent);border:1px solid rgba(22,163,74,0.2);">
            <div style="width:14px;height:14px;border-radius:50%;background:#16a34a;display:flex;align-items:center;justify-content:center;font-size:8px;color:#fff;">${(a.iniciales || a.nombre.slice(0, 2)).toUpperCase()}</div>
            ${a.nombre}</span>` : '';
        }).join('')}
      </div>` : ''}
      <div class="encargo-actions">
        <button class="btn btn-ghost btn-sm" onclick="editarOtro('${o.id}')">✎ Editar</button>
        <button class="btn btn-danger btn-sm" onclick="eliminarOtro('${o.id}')">✕</button>
      </div>
    </div>`;
  });
}

function abrirModalOtro(id) {
  editOtroId = id || null;
  document.getElementById('modal-otro-title').textContent = id ? 'Editar trabajo' : 'Nuevo otro trabajo';
  if (id) {
    const o = db.otros.find(x => x.id === id) || {};
    document.getElementById('otro-nombre').value = o.nombre || '';
    document.getElementById('otro-sociedad').value = o.sociedad || '';
    document.getElementById('otro-codigo').value = o.codigo || '';
    document.getElementById('otro-desc').value = o.descripcion || '';
    document.getElementById('otro-presupuesto').value = o.presupuesto || '';
    renderAuditoresCheck('otro-auditores-list', toArray(o.auditores_ids));
  } else {
    ['otro-nombre', 'otro-sociedad', 'otro-codigo', 'otro-desc', 'otro-presupuesto'].forEach(i => document.getElementById(i).value = '');
    renderAuditoresCheck('otro-auditores-list', []);
  }
  document.getElementById('modal-otro').classList.add('open');
}

function editarOtro(id) { abrirModalOtro(id); }

async function guardarOtro() {
  const nombre = document.getElementById('otro-nombre').value.trim();
  if (!nombre) { showToast('El nombre es obligatorio', '⚠'); return; }

  const o = {
    id: editOtroId || uid(),
    nombre,
    sociedad: document.getElementById('otro-sociedad').value.trim(),
    codigo: document.getElementById('otro-codigo').value.trim(),
    descripcion: document.getElementById('otro-desc').value.trim(),
    presupuesto: parseFloat(document.getElementById('otro-presupuesto').value) || 0,
    auditores_ids: getSelectedAuditores('otro-auditores-list'),
  };

  if (SB_LISTO) {
    if (editOtroId) {
      await SB.update('otros_trabajos', editOtroId, o);
      db.otros = db.otros.map(x => x.id === editOtroId ? o : x);
    } else {
      await SB.insert('otros_trabajos', o);
      db.otros.push(o);
    }
  } else {
    if (editOtroId) db.otros = db.otros.map(x => x.id === editOtroId ? o : x);
    else db.otros.push(o);
    saveLocal('otros');
  }
  cerrarModal('modal-otro');
  renderOtros();
  showToast(editOtroId ? 'Actualizado' : 'Trabajo creado', '✓');
  editOtroId = null;
}

async function eliminarOtro(id) {
  if (!confirm('¿Eliminar este trabajo?')) return;
  if (SB_LISTO) await SB.delete('otros_trabajos', id);
  db.otros = db.otros.filter(o => o.id !== id);
  if (!SB_LISTO) saveLocal('otros');
  renderOtros();
  showToast('Eliminado', '✕');
}
