// ========== CATÁLOGO DE SOCIEDADES ==========
function renderSociedades() {
  const tbody = document.getElementById('sociedades-tbody');
  const empty = document.getElementById('sociedades-empty');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (!db.sociedades.length) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  const sorted = [...db.sociedades].sort((a, b) => a.numero.localeCompare(b.numero));
  sorted.forEach(s => {
    tbody.innerHTML += `<tr>
      <td style="font-family:var(--mono);font-weight:500;color:var(--accent);">${s.numero}</td>
      <td style="font-weight:500;">${s.nombre}</td>
      <td style="display:flex;gap:6px;">
        <button class="btn btn-ghost btn-sm" onclick="editarSociedad('${s.id}')">✎</button>
        <button class="btn btn-danger btn-sm" onclick="eliminarSociedad('${s.id}')">✕</button>
      </td>
    </tr>`;
  });
}

function abrirModalSociedad(id) {
  editSocId = id || null;
  document.getElementById('modal-soc-title').textContent = id ? 'Editar sociedad' : 'Nueva sociedad';
  if (id) {
    const s = db.sociedades.find(x => x.id === id) || {};
    document.getElementById('soc-numero').value = s.numero || '';
    document.getElementById('soc-nombre').value = s.nombre || '';
  } else {
    document.getElementById('soc-numero').value = '';
    document.getElementById('soc-nombre').value = '';
  }
  document.getElementById('modal-sociedad').classList.add('open');
}

function editarSociedad(id) { abrirModalSociedad(id); }

async function guardarSociedad() {
  const numero = document.getElementById('soc-numero').value.trim();
  const nombre = document.getElementById('soc-nombre').value.trim();
  if (!numero || !nombre) { showToast('Número y nombre son obligatorios', '⚠'); return; }
  if (!/^\d{4}$/.test(numero)) { showToast('El número debe ser de 4 dígitos (ej: 0038)', '⚠'); return; }

  // Verificar duplicados
  const dup = db.sociedades.find(s => s.numero === numero && s.id !== editSocId);
  if (dup) { showToast(`El número ${numero} ya existe: ${dup.nombre}`, '⚠'); return; }

  const soc = { id: editSocId || uid(), numero, nombre };

  if (SB_LISTO) {
    if (editSocId) {
      await SB.update('sociedades', editSocId, soc);
      db.sociedades = db.sociedades.map(s => s.id === editSocId ? soc : s);
    } else {
      await SB.insert('sociedades', soc);
      db.sociedades.push(soc);
    }
  } else {
    if (editSocId) db.sociedades = db.sociedades.map(s => s.id === editSocId ? soc : s);
    else db.sociedades.push(soc);
    saveLocal('sociedades');
  }
  cerrarModal('modal-sociedad');
  renderSociedades();
  showToast(editSocId ? 'Sociedad actualizada' : 'Sociedad creada', '✓');
  editSocId = null;
}

async function eliminarSociedad(id) {
  if (!confirm('¿Eliminar esta sociedad del catálogo?')) return;
  if (SB_LISTO) await SB.delete('sociedades', id);
  db.sociedades = db.sociedades.filter(s => s.id !== id);
  if (!SB_LISTO) saveLocal('sociedades');
  renderSociedades();
  showToast('Sociedad eliminada', '✕');
}
