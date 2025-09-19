import { Storage, K, getLogs } from '../services/storage.js';
import { descargarAlumnoXLS, descargarClaseXLS } from './export_xls.js';

const state = {
  group: '',
  dataset: null,
};

let stylesInjected = false;

export function initReportes() {
  const root = document.querySelector('#reportes-root');
  if (!root) return;
  injectStyles();
  if (root.dataset.ready !== '1') {
    buildStructure(root);
    bindEvents(root);
    root.dataset.ready = '1';
  }
  hydrateGroups(root);
  if (!state.group) {
    const groups = getAvailableGroups();
    state.group = groups[0] || '';
  }
  if (state.group) {
    const select = root.querySelector('#rep-group');
    if (select) select.value = state.group;
    refreshDataset(state.group, root);
  } else {
    renderSummary(null, root);
    renderStudents(null, root);
    renderPreview(null, root);
    renderLog(null, root);
  }
}

function injectStyles() {
  if (stylesInjected) return;
  const style = document.createElement('style');
  style.id = 'reportes-styles';
  style.textContent = `
    .rep-layout { display:grid; gap:16px; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); margin-bottom:20px; }
    .rep-card { background:var(--panel,rgba(15,23,42,0.45)); border:1px solid var(--stroke,rgba(148,163,184,0.25)); border-radius:16px; padding:16px; display:flex; flex-direction:column; gap:10px; }
    .rep-card label { font-size:12px; opacity:0.75; display:block; margin-bottom:4px; }
    .rep-card select, .rep-card button { width:100%; }
    .rep-card .rep-actions { display:flex; flex-direction:column; gap:8px; }
    .rep-card .muted { font-size:12px; opacity:0.75; }
    .rep-preview { background:var(--panel,rgba(15,23,42,0.45)); border:1px dashed rgba(148,163,184,0.3); border-radius:16px; padding:16px; overflow:auto; }
    .rep-preview table { width:100%; border-collapse:collapse; font-size:13px; }
    .rep-preview th, .rep-preview td { border-bottom:1px solid rgba(148,163,184,0.2); padding:8px 10px; text-align:left; }
    .rep-preview tbody tr:nth-child(odd) { background:rgba(15,23,42,0.35); }
    .rep-log { margin:0; padding-left:16px; font-size:12px; max-height:160px; overflow:auto; }
    .rep-empty { padding:12px; border:1px dashed rgba(148,163,184,0.35); border-radius:12px; text-align:center; font-size:12px; opacity:0.75; }
    @media (min-width:680px) {
      .rep-card .rep-actions { flex-direction:row; }
      .rep-card .rep-actions button { width:auto; flex:1; }
    }
  `;
  document.head.appendChild(style);
  stylesInjected = true;
}

function buildStructure(root) {
  root.innerHTML = `
    <div class="rep-layout">
      <section class="rep-card" id="rep-card-config">
        <div>
          <label for="rep-group">Grupo</label>
          <select id="rep-group" class="select-field"></select>
        </div>
        <button id="rep-refresh" class="btn btn-secondary" type="button">Recargar datos</button>
        <div id="rep-summary" class="muted">Selecciona un grupo para ver informacion.</div>
      </section>
      <section class="rep-card" id="rep-card-alumno">
        <div>
          <label for="rep-student">Alumno</label>
          <select id="rep-student" class="select-field"></select>
        </div>
        <div class="rep-actions">
          <button id="rep-alumno-pdf" class="btn btn-primary" type="button">Descargar PDF</button>
          <button id="rep-alumno-xls" class="btn btn-secondary" type="button">Descargar XLS</button>
        </div>
        <div id="rep-alumno-info" class="muted"></div>
      </section>
      <section class="rep-card" id="rep-card-clase">
        <p class="muted">Genera un resumen completo del grupo con estadisticas de actividades e insignias.</p>
        <div class="rep-actions">
          <button id="rep-clase-pdf" class="btn btn-primary" type="button">PDF de clase</button>
          <button id="rep-clase-xls" class="btn btn-secondary" type="button">XLS de clase</button>
        </div>
        <div id="rep-flags" class="muted"></div>
      </section>
      <section class="rep-card" id="rep-card-log">
        <p class="muted">Eventos recientes</p>
        <ol id="rep-log" class="rep-log"></ol>
      </section>
    </div>
    <div id="rep-preview" class="rep-preview"></div>
  `;
}

function bindEvents(root) {
  root.querySelector('#rep-group')?.addEventListener('change', (event) => {
    const group = event.target.value;
    state.group = group;
    refreshDataset(group, root);
  });
  root.querySelector('#rep-refresh')?.addEventListener('click', () => {
    if (!state.group) {
      alert('Selecciona un grupo primero.');
      return;
    }
    refreshDataset(state.group, root, { force: true });
  });
  root.querySelector('#rep-alumno-pdf')?.addEventListener('click', () => {
    const select = root.querySelector('#rep-student');
    if (!select || !state.dataset) {
      alert('No hay datos cargados.');
      return;
    }
    const idx = parseInt(select.value, 10);
    if (Number.isNaN(idx)) {
      alert('Selecciona un alumno.');
      return;
    }
    const reporte = generarReporteAlumno({ grupo: state.group, alumno_index: idx });
    if (!reporte) {
      alert('No hay informacion para el alumno seleccionado.');
      return;
    }
    descargarReporteAlumnoPDF(reporte);
  });
  root.querySelector('#rep-alumno-xls')?.addEventListener('click', () => {
    const select = root.querySelector('#rep-student');
    if (!select || !state.dataset) {
      alert('No hay datos cargados.');
      return;
    }
    const idx = parseInt(select.value, 10);
    if (Number.isNaN(idx)) {
      alert('Selecciona un alumno.');
      return;
    }
    const reporte = generarReporteAlumno({ grupo: state.group, alumno_index: idx });
    if (!reporte) {
      alert('No hay informacion para el alumno seleccionado.');
      return;
    }
    descargarReporteAlumnoXLS(reporte);
  });
  root.querySelector('#rep-clase-pdf')?.addEventListener('click', () => {
    if (!state.dataset) {
      alert('Carga datos de un grupo para generar el reporte.');
      return;
    }
    const reporte = generarReporteClase(state.group);
    if (!reporte) {
      alert('No se pudo generar el reporte de clase.');
      return;
    }
    descargarReporteClasePDF(reporte);
  });
  root.querySelector('#rep-clase-xls')?.addEventListener('click', () => {
    if (!state.dataset) {
      alert('Carga datos de un grupo para generar el reporte.');
      return;
    }
    const reporte = generarReporteClase(state.group);
    if (!reporte) {
      alert('No se pudo generar el reporte de clase.');
      return;
    }
    descargarReporteClaseXLS(reporte);
  });
}

function hydrateGroups(root) {
  const select = root.querySelector('#rep-group');
  if (!select) return;
  const groups = getAvailableGroups();
  if (!groups.length) {
    select.innerHTML = '<option value="">Sin grupos</option>';
    return;
  }
  select.innerHTML = groups.map((g) => `<option value="${g}">${g}</option>`).join('');
}

function getAvailableGroups() {
  const cfg = Storage.get(K.CONFIG, {});
  const fromConfig = Array.isArray(cfg.grupos) ? cfg.grupos.filter(Boolean) : [];
  const stored = new Set(fromConfig);
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith('atemix.gradebook.')) {
      const group = key.replace('atemix.gradebook.', '');
      if (group) stored.add(group);
    }
  }
  return Array.from(stored).sort();
}

function refreshDataset(group, root, options = {}) {
  if (!group) {
    state.dataset = null;
    renderSummary(null, root);
    renderStudents(null, root);
    renderPreview(null, root);
    renderLog(null, root);
    return;
  }
  state.dataset = buildDataset(group, options.force);
  renderSummary(state.dataset, root);
  renderStudents(state.dataset, root);
  renderPreview(state.dataset, root);
  renderLog(state.dataset, root);
}

function buildDataset(group) {
  const raw = Storage.get(K.GBOOK(group));
  if (!raw || !Array.isArray(raw.alumnos) || !Array.isArray(raw.cols)) {
    return null;
  }
  const cfg = Storage.get(K.CONFIG, {});
  const alumnos = raw.alumnos.map((name) => String(name || '').trim());
  const cols = raw.cols.map((col) => ({
    t: col?.t || col?.title || 'Actividad',
    w: Number(col?.w ?? 0),
    crit: col?.crit || '',
    type: col?.type || 'num'
  }));
  const vals = alumnos.map((_, rowIndex) => {
    const row = Array.isArray(raw.vals?.[rowIndex]) ? raw.vals[rowIndex] : [];
    return cols.map((col, colIndex) => {
      const v = row[colIndex];
      if (col.type === 'num') return Number(v ?? 0) || 0;
      if (col.type === 'color') return typeof v === 'string' ? v : '';
      return (v ?? '').toString();
    });
  });

  const promedios = vals.map((row, idx) => computePromedio(row, cols));
  const actividades = computePromedioActividades(vals, cols);
  const insignias = computeInsignias(group, alumnos);

  return {
    info: {
      grupo: group,
      escuela: cfg.escuela || 'Sin escuela',
      docente: cfg.docente || 'Sin docente',
      ciclo: cfg.ciclo || 'Sin ciclo',
      fecha: new Date().toLocaleDateString('es-MX'),
    },
    alumnos,
    cols,
    vals,
    promedios,
    promediosActividad: actividades,
    insigniasPorAlumno: insignias.porAlumno,
    insigniasPorTipo: insignias.porTipo,
    totalInsignias: insignias.total,
  };
}

function computePromedio(row, cols) {
  let suma = 0;
  let pesos = 0;
  cols.forEach((col, index) => {
    if (col.type === 'num') {
      const peso = Number(col.w || 0);
      const valor = Number(row[index] || 0);
      suma += valor * (peso / 100);
      pesos += peso;
    }
  });
  if (!pesos) return 0;
  return (suma / (pesos / 100));
}

function computePromedioActividades(vals, cols) {
  return cols.map((col, colIndex) => {
    if (col.type !== 'num') {
      return { nombre: col.t, peso: col.w || 0, promedio: 0 };
    }
    let suma = 0;
    let count = 0;
    vals.forEach((row) => {
      const valor = Number(row[colIndex] || 0);
      if (!Number.isNaN(valor)) {
        suma += valor;
        count += 1;
      }
    });
    const promedio = count ? suma / count : 0;
    return { nombre: col.t, peso: col.w || 0, promedio };
  });
}

function computeInsignias(group, alumnos) {
  const registros = Storage.get(K.INSIGNIAS(group), []);
  const porAlumno = {};
  const porTipo = {};
  let total = 0;
  alumnos.forEach((nombre) => {
    porAlumno[nombre] = { total: 0, tipos: {} };
  });
  (registros || []).forEach((ins) => {
    const alumno = String(ins?.alumno || '').trim();
    const puntos = Number(ins?.puntos || 0);
    const tipo = String(ins?.tipo || 'general');
    if (!alumno) return;
    if (!porAlumno[alumno]) porAlumno[alumno] = { total: 0, tipos: {} };
    porAlumno[alumno].total += puntos;
    porAlumno[alumno].tipos[tipo] = (porAlumno[alumno].tipos[tipo] || 0) + puntos;
    porTipo[tipo] = (porTipo[tipo] || 0) + puntos;
    total += puntos;
  });
  return { porAlumno, porTipo, total };
}

function renderSummary(dataset, root) {
  const summary = root.querySelector('#rep-summary');
  const flags = root.querySelector('#rep-flags');
  if (!summary) return;
  if (!dataset) {
    summary.innerHTML = '<div class="rep-empty">Sin datos del gradebook. Genera o guarda una clase desde Gradebook.</div>';
    if (flags) flags.textContent = '';
    return;
  }
  const alumnos = dataset.alumnos.length;
  const cols = dataset.cols.filter((c) => c.type === 'num').length;
  const promedioClase = alumnos ? dataset.promedios.reduce((acc, v) => acc + v, 0) / alumnos : 0;
  summary.innerHTML = `
    <ul style="margin:0;padding-left:18px;font-size:13px;">
      <li><strong>Grupo:</strong> ${dataset.info.grupo}</li>
      <li><strong>Alumnos:</strong> ${alumnos}</li>
      <li><strong>Actividades cuantitativas:</strong> ${cols}</li>
      <li><strong>Promedio del grupo:</strong> ${formatNumber(promedioClase)}</li>
      <li><strong>Total insignias:</strong> ${dataset.totalInsignias}</li>
    </ul>
  `;
  if (flags) {
    const issues = [];
    if (!alumnos) issues.push('Sin alumnos cargados');
    if (!cols) issues.push('Sin columnas numericas');
    if (!dataset.totalInsignias) issues.push('No hay insignias registradas');
    flags.textContent = issues.length ? `Pendientes: ${issues.join(' | ')}` : 'Todo listo para exportar.';
  }
}

function renderStudents(dataset, root) {
  const select = root.querySelector('#rep-student');
  const info = root.querySelector('#rep-alumno-info');
  if (!select) return;
  if (!dataset || !dataset.alumnos.length) {
    select.innerHTML = '<option value="">Sin alumnos</option>';
    if (info) info.textContent = '';
    return;
  }
  select.innerHTML = dataset.alumnos
    .map((name, index) => `<option value="${index}">${name}</option>`)
    .join('');
  if (info) info.textContent = 'Selecciona un alumno y elige PDF o XLS.';
}

function renderPreview(dataset, root) {
  const container = root.querySelector('#rep-preview');
  if (!container) return;
  if (!dataset || !dataset.alumnos.length) {
    container.innerHTML = '<div class="rep-empty">Previa vacia. Cuando tengas datos guardados en Gradebook los veras aqui.</div>';
    return;
  }
  const rows = dataset.alumnos.map((nombre, idx) => {
    const promedio = formatNumber(dataset.promedios[idx] || 0);
    const insignias = dataset.insigniasPorAlumno[nombre]?.total || 0;
    return `<tr><td>${nombre}</td><td>${promedio}</td><td>${insignias}</td></tr>`;
  }).join('');
  container.innerHTML = `
    <table>
      <thead><tr><th>Alumno</th><th>Promedio</th><th>Insignias</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderLog(dataset, root) {
  const list = root.querySelector('#rep-log');
  if (!list) return;
  const grupo = dataset?.info?.grupo || state.group || '';
  const logs = grupo ? getLogs(grupo) : [];
  if (!logs || !logs.length) {
    list.innerHTML = '<li>Sin eventos recientes.</li>';
    return;
  }
  list.innerHTML = logs.slice(0, 12).map((entry) => {
    const fecha = new Date(entry.ts || Date.now());
    const hora = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    return `<li>[${hora}] ${entry.action || 'evento'} - ${entry.result || ''}</li>`;
  }).join('');
}

function formatNumber(value) {
  return Number(value || 0).toFixed(2);
}

export function generarReporteAlumno({ grupo, alumno_index }) {
  const dataset = buildDataset(grupo);
  if (!dataset) return null;
  const nombre = dataset.alumnos[alumno_index];
  if (!nombre) return null;
  const info = {
    nombre,
    grupo: dataset.info.grupo,
    escuela: dataset.info.escuela,
    docente: dataset.info.docente,
    ciclo: dataset.info.ciclo,
    fecha: new Date().toLocaleDateString('es-MX'),
  };
  const calificaciones = dataset.cols.map((col, colIndex) => {
    const valor = dataset.vals[alumno_index]?.[colIndex];
    return {
      actividad: col.t,
      tipo: col.type,
      criterio: col.crit || '',
      peso: col.type === 'num' ? Number(col.w || 0) : '',
      calificacion: col.type === 'num' ? Number(valor || 0) : undefined,
      valor: col.type !== 'num' ? valor : undefined,
    };
  });
  const insigniasDetalle = dataset.insigniasPorAlumno[nombre] || { total: 0, tipos: {} };
  const insignias = { ...insigniasDetalle.tipos, total: insigniasDetalle.total };
  return {
    info,
    calificaciones,
    promedioGeneral: dataset.promedios[alumno_index] || 0,
    rubricas: [],
    insignias,
  };
}

export function generarReporteClase(grupo) {
  const dataset = buildDataset(grupo);
  if (!dataset) return null;
  const alumnos = dataset.alumnos.map((nombre, idx) => ({
    nombre,
    promedio: dataset.promedios[idx] || 0,
    insigniasTotal: dataset.insigniasPorAlumno[nombre]?.total || 0,
  }));
  const promedioClase = alumnos.length
    ? alumnos.reduce((acc, item) => acc + (item.promedio || 0), 0) / alumnos.length
    : 0;
  return {
    info: dataset.info,
    alumnos,
    promedioClase,
    promediosActividad: dataset.promediosActividad,
    insigniasPorTipo: dataset.insigniasPorTipo,
    totalInsignias: dataset.totalInsignias,
  };
}

export function descargarReporteAlumnoPDF(reporte) {
  if (!reporte) return;
  const title = `Reporte alumno - ${reporte.info?.nombre || ''}`;
  const lines = buildAlumnoPdfLines(reporte);
  downloadPdf(`reporte_${sanitizeFileName(reporte.info?.nombre || 'alumno')}.pdf`, title, lines);
}

export function descargarReporteAlumnoXLS(reporte) {
  descargarAlumnoXLS(reporte);
}

export function descargarReporteClasePDF(reporte) {
  if (!reporte) return;
  const title = `Reporte clase - ${reporte.info?.grupo || ''}`;
  const lines = buildClasePdfLines(reporte);
  downloadPdf(`reporte_clase_${sanitizeFileName(reporte.info?.grupo || 'grupo')}.pdf`, title, lines);
}

export function descargarReporteClaseXLS(reporte) {
  descargarClaseXLS(reporte);
}

export function imprimirReporteAlumno({ grupo, alumno_index }) {
  const reporte = generarReporteAlumno({ grupo, alumno_index });
  if (!reporte) {
    alert('No se encontro informacion para imprimir.');
    return;
  }
  const container = document.createElement('div');
  container.id = 'print-container';
  container.innerHTML = buildAlumnoPrintHtml(reporte);
  document.body.appendChild(container);
  window.print();
  document.body.removeChild(container);
}

function buildAlumnoPdfLines(reporte) {
  const lines = [];
  lines.push(`Nombre: ${reporte.info?.nombre || ''}`);
  lines.push(`Grupo: ${reporte.info?.grupo || ''}`);
  lines.push(`Docente: ${reporte.info?.docente || ''}`);
  lines.push(`Escuela: ${reporte.info?.escuela || ''}`);
  lines.push(`Ciclo: ${reporte.info?.ciclo || ''}`);
  lines.push(`Fecha: ${reporte.info?.fecha || ''}`);
  lines.push(`Promedio general: ${formatNumber(reporte.promedioGeneral || 0)}`);
  lines.push('');
  lines.push('Calificaciones:');
  (reporte.calificaciones || []).forEach((item) => {
    if (item.tipo === 'num') {
      lines.push(`- ${item.actividad} (${item.peso || 0}%). Valor: ${formatNumber(item.calificacion || 0)}`);
    } else {
      lines.push(`- ${item.actividad} [${item.tipo}] => ${item.valor ?? ''}`);
    }
  });
  lines.push('');
  lines.push('Insignias:');
  const insignias = reporte.insignias || {};
  const tipos = Object.keys(insignias).filter((k) => k !== 'total');
  if (!tipos.length) {
    lines.push('- Sin insignias registradas.');
  } else {
    tipos.forEach((tipo) => {
      lines.push(`- ${tipo}: ${insignias[tipo]}`);
    });
  }
  lines.push(`Total insignias: ${insignias.total || 0}`);
  return lines;
}

function buildClasePdfLines(reporte) {
  const lines = [];
  lines.push(`Grupo: ${reporte.info?.grupo || ''}`);
  lines.push(`Docente: ${reporte.info?.docente || ''}`);
  lines.push(`Escuela: ${reporte.info?.escuela || ''}`);
  lines.push(`Ciclo: ${reporte.info?.ciclo || ''}`);
  lines.push(`Fecha: ${reporte.info?.fecha || ''}`);
  lines.push(`Promedio de la clase: ${formatNumber(reporte.promedioClase || 0)}`);
  lines.push(`Total de alumnos: ${(reporte.alumnos || []).length}`);
  lines.push(`Total insignias: ${reporte.totalInsignias || 0}`);
  lines.push('');
  lines.push('Promedio por alumno:');
  (reporte.alumnos || []).forEach((alumno) => {
    lines.push(`- ${alumno.nombre}: Promedio ${formatNumber(alumno.promedio || 0)} | Insignias ${alumno.insigniasTotal || 0}`);
  });
  lines.push('');
  lines.push('Promedio por actividad:');
  (reporte.promediosActividad || []).forEach((item) => {
    lines.push(`- ${item.nombre} (${item.peso || 0}%): ${formatNumber(item.promedio || 0)}`);
  });
  lines.push('');
  lines.push('Insignias por tipo:');
  const porTipo = reporte.insigniasPorTipo || {};
  if (!Object.keys(porTipo).length) {
    lines.push('- Sin insignias registradas.');
  } else {
    Object.keys(porTipo).forEach((tipo) => {
      lines.push(`- ${tipo}: ${porTipo[tipo]}`);
    });
  }
  return lines;
}

function buildAlumnoPrintHtml(reporte) {
  const calRows = (reporte.calificaciones || []).map((item) => {
    const valor = item.tipo === 'num'
      ? formatNumber(item.calificacion || 0)
      : (item.valor ?? '');
    const peso = item.tipo === 'num' ? `${item.peso || 0}%` : '-';
    return `<tr><td>${item.actividad}</td><td>${item.tipo}</td><td>${peso}</td><td>${valor}</td></tr>`;
  }).join('');
  const insigniasRows = Object.entries(reporte.insignias || {})
    .filter(([k]) => k !== 'total')
    .map(([tipo, puntos]) => `<li>${tipo}: ${puntos}</li>`)
    .join('');
  const totalIns = reporte.insignias?.total || 0;
  return `
    <div class="report-page" style="font-family:Inter,Arial,sans-serif;padding:24px;color:#0f172a;">
      <header style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div>
          <h1 style="margin:0;font-size:24px;">Reporte de progreso</h1>
          <p style="margin:4px 0 0;font-size:13px;">${reporte.info.nombre} · Grupo ${reporte.info.grupo}</p>
        </div>
      </header>
      <section style="margin-bottom:16px;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tbody>
            <tr><th style="text-align:left;padding:6px 8px;border:1px solid #cbd5f5;">Escuela</th><td style="padding:6px 8px;border:1px solid #cbd5f5;">${reporte.info.escuela}</td></tr>
            <tr><th style="text-align:left;padding:6px 8px;border:1px solid #cbd5f5;">Docente</th><td style="padding:6px 8px;border:1px solid #cbd5f5;">${reporte.info.docente}</td></tr>
            <tr><th style="text-align:left;padding:6px 8px;border:1px solid #cbd5f5;">Ciclo</th><td style="padding:6px 8px;border:1px solid #cbd5f5;">${reporte.info.ciclo}</td></tr>
            <tr><th style="text-align:left;padding:6px 8px;border:1px solid #cbd5f5;">Fecha</th><td style="padding:6px 8px;border:1px solid #cbd5f5;">${reporte.info.fecha}</td></tr>
            <tr><th style="text-align:left;padding:6px 8px;border:1px solid #cbd5f5;">Promedio general</th><td style="padding:6px 8px;border:1px solid #cbd5f5;">${formatNumber(reporte.promedioGeneral)}</td></tr>
            <tr><th style="text-align:left;padding:6px 8px;border:1px solid #cbd5f5;">Insignias totales</th><td style="padding:6px 8px;border:1px solid #cbd5f5;">${totalIns}</td></tr>
          </tbody>
        </table>
      </section>
      <section style="margin-bottom:16px;">
        <h2 style="font-size:16px;margin:0 0 8px;">Detalle de calificaciones</h2>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="background:#e2e8f0;">
              <th style="text-align:left;padding:6px 8px;border:1px solid #cbd5f5;">Actividad</th>
              <th style="text-align:left;padding:6px 8px;border:1px solid #cbd5f5;">Tipo</th>
              <th style="text-align:left;padding:6px 8px;border:1px solid #cbd5f5;">Peso</th>
              <th style="text-align:left;padding:6px 8px;border:1px solid #cbd5f5;">Valor</th>
            </tr>
          </thead>
          <tbody>${calRows}</tbody>
        </table>
      </section>
      <section>
        <h2 style="font-size:16px;margin:0 0 8px;">Insignias</h2>
        <ul style="margin:0;padding-left:18px;font-size:12px;">
          ${insigniasRows || '<li>Sin insignias registradas.</li>'}
          <li>Total: ${totalIns}</li>
        </ul>
      </section>
    </div>
  `;
}

function downloadPdf(filename, title, lines) {
  const blob = createPdfBlob(title, lines);
  if (!blob) {
    alert('No se pudo generar el PDF.');
    return;
  }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(link.href);
    link.remove();
  }, 0);
}

function createPdfBlob(title, lines) {
  try {
    const bodyLines = Array.isArray(lines) ? lines : [];
    const commands = [];
    commands.push(`BT /F1 18 Tf 50 770 Td (${escapePdf(title)}) Tj ET`);
    let y = 740;
    bodyLines.forEach((line) => {
      if (y < 60) {
        y = 740;
        commands.push('ET BT');
      }
      commands.push(`BT /F1 12 Tf 50 ${y} Td (${escapePdf(line)}) Tj ET`);
      y -= 18;
    });
    const stream = commands.join('\n');
    const objects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n',
      `4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream\nendobj\n`,
      '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n',
    ];
    const encoder = new TextEncoder();
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    let length = encoder.encode(pdf).length;
    objects.forEach((obj) => {
      offsets.push(length);
      pdf += obj;
      length += encoder.encode(obj).length;
    });
    const xrefOffset = length;
    pdf += 'xref\n0 6\n0000000000 65535 f \n';
    for (let i = 1; i < offsets.length; i += 1) {
      pdf += `${offsets[i].toString().padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return new Blob([pdf], { type: 'application/pdf' });
  } catch (error) {
    console.error('[reportes] PDF generation failed', error);
    return null;
  }
}

function escapePdf(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\r?\n/g, ' ');
}

function sanitizeFileName(name) {
  return String(name || 'reporte').replace(/[^a-zA-Z0-9-_]+/g, '_');
}

export const generarReporteAlumnoJSON = generarReporteAlumno;
