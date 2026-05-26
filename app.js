// ========== NAVIGATION ==========
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.getAttribute('onclick') && n.getAttribute('onclick').includes("'" + name + "'")) n.classList.add('active');
  });
  if (name === 'dashboard') renderDashboard();
  if (name === 'horas') renderHoras();
  if (name === 'encargos') renderEncargos();
  if (name === 'otros') renderOtros();
  if (name === 'equipo') renderEquipo();
  if (name === 'reportes') renderReporteActual();
  if (name === 'registro') initRegistro();
  if (name === 'sociedades') renderSociedades();
}

// ========== INIT ==========
async function init() {
  const now = new Date();
  document.getElementById('reg-fecha').value = now.toISOString().split('T')[0];
  await cargarDatos();
  updateAuditorSelect('horas-filtro-auditor');
  llenarSelectPlanes('horas-filtro-plan', true);
  llenarSelectPlanes('rep-plan-filtro', true);
  llenarSelectPlanes('encargos-filtro-plan', true);
  updateAuditorSelect('encargos-filtro-auditor');
  updateAuditorSelect('rep-filtro-auditor');
  initModalOverlays();
  updateSidebar();
  renderDashboard();
  if (!SB_LISTO) showToast('Modo local — configura Supabase para compartir datos', '⚠');
}
init();
