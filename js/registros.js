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

  // ▸ PUNTO 3: Sumar horas filtradas
  let totalHoras = 0;

  regs.forEach(r => {
    totalHoras += r.horas;
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
    // ▸ PUNTO 4: Notas completas (sin truncar, word-wrap)
    tbody.innerHTML += `<tr>
      <td style="font-family:var(--mono);font-size:12px;white-space:nowrap;">${r.fecha}</td>
      <td><div style="display:flex;align-items:center;gap:7px;"><div class="avatar" style="width:26px;height:26px;font-size:10px;">${aud.nombre.slice(0, 2).toUpperCase()}</div><span>${aud.nombre}</span></div></td>
      <td>${tipoHtml}</td><td>${tareaHtml}</td><td>${subHtml}</td>
      <td style="font-family:var(--mono);font-weight:600;color:var(--accent);">${r.horas.toFixed(1)}h</td>
      <td style="max-width:200px;font-size:12px;color:var(--muted);white-space:normal;word-break:break-word;">${r.notas || '—'}</td>
      <td><button class="btn btn-danger btn-sm" onclick="eliminarRegistro('${r.id}')">✕</button></td>
    </tr>`;
  });

  // ▸ PUNTO 3: Fila de total
  if (tfoot) {
    tfoot.innerHTML = regs.length
      ? `<tr><td colspan="5" style="text-align:right;font-family:var(--mono);font-size:12px;">Total:</td><td style="font-family:var(--mono);font-weight:700;color:var(--accent);font-size:14px;">${totalHoras.toFixed(1)}h</td><td colspan="2"></td></tr>`
      : '';
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
