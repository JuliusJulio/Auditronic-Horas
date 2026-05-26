// ========== EQUIPO ==========
function renderEquipo() {
  const tbody = document.getElementById('equipo-tbody');
  document.getElementById('equipo-empty').style.display = db.auditores.length ? 'none' : 'block';
  tbody.innerHTML = '';
  const mes = new Date().toISOString().slice(0, 7);
  db.auditores.forEach(a => {
    const totalH = db.registros.filter(r => (r.auditor_id || r.auditorId) === a.id).reduce((s, r) => s + r.horas, 0);
    const mesH = db.registros.filter(r => (r.auditor_id || r.auditorId) === a.id && r.fecha && r.fecha.startsWith(mes)).reduce((s, r) => s + r.horas, 0);
    const encIds = [...new Set(db.registros.filter(r => (r.auditor_id || r.auditorId) === a.id && r.tipo === 'encargo').map(r => r.encargo_id || r.encargoId))];
    const activos = encIds.filter(id => db.encargos.find(e => e.id === id && e.estado === 'Activo')).length;
    const rb = a.rol === 'Director de Auditoría' ? 'badge-amber' : a.rol === 'Gerente' ? 'badge-blue' : a.rol === 'Senior' ? 'badge-teal' : 'badge-muted';
    tbody.innerHTML += `<tr>
      <td><div style="display:flex;align-items:center;gap:9px;"><div class="avatar">${(a.iniciales || a.nombre.slice(0, 2)).toUpperCase()}</div><div><div style="font-weight:500;">${a.nombre}</div><div style="font-size:11px;color:var(--muted);">${a.email || ''}</div></div></div></td>
      <td><span class="badge ${rb}">${a.rol}</span></td>
      <td style="font-family:var(--mono);">${mesH.toFixed(1)}h</td>
      <td style="font-family:var(--mono);">${totalH.toFixed(1)}h</td>
      <td style="font-family:var(--mono);">${activos}</td>
      <td style="display:flex;gap:6px;">
        <button class="btn btn-ghost btn-sm" onclick="editarAuditor('${a.id}')">✎</button>
        <button class="btn btn-danger btn-sm" onclick="eliminarAuditor('${a.id}')">✕</button>
      </td>
    </tr>`;
  });
}

function abrirModalAuditor(id) {
  editAudId = id || null;
  document.getElementById('modal-aud-title').textContent = id ? 'Editar auditor' : 'Añadir auditor';
  if (id) {
    const a = db.auditores.find(x => x.id === id) || {};
    document.getElementById('aud-nombre').value = a.nombre || '';
    document.getElementById('aud-iniciales').value = a.iniciales || '';
    document.getElementById('aud-rol').value = a.rol || 'Asistente';
    document.getElementById('aud-email').value = a.email || '';
  } else {
    ['aud-nombre', 'aud-iniciales', 'aud-email'].forEach(i => document.getElementById(i).value = '');
    document.getElementById('aud-rol').value = 'Asistente';
  }
  document.getElementById('modal-auditor').classList.add('open');
}

function editarAuditor(id) { abrirModalAuditor(id); }

async function guardarAuditor() {
  const nombre = document.getElementById('aud-nombre').value.trim();
  if (!nombre) { showToast('El nombre es obligatorio', '⚠'); return; }
  const aud = {
    id: editAudId || uid(),
    nombre,
    iniciales: document.getElementById('aud-iniciales').value.trim() || nombre.slice(0, 2).toUpperCase(),
    rol: document.getElementById('aud-rol').value,
    email: document.getElementById('aud-email').value.trim()
  };
  if (SB_LISTO) {
    if (editAudId) { await SB.update('auditores', editAudId, aud); db.auditores = db.auditores.map(a => a.id === editAudId ? aud : a); }
    else { await SB.insert('auditores', aud); db.auditores.push(aud); }
  } else {
    if (editAudId) db.auditores = db.auditores.map(a => a.id === editAudId ? aud : a);
    else db.auditores.push(aud);
    saveLocal('auditores');
  }
  cerrarModal('modal-auditor');
  renderEquipo();
  updateSidebar();
  showToast(editAudId ? 'Auditor actualizado' : 'Auditor añadido', '✓');
  editAudId = null;
}

async function eliminarAuditor(id) {
  if (!confirm('¿Eliminar este auditor?')) return;
  if (SB_LISTO) await SB.delete('auditores', id);
  db.auditores = db.auditores.filter(a => a.id !== id);
  if (!SB_LISTO) saveLocal('auditores');
  renderEquipo();
  updateSidebar();
  showToast('Auditor eliminado', '✕');
}

function updateSidebar() {
  if (db.auditores.length > 0) {
    const a = db.auditores[0];
    document.getElementById('sidebar-avatar').textContent = (a.iniciales || a.nombre.slice(0, 2)).toUpperCase();
    document.getElementById('sidebar-name').textContent = a.nombre;
    document.getElementById('sidebar-role').textContent = a.rol;
  }
}
