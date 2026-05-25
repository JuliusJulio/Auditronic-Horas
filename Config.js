// ========== SUPABASE CONFIG ==========
// IMPORTANTE: Reemplaza estos valores con tus claves de Supabase
const SUPABASE_URL = 'https://lktucbibgebxxhrihazj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrdHVjYmliZ2VieHhocmloYXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNTMzMjQsImV4cCI6MjA4ODkyOTMyNH0.-GPhVPoawI8VM0JF1ZRsL28GwOuRWoV8R9vynDj3qiM';

const SB_LISTO = SUPABASE_URL !== 'https://lktucbibgebxxhrihazj.supabase.co/rest/v1/';

// ========== SUBTAREAS ==========
const SUBTAREAS = {
  'COLABORACIÓN': ['Auditoría externa', 'Interdepartamental', 'Organismos externos'],
  'FORMACIÓN': ['Interna', 'Externa'],
  'SEGUIMIENTO A RECOMENDACIONES': ['--'],
  'COORDINACIÓN Y SUPERVISIÓN': ['Reunión entre auditores', 'Plan Anual de Auditoría', 'Soporte a Accionistas', 'Transición a MIPP'],
  'OTRAS ACTIVIDADES': ['Relacionadas con Auditoría Interna', 'No relacionadas con Auditoría Interna', 'Trabajo administrativo y de archivo', 'OKR Organización o de Equipo', 'Calibración equipos', 'Participación tareas Ganadera'],
  'AUSENCIAS JUSTIFICADAS': ['--'],
  'FESTIVOS Y VACACIONES': ['--']
};

// ========== ESTADO GLOBAL ==========
let db = { auditores: [], encargos: [], registros: [], otros: [] };
let editEncId = null, editAudId = null, editOtroId = null;
let currentTipo = 'encargo';
let currentReporte = 'encargos';
