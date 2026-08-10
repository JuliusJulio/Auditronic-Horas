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

function initRegistro() {
  const fi = document.getElementById('reg-fecha');
  if (!fi.value) fi.value = new Date().toISOString().split('T')[0];
  updateAuditorSelect('reg-auditor');
  updateEncargoSelect();
  updateOtroSelect();
}

// ========== GUARDAR REGISTRO ==========
async function guardarRegistro() {
  const fecha = document.getElementById('reg-fecha').value;
  const auditorId = document.getElementById('reg-auditor').value;
  const horas = parseFloat(document.getElementById('reg-horas').value);
  const notas = document.getElementById('reg-notas').value.trim();
  const inicio = document.getElementById('reg-inicio').value;

  if (!fecha || !auditorId || !horas || horas <= 0) { showToast('Completa los campos obligatorios', '⚠'); return; }
  if (horas > 10) { showToast('El máximo es 10 horas por registro', '⚠'); return; }

  // ▸ PUNTO 9: Tope diario de 8.5h (todos los tipos)
  const horasDelDia = db.registros
    .filter(r => r.fecha === fecha && (r.auditor_id || r.auditorId) === auditorId)
    .reduce((s, r) => s + r.horas, 0);
  if (horasDelDia + horas > 8.5) {
    const disponible = Math.max(0, 8.5 - horasDelDia).toFixed(2);
    showToast(`Tope diario 8.5h — ya tiene ${horasDelDia.toFixed(1)}h, quedan ${disponible}h`, '⚠');
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

// ========== HORAS (MIS REGISTROS) ==========
// Guarda los registros filtrados para el CSV
let _filteredRegs = [];

// ▸ Paginación "Ver más"
const HORAS_PAGE_SIZE = 50;
let _horasVisibleCount = HORAS_PAGE_SIZE;

// Se llama desde los filtros/búsqueda: reinicia el contador a la primera tanda
function renderHorasReset() {
  _horasVisibleCount = HORAS_PAGE_SIZE;
  renderHoras();
}

// Se llama desde el botón "Ver más": muestra la siguiente tanda
function verMasHoras() {
  _horasVisibleCount += HORAS_PAGE_SIZE;
  renderHoras();
}

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

  // ▸ Guardar filtrados para CSV (PUNTO 1)
  _filteredRegs = regs;

  const tbody = document.getElementById('horas-tbody');
  const tfoot = document.getElementById('horas-tfoot');
  document.getElementById('horas-empty').style.display = regs.length ? 'none' : 'block';
  document.getElementById('horas-count').textContent = regs.length + ' registros';
  tbody.innerHTML = '';

  // ▸ Total de horas: suma TODOS los registros filtrados (no solo los visibles)
  const totalHoras = regs.reduce((s, r) => s + r.horas, 0);

  // ▸ Paginación: pintar solo hasta el límite actual
  const visibles = regs.slice(0, _horasVisibleCount);

  visibles.forEach(r => {
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
    // ▸ Iniciales del día de la semana
    const [_y, _m, _d] = r.fecha.split('-').map(Number);
    const diasSem = ['D', 'L', 'M', 'Mi', 'J', 'V', 'S'];
    const diaIni = diasSem[new Date(_y, _m - 1, _d).getDay()];
    // ▸ PUNTO 4: Notas completas (sin truncar, word-wrap)
    tbody.innerHTML += `<tr>
      <td style="font-family:var(--mono);font-size:12px;white-space:nowrap;">${r.fecha}</td>
      <td style="font-family:var(--mono);font-size:12px;font-weight:600;color:var(--muted);">${diaIni}</td>
      <td><div style="display:flex;align-items:center;gap:7px;"><div class="avatar" style="width:26px;height:26px;font-size:10px;">${aud.nombre.slice(0, 2).toUpperCase()}</div><span>${aud.nombre}</span></div></td>
      <td>${tipoHtml}</td><td>${tareaHtml}</td><td>${subHtml}</td>
      <td style="font-family:var(--mono);font-weight:600;color:var(--accent);">${r.horas.toFixed(1)}h</td>
      <td style="max-width:200px;font-size:12px;color:var(--muted);white-space:normal;word-break:break-word;">${r.notas || '—'}</td>
      <td><div style="display:flex;gap:4px;"><button class="btn btn-ghost btn-sm" onclick="editarRegistro('${r.id}')" title="Editar">✎</button><button class="btn btn-danger btn-sm" onclick="eliminarRegistro('${r.id}')" title="Eliminar">✕</button></div></td>
    </tr>`;
  });

  // ▸ PUNTO 3: Fila de total
  if (tfoot) {
    tfoot.innerHTML = regs.length
      ? `<tr><td colspan="6" style="text-align:right;font-family:var(--mono);font-size:12px;">Total:</td><td style="font-family:var(--mono);font-weight:700;color:var(--accent);font-size:14px;">${totalHoras.toFixed(1)}h</td><td colspan="2"></td></tr>`
      : '';
  }

  // ▸ Botón "Ver más" (paginación)
  const verMasBox = document.getElementById('horas-vermas');
  if (verMasBox) {
    if (regs.length > _horasVisibleCount) {
      const restantes = regs.length - _horasVisibleCount;
      const siguiente = Math.min(HORAS_PAGE_SIZE, restantes);
      verMasBox.innerHTML = `<button class="btn btn-ghost" onclick="verMasHoras()">Ver ${siguiente} más · quedan ${restantes}</button>`;
      verMasBox.style.display = 'flex';
    } else {
      verMasBox.innerHTML = '';
      verMasBox.style.display = 'none';
    }
  }
}

async function eliminarRegistro(id) {
  if (!confirm('¿Eliminar este registro?')) return;
  if (SB_LISTO) await SB.delete('registros', id);
  db.registros = db.registros.filter(r => r.id !== id);
  if (!SB_LISTO) saveLocal('registros');
  renderHoras();
  showToast('Registro eliminado', '✕');
}

// ========== EXPORT CSV (PUNTO 1: solo registros filtrados) ==========
function exportarCSV() {
  // Determinar qué registros exportar según la vista activa
  let regsToExport;
  if (document.getElementById('view-horas').classList.contains('active')) {
    regsToExport = _filteredRegs;
  } else if (document.getElementById('view-reportes').classList.contains('active')) {
    regsToExport = filtrarRegsPorRango();
  } else {
    regsToExport = db.registros;
  }

  const headers = ['ID', 'Fecha', 'Auditor', 'Tipo', 'Sociedad', 'Trabajo', 'Plan', 'Código', 'Tarea', 'Sub-tarea', 'Fase', 'Horas', 'Notas'];
  const rows = regsToExport.map(r => {
    const aud = (db.auditores.find(a => a.id === (r.auditor_id || r.auditorId)) || { nombre: '' }).nombre;
    const enc = r.tipo === 'encargo' ? (db.encargos.find(e => e.id === (r.encargo_id || r.encargoId)) || { nombre: '', cliente: '', codigo: '', plan: '' }) : null;
    const otro = r.tipo === 'otro' ? (db.otros.find(o => o.id === r.otro_id) || { nombre: '' }) : null;
    return [r.id, r.fecha, aud, r.tipo, enc ? enc.cliente : '', enc ? enc.nombre : otro ? otro.nombre : '', enc ? enc.plan || '' : '', enc ? enc.codigo || '' : '', r.tarea || '', r.subtarea || '', r.fase || '', r.horas, (r.notas || '').replace(/"/g, '""')].map(v => `"${v}"`).join(',');
  });
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'auditronic_' + new Date().toISOString().slice(0, 10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast(`CSV exportado (${regsToExport.length} registros)`, '↓');
}

// ========== EDITAR REGISTRO ==========
let editRegId = null;

function editarRegistro(id) {
  const r = db.registros.find(x => x.id === id);
  if (!r) return;
  editRegId = id;

  const aud = db.auditores.find(a => a.id === (r.auditor_id || r.auditorId));
  document.getElementById('edit-reg-auditor-nombre').value = aud ? aud.nombre : '(desconocido)';
  document.getElementById('edit-reg-fecha').value = r.fecha;
  document.getElementById('edit-reg-horas').value = r.horas;
  document.getElementById('edit-reg-inicio').value = r.inicio || '';
  document.getElementById('edit-reg-notas').value = r.notas || '';

  // Badge de tipo (solo lectura)
  const tipoLabel = r.tipo === 'encargo' ? 'Trabajo de auditoría' : r.tipo === 'otro' ? 'Otro trabajo' : 'Tarea general';
  const tipoBadgeClass = r.tipo === 'encargo' ? 'badge-green' : r.tipo === 'otro' ? 'badge-orange' : 'badge-teal';
  document.getElementById('edit-reg-tipo-badge').innerHTML =
    `<span class="badge ${tipoBadgeClass}">${tipoLabel}</span>
     <span style="font-size:11px;color:var(--muted);margin-left:8px;">El tipo no se puede cambiar. Si te equivocaste, elimina y crea uno nuevo.</span>`;

  // Mostrar/ocultar bloques según tipo
  document.getElementById('edit-campos-encargo').style.display = r.tipo === 'encargo' ? '' : 'none';
  document.getElementById('edit-campos-otro').style.display = r.tipo === 'otro' ? '' : 'none';
  document.getElementById('edit-campos-tarea').style.display = r.tipo === 'tarea' ? '' : 'none';

  if (r.tipo === 'encargo') {
    // Trabajos Activo/Borrador + el actual aunque no lo esté (para no perderlo)
    const sel = document.getElementById('edit-reg-encargo');
    sel.innerHTML = '<option value="">— seleccionar —</option>';
    const encActual = r.encargo_id || r.encargoId;
    const disponibles = db.encargos.filter(e => e.estado === 'Activo' || e.estado === 'Borrador' || e.id === encActual);
    disponibles.forEach(e => {
      const o = document.createElement('option');
      o.value = e.id;
      o.textContent = e.cliente + ' — ' + e.nombre;
      sel.appendChild(o);
    });
    sel.value = encActual || '';
    document.getElementById('edit-reg-fase').value = r.fase || 'Planificación';
  } else if (r.tipo === 'otro') {
    const sel = document.getElementById('edit-reg-otro');
    sel.innerHTML = '<option value="">— seleccionar —</option>';
    const disponibles = db.otros.filter(o => o.estado === 'Activo' || o.estado === 'Borrador' || o.id === r.otro_id);
    disponibles.forEach(o => {
      const op = document.createElement('option');
      op.value = o.id;
      op.textContent = o.nombre;
      sel.appendChild(op);
    });
    sel.value = r.otro_id || '';
  } else {
    document.getElementById('edit-reg-tarea').value = r.tarea || '';
    updateSubtareasEdit();
    document.getElementById('edit-reg-subtarea').value = r.subtarea || '--';
  }

  document.getElementById('modal-editar-registro').classList.add('open');
}

function updateSubtareasEdit() {
  const tarea = document.getElementById('edit-reg-tarea').value;
  const sel = document.getElementById('edit-reg-subtarea');
  sel.innerHTML = '';
  (SUBTAREAS[tarea] || ['--']).forEach(s => {
    const o = document.createElement('option');
    o.value = s;
    o.textContent = s;
    sel.appendChild(o);
  });
}

async function guardarEdicionRegistro() {
  const original = db.registros.find(r => r.id === editRegId);
  if (!original) return;

  const fecha = document.getElementById('edit-reg-fecha').value;
  const horas = parseFloat(document.getElementById('edit-reg-horas').value);
  const notas = document.getElementById('edit-reg-notas').value.trim();
  const inicio = document.getElementById('edit-reg-inicio').value;

  if (!fecha || !horas || horas <= 0) { showToast('Completa los campos obligatorios', '⚠'); return; }
  if (horas > 10) { showToast('El máximo es 10 horas por registro', '⚠'); return; }

  // Tope diario 8.5h — EXCLUYENDO el registro que se está editando
  const auditorId = original.auditor_id || original.auditorId;
  const horasDelDia = db.registros
    .filter(r => r.fecha === fecha && (r.auditor_id || r.auditorId) === auditorId && r.id !== editRegId)
    .reduce((s, r) => s + r.horas, 0);
  if (horasDelDia + horas > 8.5) {
    const disponible = Math.max(0, 8.5 - horasDelDia).toFixed(2);
    showToast(`Tope diario 8.5h — quedan ${disponible}h disponibles`, '⚠');
    return;
  }

  // Payload solo con campos editables (para PATCH parcial)
  const patch = { fecha, horas, notas, inicio };

  if (original.tipo === 'encargo') {
    const encId = document.getElementById('edit-reg-encargo').value;
    if (!encId) { showToast('Selecciona un trabajo', '⚠'); return; }
    patch.encargo_id = encId;
    patch.fase = document.getElementById('edit-reg-fase').value;
  } else if (original.tipo === 'otro') {
    const otroId = document.getElementById('edit-reg-otro').value;
    if (!otroId) { showToast('Selecciona un trabajo', '⚠'); return; }
    patch.otro_id = otroId;
  } else {
    const tarea = document.getElementById('edit-reg-tarea').value;
    if (!tarea) { showToast('Selecciona una tarea', '⚠'); return; }
    patch.tarea = tarea;
    patch.subtarea = document.getElementById('edit-reg-subtarea').value;
  }

  if (SB_LISTO) {
    const saved = await SB.update('registros', editRegId, patch);
    if (!saved) { showToast('Error al guardar', '⚠'); return; }
  }

  // Actualizar en memoria
  db.registros = db.registros.map(r => r.id === editRegId ? { ...r, ...patch } : r);
  if (!SB_LISTO) saveLocal('registros');

  cerrarModal('modal-editar-registro');
  renderHoras();
  showToast('Registro actualizado', '✓');
  editRegId = null;
}
