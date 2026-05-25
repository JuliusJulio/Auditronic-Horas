// ========== VALIDACIONES ==========
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

// ========== TIPO SELECTOR ==========
function selectTipo(tipo) {
  currentTipo = tipo;
  ['encargo', 'otro', 'tarea'].forEach(t => {
    document.getElementById('tipo-' + t + '-card').classList.toggle('selected', t === tipo);
    document.getElementById('campos-' + t).style.display = t === tipo ? '' : 'none';
  });
}

function updateSubtareas() {
  const tarea = document.getElementById('reg-tarea').value;
  const sel = document.getElementById('reg-subtarea');
  sel.innerHTML = '';
  (SUBTAREAS[tarea] || ['--']).forEach(s => {
    const o = document.createElement('option');
    o.value = s;
    o.textContent = s;
    sel.appendChild(o);
  });
}

// ========== INIT REGISTRO ==========
function initRegistro() {
  const fi = document.getElementById('reg-fecha');
  if (!fi.value) fi.value = new Date().toISOString().split('T')[0];
  updateAuditorSelect('reg-auditor');
  updateEncargoSelect();
  updateOtroSelect();
}

function updateAuditorSelect(id) {
  const sel = document.getElementById(id);
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '<option value="">— seleccionar —</option>';
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

// ========== GUARDAR REGISTRO ==========
async function guardarRegistro() {
  const fecha = document.getElementById('reg-fecha').value;
  const auditorId = document.getElementById('reg-auditor').value;
  const horas = parseFloat(document.getElementById('reg-horas').value);
  const notas = document.getElementById('reg-notas').value.trim();
  const inicio = document.getElementById('reg-inicio').value;

  if (!fecha || !auditorId || !horas || horas <= 0) {
    showToast('Completa los campos obligatorios', '⚠');
    return;
  }
  if (horas > 10) {
    showToast('El máximo es 10 horas por registro', '⚠');
    return;
  }

  const reg = { id: uid(), fecha, auditor_id: auditorId, tipo: currentTipo, horas, notas, inicio };

  if (currentTipo === 'encargo') {
    const encargoId = document.getElementById('reg-encargo').value;
    if (!encargoId) { showToast('Selecciona un trabajo', '⚠'); return; }
    reg.encargo_id = encargoId;
    reg.fase = document.getElementById('reg-fase').value;
  } else if (currentTipo === 'otro') {
    const otroId = document.getElementById('reg-otro').value;
    if (!otroId) { showToast('Selecciona un trabajo', '⚠'); return; }
    reg.otro_id = otroId;
  } else {
    const tarea = document.getElementById('reg-tarea').value;
    if (!tarea) { showToast('Selecciona una tarea', '⚠'); return; }
    reg.tarea = tarea;
    reg.subtarea = document.getElementById('reg-subtarea').value;
  }

  if (SB_LISTO) {
    const saved = await SB.insert('registros', reg);
    if (!saved) { showToast('Error al guardar', '⚠'); return; }
    db.registros.unshift(reg);
  } else {
    db.registros.unshift(reg);
    saveLocal('registros');
  }
  limpiarFormRegistro();
  showToast('Registro guardado', '✓');
}

function limpiarFormRegistro() {
  document.getElementById('reg-horas').value = '';
  document.getElementById('reg-notas').value = '';
  document.getElementById('reg-inicio').value = '';
  document.getElementById('reg-tarea').value = '';
  document.getElementById('reg-encargo').value = '';
  document.getElementById('reg-otro').value = '';
  document.getElementById('reg-subtarea').innerHTML = '<option value="--">—</option>';
  document.getElementById('notas-counter').textContent = '0/140';
  document.getElementById('reg-horas-error').style.display = 'none';
  document.getElementById('reg-horas').classList.remove('error');
}

// ========== MIS REGISTROS (HORAS) ==========
function renderHoras() {
  const search = document.getElementById('horas-search').value.toLowerCase();
  const filtroTipo = document.getElementById('horas-filtro-tipo').value;
  const filtroAud = document.getElementById('horas-filtro-auditor').value;
  const filtroPlan = document.getElementById('horas-filtro-plan').value;
  const fechaIni = document.getElementById('horas-fecha-ini').value;
  const fechaFin = document.getElementById('horas-fecha-fin').value;

  updateAuditorSelect('horas-filtro-auditor');
  if (filtroAud) document.getElementById('horas-filtro-auditor').value = filtroAud;
  llenarSelectPlanes('horas-filtro-plan', true);
  if (filtroPlan) document.getElementById('horas-filtro-plan').value = filtroPlan;

  let regs = [...db.registros].sort((a, b) => b.fecha.localeCompare(a.fecha));
  if (filtroTipo) regs = regs.filter(r => r.tipo === filtroTipo);
  if (filtroAud) regs = regs.filter(r => (r.auditor_id || r.auditorId) === filtroAud);
  if (fechaIni) regs = regs.filter(r => r.fecha >= fechaIni);
  if (fechaFin) regs = regs.filter(r => r.fecha <= fechaFin);
  if (filtroPlan) regs = regs.filter(r => {
    const enc = db.encargos.find(e => e.id === (r.encargo_id || r.encargoId));
    return enc && enc.plan === filtroPlan;
  });
  if (search) regs = regs.filter(r => {
    const aud = (db.auditores.find(a => a.id === (r.auditor_id || r.auditorId)) || { nombre: '' }).nombre.toLowerCase();
    const enc = (db.encargos.find(e => e.id === (r.encargo_id || r.encargoId)) || { nombre: '' }).nombre.toLowerCase();
    return aud.includes(search) || enc.includes(search) || (r.tarea || '').toLowerCase().includes(search) || (r.notas || '').toLowerCase().includes(search);
  });

  const tbody = document.getElementById('horas-tbody');
  document.getElementById('horas-empty').style.display = regs.length ? 'none' : 'block';
  document.getElementById('horas-count').textContent = regs.length + ' registros';
  tbody.innerHTML = '';
  regs.forEach(r => {
    const aud = db.auditores.find(a => a.id === (r.auditor_id || r.auditorId)) || { nombre: '?' };
    let tipoHtml = '', tareaHtml = '', subHtml = '';
    if (r.tipo === 'encargo') {
      tipoHtml = '<span class="badge badge-green">Trabajo</span>';
      const enc = db.encargos.find(e => e.id === (r.encargo_id || r.encargoId)) || { nombre: '?', cliente: '' };
      tareaHtml = `<span style="font-weight:500;">${enc.nombre}</span><br><span style="font-size:11px;color:var(--muted);">${enc.cliente}</span>`;
      subHtml = `<span class="badge badge-muted">${r.fase || '—'}</span>`;
    } else if (r.tipo === 'otro') {
      tipoHtml = '<span class="badge badge-orange">Otro trabajo</span>';
      const otro = db.otros.find(o => o.id === r.otro_id) || { nombre: '?' };
      tareaHtml = `<span style="font-weight:500;">${otro.nombre}</span>`;
      subHtml = '—';
    } else {
      tipoHtml = '<span class="badge badge-teal">Tarea</span>';
      tareaHtml = `<span style="font-weight:500;">${r.tarea || '?'}</span>`;
      subHtml = `<span style="font-size:12px;color:var(--muted);">${(!r.subtarea || r.subtarea === '--') ? '—' : r.subtarea}</span>`;
    }
    tbody.innerHTML += `<tr>
      <td style="font-family:var(--mono);font-size:12px;white-space:nowrap;">${r.fecha}</td>
      <td><div style="display:flex;align-items:center;gap:7px;"><div class="avatar" style="width:26px;height:26px;font-size:10px;">${aud.nombre.slice(0,2).toUpperCase()}</div><span>${aud.nombre}</span></div></td>
      <td>${tipoHtml}</td><td>${tareaHtml}</td><td>${subHtml}</td>
      <td style="font-family:var(--mono);font-weight:600;color:var(--accent);">${r.horas.toFixed(1)}h</td>
      <td style="max-width:150px;font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.notas || '—'}</td>
      <td><button class="btn btn-danger btn-sm" onclick="eliminarRegistro('${r.id}')">✕</button></td>
    </tr>`;
  });
}

async function eliminarRegistro(id) {
  if (!confirm('¿Eliminar este registro?')) return;
  if (SB_LISTO) await SB.delete('registros', id);
  db.registros = db.registros.filter(r => r.id !== id);
  if (!SB_LISTO) saveLocal('registros');
  renderHoras();
  showToast('Registro eliminado', '✕');
}
