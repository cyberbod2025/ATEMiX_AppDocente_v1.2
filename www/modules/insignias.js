import { Storage, K, withSync } from '../services/storage.js';

const KEY_TEMPLATES = 'atemix.insignias.templates';
const KEY_LAST_GROUP = 'atemix.insignias.lastGroup';

const DEFAULT_TEMPLATES = [
  { nombre: 'Esfuerzo destacado', puntos: 5, tipo: 'esfuerzo', descripcion: 'Reconoce el compromiso constante.' },
  { nombre: 'Participacion activa', puntos: 3, tipo: 'participacion', descripcion: 'Premia intervenciones en clase.' },
  { nombre: 'Trabajo en equipo', puntos: 4, tipo: 'colaboracion', descripcion: 'Fomenta la colaboracion efectiva.' },
  { nombre: 'Puntualidad ejemplar', puntos: 2, tipo: 'puntualidad', descripcion: 'Refuerza asistencia y puntualidad.' },
  { nombre: 'Apoyo a la comunidad', puntos: 6, tipo: 'comunidad', descripcion: 'Reconoce acciones solidarias.' },
];
const DEFAULT_DESIGN = { shape: 'medalla', fill: '#0ea5a5', accent: '#1e293b', icon: '⭐' };


const state = {
  group: 'GENERAL',
  insignias: [],
  alumnos: [],
  userTemplates: [],
  templates: [],
  filters: { alumno: '', tipo: '' },
  lastAssigned: [],
  designer: { ...DEFAULT_DESIGN },
};

let wired = false;
const designerInputs = { shape: '#bz-forma', fill: '#bz-color', accent: '#bz-acento', icon: '#bz-icon' };

function cloneDesign(design) {
  return { ...DEFAULT_DESIGN, ...(design || {}) };
}

export function generateBadgeSVG(design = DEFAULT_DESIGN) {
  const cfg = cloneDesign(design);
  const fill = cfg.fill || DEFAULT_DESIGN.fill;
  const accent = cfg.accent || DEFAULT_DESIGN.accent;
  const icon = (cfg.icon || DEFAULT_DESIGN.icon || '⭐').slice(0, 2) || '⭐';
  const shapes = {
    medalla: `<circle cx="60" cy="60" r="52" fill="${fill}"/><circle cx="60" cy="60" r="38" fill="${accent}"/>`,
    escudo: `<path fill="${fill}" d="M18 24h84v50c0 18-22 36-42 40-20-4-42-22-42-40z"/><path fill="${accent}" d="M30 34h60v32c0 10-15 23-30 26-15-3-30-16-30-26z"/>`,
    estrella: `<polygon fill="${fill}" points="60,16 72,44 102,44 78,62 86,92 60,74 34,92 42,62 18,44 48,44"/><polygon fill="${accent}" points="60,26 69,44 88,44 74,56 80,80 60,68 40,80 46,56 32,44 51,44"/>`,
    banderin: `<path fill="${fill}" d="M22 20h76v54l-38-14-38 14z"/><path fill="${accent}" d="M32 28h56v34l-28-10-28 10z"/>`,
  };
  const base = shapes[cfg.shape] || shapes.medalla;
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">${base}<text x="60" y="76" text-anchor="middle" font-size="34" fill="#ffffff" font-family="Inter, Arial, sans-serif">${escapeSvgText(icon)}</text></svg>`;
}

function escapeSvgText(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function persistLastGroup(group) {
  withSync(KEY_LAST_GROUP, { value: group }, { delay: 0 });
}

function setDesignerInputs(view, design = state.designer) {
  if (!view) return;
  const shapeSel = view.querySelector(designerInputs.shape);
  const fillInput = view.querySelector(designerInputs.fill);
  const accentInput = view.querySelector(designerInputs.accent);
  const iconInput = view.querySelector(designerInputs.icon);
  if (shapeSel) shapeSel.value = design.shape || DEFAULT_DESIGN.shape;
  if (fillInput) fillInput.value = design.fill || DEFAULT_DESIGN.fill;
  if (accentInput) accentInput.value = design.accent || DEFAULT_DESIGN.accent;
  if (iconInput) iconInput.value = (design.icon || DEFAULT_DESIGN.icon || '⭐').slice(0, 2);
}

function updateDesignerPreview(view = document.querySelector('#view-insignias')) {
  const preview = view?.querySelector('#bz-designer-preview');
  if (!preview) return;
  preview.innerHTML = generateBadgeSVG(state.designer);
}

function setupDesigner(view) {
  if (!view) return;
  const shapeSel = view.querySelector(designerInputs.shape);
  const fillInput = view.querySelector(designerInputs.fill);
  const accentInput = view.querySelector(designerInputs.accent);
  const iconInput = view.querySelector(designerInputs.icon);
  if (!shapeSel || !fillInput || !accentInput || !iconInput) return;
  if (shapeSel.dataset.ready === '1') {
    setDesignerInputs(view);
    updateDesignerPreview(view);
    return;
  }
  const apply = () => {
    state.designer = cloneDesign({
      shape: shapeSel.value || DEFAULT_DESIGN.shape,
      fill: fillInput.value || DEFAULT_DESIGN.fill,
      accent: accentInput.value || DEFAULT_DESIGN.accent,
      icon: (iconInput.value || DEFAULT_DESIGN.icon || '⭐').slice(0, 2),
    });
    updateDesignerPreview(view);
  };
  shapeSel.addEventListener('change', apply);
  fillInput.addEventListener('input', apply);
  accentInput.addEventListener('input', apply);
  iconInput.addEventListener('input', () => {
    if (iconInput.value.length > 2) iconInput.value = iconInput.value.slice(0, 2);
    apply();
  });
  view.querySelector('#bz-designer-guardar')?.addEventListener('click', () => handleSaveTemplate());
  view.querySelector('#bz-designer-limpiar')?.addEventListener('click', () => {
    state.designer = { ...DEFAULT_DESIGN };
    setDesignerInputs(view);
    updateDesignerPreview(view);
  });
  shapeSel.dataset.ready = '1';
  setDesignerInputs(view);
  updateDesignerPreview(view);
}

function normalizeDesign(design) {
  return cloneDesign(design);
}

function normalizeInsignia(ins) {
  if (!ins) return null;
  return {
    id: ins.id || `ins-${Math.random().toString(16).slice(2)}`,
    alumno: ins.alumno || '',
    tipo: ins.tipo || 'general',
    nombre: ins.nombre || 'Insignia',
    puntos: Number.isFinite(Number(ins.puntos)) ? Number(ins.puntos) : 0,
    descripcion: ins.descripcion || '',
    fecha: ins.fecha || new Date().toISOString(),
    design: normalizeDesign(ins.design),
  };
}

function normalizeTemplate(tpl) {
  if (!tpl) return null;
  return {
    nombre: String(tpl.nombre || '').trim(),
    puntos: Number.isFinite(Number(tpl.puntos)) ? Number(tpl.puntos) : 0,
    tipo: String(tpl.tipo || 'general').trim() || 'general',
    descripcion: String(tpl.descripcion || '').trim(),
    design: normalizeDesign(tpl.design),
  };
}


export function initInsignias() {
  const view = document.querySelector('#view-insignias');
  if (!view) return;

  ensureUI(view);
  hydrateState();
  setupDesigner(view);
  renderStudentOptions();
  renderTemplateOptions();
  renderFilters();
  renderSummary();
  renderList();
  updateDesignerPreview(view);

  if (wired) return;

  const groupInput = view.querySelector('#bz-grupo');
  const assignBtn = view.querySelector('#bz-asignar');
  const listEl = view.querySelector('#bz-list');
  const saveTemplateBtn = view.querySelector('#bz-save-template');
  const templateSelect = view.querySelector('#bz-template');
  const clearBtn = view.querySelector('#bz-clear-all');
  const filterAlumno = view.querySelector('#bz-filtro-alumno');
  const filterTipo = view.querySelector('#bz-filtro-tipo');

  groupInput?.addEventListener('change', handleGroupChange);
  assignBtn?.addEventListener('click', handleAssign);
  listEl?.addEventListener('click', handleListClick);
  saveTemplateBtn?.addEventListener('click', handleSaveTemplate);
  templateSelect?.addEventListener('change', handleTemplateApply);
  clearBtn?.addEventListener('click', handleClearGroup);
  filterAlumno?.addEventListener('change', (e) => {
    state.filters.alumno = e.target.value;
    renderList();
  });
  filterTipo?.addEventListener('change', (e) => {
    state.filters.tipo = e.target.value;
    renderList();
  });

  wired = true;
}

export function configurarAplicacionInsignias({ group, colIndex, onApply }) {
  const savedConfig = Storage.get(K.INSIG_CFG(group, colIndex), {
    formula: 'suma',
    ponderaciones: {},
    topN: 3,
    escala: 100,
  });

  const dialog = createConfigDialog(savedConfig, (newConfig) => {
    withSync(K.INSIG_CFG(group, colIndex), newConfig);

    const allInsignias = Storage.get(K.INSIGNIAS(group), []);
    const gradebookData = Storage.get(K.GBOOK(group), { alumnos: [] });

    const studentNames = gradebookData.alumnos || [];
    const studentScores = {};

    studentNames.forEach((studentName) => {
      const studentInsignias = allInsignias.filter((i) => i.alumno === studentName);
      studentScores[studentName] = calcularPuntaje(studentInsignias, newConfig);
    });

    if (onApply) {
      onApply({ colIndex, studentScores });
    }
  });

  document.body.appendChild(dialog);
  dialog.showModal();
}

export function calcularPuntaje(insignias, config) {
  if (!insignias || insignias.length === 0) return 0;

  let rawScore = 0;
  switch (config.formula) {
    case 'suma':
      rawScore = insignias.reduce((total, ins) => total + (ins.puntos || 0), 0);
      break;
    case 'ponderado':
      rawScore = insignias.reduce((total, ins) => {
        const peso = config.ponderaciones?.[ins.tipo] || 1;
        return total + (ins.puntos || 0) * peso;
      }, 0);
      break;
    case 'topN':
      rawScore = insignias
        .slice()
        .sort((a, b) => (b.puntos || 0) - (a.puntos || 0))
        .slice(0, config.topN)
        .reduce((total, ins) => total + (ins.puntos || 0), 0);
      break;
    default:
      rawScore = 0;
  }

  if (config.escala === 10) {
    return Number.parseFloat((rawScore / 10).toFixed(2));
  }
  return Number.parseFloat(rawScore.toFixed(2));
}

function ensureUI(view) {
  const assignBtn = view.querySelector('#bz-asignar');
  if (assignBtn && assignBtn.getAttribute('type') !== 'button') {
    assignBtn.setAttribute('type', 'button');
  }

  if (!view.querySelector('#bz-row-recipient')) {
    const recipientsRow = document.createElement('div');
    recipientsRow.className = 'row';
    recipientsRow.id = 'bz-row-recipient';
    recipientsRow.style.gap = '12px';
    recipientsRow.style.marginTop = '8px';
    recipientsRow.innerHTML = `
      <div style="flex:1;min-width:180px;">
        <label for="bz-alumno">Alumnos del grupo</label>
        <select id="bz-alumno" class="select-field" multiple size="6" aria-describedby="bz-alumno-help"></select>
        <small id="bz-alumno-help" style="display:block;font-size:12px;opacity:.7;margin-top:4px;">Usa Ctrl/Cmd para seleccionar varios alumnos.</small>
      </div>
      <div style="flex:1;min-width:160px;">
        <label for="bz-alumno-manual">Agregar alumnos manualmente</label>
        <input id="bz-alumno-manual" class="input-field" placeholder="Nombres separados por coma" />
        <small style="display:block;font-size:12px;opacity:.7;margin-top:4px;">Se crearan solo si no existen en el grupo.</small>
      </div>
      <div style="flex:1;min-width:160px;">
        <label for="bz-tipo">Categoria / Tipo</label>
        <input id="bz-tipo" class="input-field" placeholder="Ej. participacion" />
        <small style="display:block;font-size:12px;opacity:.7;margin-top:4px;">Se usa en los calculos ponderados.</small>
      </div>`;
    view.insertBefore(recipientsRow, assignBtn);
  }

  if (!view.querySelector('#bz-descripcion')) {
    const descWrap = document.createElement('div');
    descWrap.style.marginTop = '8px';
    descWrap.innerHTML = `
      <label for="bz-descripcion">Descripcion / evidencia</label>
      <textarea id="bz-descripcion" class="input-field" rows="3" placeholder="Escribe una nota breve o pega un enlace."></textarea>`;
    view.insertBefore(descWrap, assignBtn);
  }

  if (!view.querySelector('#bz-template-row')) {
    const tplRow = document.createElement('div');
    tplRow.className = 'row';
    tplRow.id = 'bz-template-row';
    tplRow.style.gap = '12px';
    tplRow.style.margin = '8px 0';
    tplRow.innerHTML = `
      <div style="flex:1;min-width:180px;">
        <label for="bz-template">Plantillas de insignias</label>
        <select id="bz-template" class="select-field">
          <option value="">Selecciona una plantilla</option>
        </select>
        <small style="display:block;font-size:12px;opacity:.7;margin-top:4px;">Aplicar una plantilla completara los campos.</small>
      </div>
      <div style="display:flex;align-items:flex-end;gap:8px;">
        <button type="button" class="btn btn-secondary" id="bz-save-template">Guardar como plantilla</button>
      </div>`;
    view.insertBefore(tplRow, assignBtn);
  }

  if (!document.getElementById('bz-nombre-suggestions')) {
    const data = document.createElement('datalist');
    data.id = 'bz-nombre-suggestions';
    document.body.appendChild(data);
  }
  const nameInput = view.querySelector('#bz-nombre');
  if (nameInput && !nameInput.getAttribute('list')) {
    nameInput.setAttribute('list', 'bz-nombre-suggestions');
  }

  if (!view.querySelector('#bz-clear-all')) {
    const clearBtn = document.createElement('button');
    clearBtn.id = 'bz-clear-all';
    clearBtn.className = 'btn';
    clearBtn.type = 'button';
    clearBtn.textContent = 'Limpiar historial del grupo';
    clearBtn.style.marginLeft = '8px';
    assignBtn?.insertAdjacentElement('afterend', clearBtn);
  }

  if (!view.querySelector('#bz-summary')) {
    const summary = document.createElement('div');
    summary.id = 'bz-summary';
    summary.className = 'card';
    summary.style.marginTop = '12px';
    summary.innerHTML = '<h3 style="margin-top:0;">Resumen por alumno</h3><div class="bz-summary-content" style="font-size:14px;opacity:.75;">Aun no hay insignias.</div>';
    view.insertBefore(summary, view.querySelector('#bz-list'));
  }

  if (!view.querySelector('#bz-filters')) {
    const filterRow = document.createElement('div');
    filterRow.id = 'bz-filters';
    filterRow.className = 'row';
    filterRow.style.gap = '12px';
    filterRow.style.margin = '8px 0';
    filterRow.innerHTML = `
      <div style="flex:1;min-width:160px;">
        <label for="bz-filtro-alumno">Filtrar por alumno</label>
        <select id="bz-filtro-alumno" class="select-field">
          <option value="">Todos</option>
        </select>
      </div>
      <div style="flex:1;min-width:160px;">
        <label for="bz-filtro-tipo">Filtrar por tipo</label>
        <select id="bz-filtro-tipo" class="select-field">
          <option value="">Todos</option>
        </select>
      </div>`;
    const summary = view.querySelector('#bz-summary');
    if (summary) {
      view.insertBefore(filterRow, summary);
    }
  }

  const list = view.querySelector('#bz-list');
  if (list) {
    list.classList.add('bz-insignias-list');
  }
}

function hydrateState() {
  const groupInput = document.querySelector('#bz-grupo');
  let group = groupInput?.value?.trim();
  if (!group) {
    const stored = Storage.get(KEY_LAST_GROUP);
    if (stored) {
      group = typeof stored === 'string' ? stored : stored?.value;
    }
    if (!group) group = extractFirstGroup();
    if (!group) group = 'GENERAL';
    if (groupInput) groupInput.value = group;
  }
  state.group = group;
  persistLastGroup(state.group);

  const storedInsignias = Storage.get(K.INSIGNIAS(state.group), []);
  state.insignias = Array.isArray(storedInsignias)
    ? storedInsignias.map((ins) => normalizeInsignia(ins)).filter(Boolean)
    : [];
  state.alumnos = loadAlumnos(state.group);
  state.userTemplates = loadUserTemplates();
  state.templates = computeTemplates();
  state.filters = { alumno: '', tipo: '' };
  state.lastAssigned = [];
  state.designer = cloneDesign(state.designer);
}

function extractFirstGroup() {
  const cfg = Storage.get(K.CONFIG, {});
  if (Array.isArray(cfg.grupos) && cfg.grupos.length > 0) {
    return String(cfg.grupos[0]).trim();
  }
  if (typeof cfg.grupos === 'string') {
    const first = cfg.grupos.split(',')[0]?.trim();
    if (first) return first;
  }
  return '';
}

function loadAlumnos(group) {
  const names = new Set();
  const gradebook = Storage.get(K.GBOOK(group), null);
  if (gradebook && Array.isArray(gradebook.alumnos)) {
    gradebook.alumnos.forEach((n) => {
      if (n) names.add(String(n).trim());
    });
  }
  const seating = Storage.get(K.ASIENTOS(group), null);
  if (seating && Array.isArray(seating.seats)) {
    seating.seats.forEach((seat) => {
      const name = seat?.name;
      if (name) names.add(String(name).trim());
    });
  }
  return Array.from(names).filter(Boolean).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
}

function loadUserTemplates() {
  const raw = Storage.get(KEY_TEMPLATES, []);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((tpl) => normalizeTemplate(tpl))
    .filter((tpl) => tpl && tpl.nombre);
}

function computeTemplates() {
  const seen = new Set();
  const templates = [];
  const candidates = [
    ...DEFAULT_TEMPLATES,
    ...state.userTemplates,
    ...state.insignias.map((ins) => ({
      nombre: ins?.nombre,
      puntos: ins?.puntos,
      tipo: ins?.tipo,
      descripcion: ins?.descripcion,
      design: ins?.design,
    })),
  ];
  candidates.forEach((tpl) => {
    const normalized = normalizeTemplate(tpl);
    if (!normalized || !normalized.nombre) return;
    const key = `${normalized.nombre.toLowerCase()}::${normalized.puntos}`;
    if (seen.has(key)) return;
    templates.push(normalized);
    seen.add(key);
  });
  return templates;
}

function renderStudentOptions() {
  const select = document.querySelector('#bz-alumno');
  if (!select) return;
  const current = new Set(state.lastAssigned || []);
  const names = new Set(state.alumnos);
  state.insignias.forEach((ins) => {
    if (ins?.alumno) names.add(String(ins.alumno).trim());
  });
  const sorted = Array.from(names).filter(Boolean).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  select.innerHTML = '';
  if (sorted.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Sin alumnos registrados';
    opt.disabled = true;
    select.appendChild(opt);
    select.size = 4;
    return;
  }
  sorted.forEach((name) => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    if (current.has(name)) opt.selected = true;
    select.appendChild(opt);
  });
  select.size = Math.min(8, Math.max(4, sorted.length));
}

function renderTemplateOptions() {
  const select = document.querySelector('#bz-template');
  const datalist = document.getElementById('bz-nombre-suggestions');
  if (!select || !datalist) return;
  const prev = select.value;
  select.innerHTML = '<option value="">Selecciona una plantilla</option>';
  state.templates.forEach((tpl, idx) => {
    const opt = document.createElement('option');
    opt.value = String(idx);
    opt.dataset.index = String(idx);
    opt.textContent = `${tpl.nombre} (${formatNumber(tpl.puntos)} pts)`;
    select.appendChild(opt);
  });
  if (prev && select.querySelector(`option[value="${prev}"]`)) {
    select.value = prev;
  } else {
    select.value = '';
  }

  const seen = new Set();
  datalist.innerHTML = '';
  state.templates.forEach((tpl) => {
    if (seen.has(tpl.nombre)) return;
    const opt = document.createElement('option');
    opt.value = tpl.nombre;
    datalist.appendChild(opt);
    seen.add(tpl.nombre);
  });
}

function renderFilters() {
  const filterAlumno = document.querySelector('#bz-filtro-alumno');
  const filterTipo = document.querySelector('#bz-filtro-tipo');
  if (filterAlumno) {
    const current = state.filters.alumno;
    const names = new Set();
    state.insignias.forEach((ins) => {
      if (ins?.alumno) names.add(String(ins.alumno).trim());
    });
    const sorted = Array.from(names).filter(Boolean).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    filterAlumno.innerHTML = '<option value="">Todos</option>';
    sorted.forEach((name) => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      filterAlumno.appendChild(opt);
    });
    if (current && filterAlumno.querySelector(`option[value="${current}"]`)) {
      filterAlumno.value = current;
    } else {
      state.filters.alumno = '';
    }
  }
  if (filterTipo) {
    const current = state.filters.tipo;
    const tipos = new Set();
    state.insignias.forEach((ins) => {
      if (ins?.tipo) tipos.add(String(ins.tipo).trim());
    });
    const sorted = Array.from(tipos).filter(Boolean).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    filterTipo.innerHTML = '<option value="">Todos</option>';
    sorted.forEach((tipo) => {
      const opt = document.createElement('option');
      opt.value = tipo;
      opt.textContent = tipo;
      filterTipo.appendChild(opt);
    });
    if (current && filterTipo.querySelector(`option[value="${current}"]`)) {
      filterTipo.value = current;
    } else {
      state.filters.tipo = '';
    }
  }
}

function renderSummary() {
  const container = document.querySelector('#bz-summary .bz-summary-content');
  if (!container) return;
  if (!state.insignias.length) {
    container.textContent = 'Aun no hay insignias.';
    return;
  }
  const byStudent = aggregateByStudent();
  const rows = Array.from(byStudent.entries()).sort((a, b) => b[1].total - a[1].total);
  const html = ['<table class="bz-summary-table" style="width:100%;border-collapse:collapse;font-size:13px;">',
    '<thead><tr><th style="text-align:left;padding:4px;">Alumno</th><th style="text-align:right;padding:4px;">Insignias</th><th style="text-align:right;padding:4px;">Total pts</th><th style="text-align:left;padding:4px;">Por tipo</th></tr></thead>',
    '<tbody>'];
  rows.forEach(([name, data]) => {
    const tipos = Object.entries(data.tipos)
      .map(([tipo, pts]) => `${escapeHtml(tipo)}: ${formatNumber(pts)}`)
      .join(' | ');
    html.push(`<tr><td style="padding:4px;">${escapeHtml(name)}</td><td style="text-align:right;padding:4px;">${data.count}</td><td style="text-align:right;padding:4px;">${formatNumber(data.total)}</td><td style="padding:4px;">${tipos || '-'}</td></tr>`);
  });
  html.push('</tbody></table>');
  container.innerHTML = html.join('');
}

function renderList() {
  const list = document.querySelector('#bz-list');
  if (!list) return;
  if (!state.insignias.length) {
    list.innerHTML = '<li style="opacity:.7;">No hay insignias registradas.</li>';
    return;
  }
  const filtered = state.insignias.filter((ins) => {
    if (state.filters.alumno && ins.alumno !== state.filters.alumno) return false;
    if (state.filters.tipo && (ins.tipo || 'general') !== state.filters.tipo) return false;
    return true;
  });
  if (!filtered.length) {
    list.innerHTML = '<li style="opacity:.7;">Sin coincidencias para los filtros seleccionados.</li>';
    return;
  }
  list.innerHTML = filtered.map(renderItem).join('');
}

function renderItem(ins) {
  const nombre = escapeHtml(ins?.nombre || 'Insignia');
  const alumno = escapeHtml(ins?.alumno || 'Sin alumno');
  const tipo = escapeHtml(ins?.tipo || 'general');
  const puntos = formatNumber(ins?.puntos || 0);
  const fecha = formatDate(ins?.fecha);
  const descripcion = ins?.descripcion ? `<div class="bz-item-desc" style="margin:6px 0;white-space:pre-line;">${escapeHtml(ins.descripcion)}</div>` : '';
  const id = escapeAttr(ins?.id || '');
  const metaParts = [alumno, tipo, fecha ? escapeHtml(fecha) : ''];
  const meta = metaParts.filter(Boolean).join(' - ');
  const svg = generateBadgeSVG(ins?.design);
  return `<li data-id="${id}" class="bz-item" style="padding:8px 0;border-bottom:1px solid var(--stroke,rgba(148,163,184,.4));display:flex;gap:12px;align-items:flex-start;">
    <span class="badge-preview" aria-hidden="true">${svg}</span>
    <div class="bz-item-body" style="flex:1;">
      <div class="bz-item-header" style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
        <strong>${nombre}</strong>
        <span class="bz-item-points" style="font-size:13px;opacity:.8;">${puntos} pts</span>
      </div>
      <div class="bz-item-meta" style="font-size:12px;opacity:.75;margin-top:2px;">${meta}</div>
      ${descripcion}
      <div class="bz-item-actions" style="margin-top:6px;display:flex;gap:8px;">
        <button type="button" class="btn btn-secondary" data-action="delete-insignia" data-id="${id}">Eliminar</button>
      </div>
    </div>
  </li>`;
}

function handleAssign() {
  const view = document.querySelector('#view-insignias');
  if (!view) return;

  const groupInput = view.querySelector('#bz-grupo');
  const group = (groupInput?.value || '').trim() || 'GENERAL';
  state.group = group;
  persistLastGroup(state.group);

  const targets = Array.from(new Set([...getSelectedStudents(), ...getManualStudents()]));
  if (!targets.length) {
    safeNotify('warn', 'Selecciona al menos un alumno o registra uno nuevo.');
    return;
  }

  const nameInput = view.querySelector('#bz-nombre');
  const nombre = nameInput?.value?.trim();
  if (!nombre) {
    safeNotify('warn', 'Ingresa el nombre de la insignia.');
    nameInput?.focus();
    return;
  }

  const puntosRaw = Number.parseFloat(view.querySelector('#bz-puntos')?.value || '0');
  const puntos = Number.isNaN(puntosRaw) ? 0 : puntosRaw;
  const tipo = view.querySelector('#bz-tipo')?.value?.trim() || nombre;
  const descripcion = view.querySelector('#bz-descripcion')?.value?.trim() || '';
  const fechaIso = new Date().toISOString();

  const baseDesign = cloneDesign(state.designer);
  const newBadges = targets.map((student, idx) => normalizeInsignia({
    id: `ins-${Date.now()}-${idx}-${Math.random().toString(16).slice(2)}`,
    alumno: student,
    tipo,
    nombre,
    puntos,
    descripcion,
    fecha: fechaIso,
    design: baseDesign,
  })).filter(Boolean);

  state.insignias = [...newBadges, ...state.insignias].map((ins) => normalizeInsignia(ins)).filter(Boolean);
  saveInsignias();
  registerNewStudents(targets);
  state.lastAssigned = targets;
  state.templates = computeTemplates();
  renderStudentOptions();
  renderTemplateOptions();
  renderFilters();
  renderSummary();
  renderList();

  const manualInput = view.querySelector('#bz-alumno-manual');
  if (manualInput) manualInput.value = '';
  safeNotify('success', `Insignia asignada a ${targets.length} alumno(s).`);
}

function handleGroupChange(e) {
  const newGroup = (e.target.value || '').trim() || 'GENERAL';
  if (newGroup === state.group) return;
  state.group = newGroup;
  persistLastGroup(state.group);

  const storedInsignias = Storage.get(K.INSIGNIAS(state.group), []);
  state.insignias = Array.isArray(storedInsignias)
    ? storedInsignias.map((ins) => normalizeInsignia(ins)).filter(Boolean)
    : [];
  state.alumnos = loadAlumnos(state.group);
  state.userTemplates = loadUserTemplates();
  state.templates = computeTemplates();
  state.filters = { alumno: '', tipo: '' };
  state.lastAssigned = [];

  renderStudentOptions();
  renderTemplateOptions();
  renderFilters();
  renderSummary();
  renderList();

  safeNotify('info', `Se cargaron ${state.insignias.length} insignias del grupo ${state.group}.`);
}

function handleListClick(event) {
  const btn = event.target.closest('[data-action="delete-insignia"]');
  if (!btn) return;
  const id = btn.getAttribute('data-id');
  if (!id) return;
  if (typeof window !== 'undefined' && !window.confirm('Eliminar esta insignia?')) return;
  const index = state.insignias.findIndex((ins) => String(ins?.id) === id);
  if (index === -1) return;
  const [removed] = state.insignias.splice(index, 1);
  saveInsignias();
  state.templates = computeTemplates();
  renderStudentOptions();
  renderTemplateOptions();
  renderFilters();
  renderSummary();
  renderList();
  safeNotify('info', `Insignia "${removed?.nombre || ''}" eliminada.`);
}

function handleSaveTemplate() {
  const view = document.querySelector('#view-insignias');
  if (!view) return;
  const nombre = view.querySelector('#bz-nombre')?.value?.trim();
  if (!nombre) {
    safeNotify('warn', 'Ingresa el nombre de la insignia antes de guardarla como plantilla.');
    return;
  }
  const puntosRaw = Number.parseFloat(view.querySelector('#bz-puntos')?.value || '0');
  const puntos = Number.isNaN(puntosRaw) ? 0 : puntosRaw;
  const tipo = view.querySelector('#bz-tipo')?.value?.trim() || 'general';
  const descripcion = view.querySelector('#bz-descripcion')?.value?.trim() || '';

  const template = normalizeTemplate({ nombre, puntos, tipo, descripcion, design: state.designer });
  if (!template) {
    safeNotify('error', 'No se pudo guardar la plantilla.');
    return;
  }
  const idx = state.userTemplates.findIndex((tpl) => tpl.nombre.toLowerCase() === template.nombre.toLowerCase());
  if (idx >= 0) {
    state.userTemplates[idx] = template;
  } else {
    state.userTemplates.push(template);
  }
  withSync(KEY_TEMPLATES, state.userTemplates);
  state.templates = computeTemplates();
  renderTemplateOptions();
  safeNotify('success', 'Plantilla guardada.');
}

function handleTemplateApply(e) {
  const view = document.querySelector('#view-insignias');
  if (!view) return;
  const idx = Number(e.target.value || e.target.selectedOptions?.[0]?.value);
  if (!Number.isFinite(idx)) return;
  const tpl = state.templates[idx];
  if (!tpl) return;
  const nameInput = view.querySelector('#bz-nombre');
  const pointsInput = view.querySelector('#bz-puntos');
  const typeInput = view.querySelector('#bz-tipo');
  const descInput = view.querySelector('#bz-descripcion');

  if (nameInput) nameInput.value = tpl.nombre || '';
  if (pointsInput) pointsInput.value = tpl.puntos;
  if (typeInput) typeInput.value = tpl.tipo || 'general';
  if (descInput) descInput.value = tpl.descripcion || '';
  state.designer = cloneDesign(tpl.design);
  setDesignerInputs(view, state.designer);
  updateDesignerPreview(view);
  safeNotify('info', 'Plantilla aplicada.');
}

function handleClearGroup() {
  if (!state.insignias.length) {
    safeNotify('info', 'No hay insignias para eliminar.');
    return;
  }
  if (typeof window !== 'undefined' && !window.confirm('Eliminar todas las insignias del grupo actual?')) return;
  state.insignias = [];
  saveInsignias();
  state.templates = computeTemplates();
  renderFilters();
  renderSummary();
  renderList();
  safeNotify('success', 'Historial de insignias limpiado.');
}

function saveInsignias() {
  const normalized = state.insignias.map((ins) => normalizeInsignia(ins)).filter(Boolean);
  state.insignias = normalized;
  withSync(K.INSIGNIAS(state.group), normalized);
}

function getSelectedStudents() {
  const select = document.querySelector('#bz-alumno');
  if (!select) return [];
  return Array.from(select.options)
    .filter((opt) => opt.selected && opt.value)
    .map((opt) => opt.value);
}

function getManualStudents() {
  const input = document.querySelector('#bz-alumno-manual');
  if (!input || !input.value) return [];
  return input.value
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function registerNewStudents(names) {
  const set = new Set(state.alumnos);
  names.forEach((name) => {
    if (name) set.add(String(name).trim());
  });
  state.alumnos = Array.from(set).filter(Boolean).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
}

function aggregateByStudent() {
  const map = new Map();
  state.insignias.forEach((ins) => {
    if (!ins?.alumno) return;
    const key = String(ins.alumno).trim();
    if (!key) return;
    if (!map.has(key)) {
      map.set(key, { total: 0, count: 0, tipos: {} });
    }
    const entry = map.get(key);
    const pts = Number(ins.puntos) || 0;
    const tipo = String(ins.tipo || 'general').trim() || 'general';
    entry.total += pts;
    entry.count += 1;
    entry.tipos[tipo] = (entry.tipos[tipo] || 0) + pts;
  });
  return map;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}

function formatNumber(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return '0';
  return Number.isInteger(num) ? String(num) : num.toFixed(2);
}

function formatDate(value) {
  if (!value) return '';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  } catch (err) {
    console.error('[insignias] parse date', err);
    return String(value);
  }
}

function createConfigDialog(config, onSave) {
  const dialog = document.createElement('dialog');
  dialog.className = 'card';
  dialog.style.cssText = 'width:90%;max-width:500px;border:1px solid var(--stroke);background:var(--panel);color:var(--text);padding:1.5rem;';
  dialog.innerHTML = `
    <h3 style="margin-top:0;">Configurar Columna de Insignias</h3>
    <form id="insig-config-form">
      <div class="row" style="gap:1rem;margin-bottom:1rem;">
        <div style="flex:2;">
          <label for="formula-select">Formula de Calculo</label>
          <select id="formula-select" class="select-field">
            <option value="suma" ${config.formula === 'suma' ? 'selected' : ''}>Suma Total</option>
            <option value="ponderado" ${config.formula === 'ponderado' ? 'selected' : ''}>Ponderada</option>
            <option value="topN" ${config.formula === 'topN' ? 'selected' : ''}>Top-N</option>
          </select>
        </div>
        <div style="flex:1;">
          <label for="escala-select">Escala</label>
          <select id="escala-select" class="select-field">
            <option value="100" ${config.escala === 100 ? 'selected' : ''}>0 - 100</option>
            <option value="10" ${config.escala === 10 ? 'selected' : ''}>0 - 10</option>
          </select>
        </div>
      </div>
      <div id="ponderado-config" class="${config.formula === 'ponderado' ? '' : 'hidden'}" style="margin-bottom:1rem;">
        <label>Ponderaciones (ej. academica:1.5, social:0.8)</label>
        <input id="ponderado-input" class="input-field" value="${Object.entries(config.ponderaciones || {}).map(([k, v]) => `${k}:${v}`).join(', ')}" />
      </div>
      <div id="topN-config" class="${config.formula === 'topN' ? '' : 'hidden'}" style="margin-bottom:1rem;">
        <label>Valor de N</label>
        <input id="topN-input" type="number" class="input-field" value="${config.topN}" />
      </div>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:1.5rem;">
        <button type="button" id="cancel-btn" class="btn btn-secondary">Cancelar</button>
        <button type="submit" class="btn btn-primary">Aplicar</button>
      </div>
    </form>`;

  const form = dialog.querySelector('#insig-config-form');
  const formulaSelect = dialog.querySelector('#formula-select');
  const ponderadoDiv = dialog.querySelector('#ponderado-config');
  const topNDiv = dialog.querySelector('#topN-config');

  formulaSelect.addEventListener('change', () => {
    const val = formulaSelect.value;
    ponderadoDiv.classList.toggle('hidden', val !== 'ponderado');
    topNDiv.classList.toggle('hidden', val !== 'topN');
  });

  dialog.querySelector('#cancel-btn')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => dialog.remove());

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const newConfig = {
      formula: formulaSelect.value,
      escala: Number.parseInt(dialog.querySelector('#escala-select')?.value || '100', 10) || 100,
      ponderaciones: {},
      topN: Number.parseInt(dialog.querySelector('#topN-input')?.value || '3', 10) || 3,
    };
    const ponderadoStr = dialog.querySelector('#ponderado-input')?.value || '';
    ponderadoStr.split(',').forEach((pair) => {
      const [key, value] = pair.split(':').map((s) => s.trim());
      if (key && value && !Number.isNaN(Number.parseFloat(value))) {
        newConfig.ponderaciones[key] = Number.parseFloat(value);
      }
    });
    onSave(newConfig);
    dialog.close();
  });

  return dialog;
}

function safeNotify(type, msg) {
  try {
    import('./ui.js').then((mod) => {
      if (mod?.notify) {
        mod.notify(type, msg);
      } else {
        fallbackNotify(type, msg);
      }
    }).catch(() => fallbackNotify(type, msg));
  } catch (err) {
    fallbackNotify(type, msg);
  }
}

function fallbackNotify(type, msg) {
  if (typeof window !== 'undefined' && (type === 'warn' || type === 'error')) {
    window.alert?.(msg);
  } else {
    console.log(`[insignias][${type}] ${msg}`);
  }
}
