import { Storage, K } from '../services/storage.js';
import { abrirVisor, initVisor } from './visor.js';

const KEY_EXAMS = K.EXAMS || 'atemix.exams';

const state = {
  exams: [],
  currentId: '',
  stream: null,
};

let wired = false;

export function initScanner() {
  const view = document.querySelector('#view-scanner');
  const root = document.querySelector('#scanner-root');
  if (!view || !root) return;

  injectStyles();
  if (root.dataset.ready !== '1') {
    buildStructure(root);
    root.dataset.ready = '1';
  }

  try { initVisor(); } catch (_) { }

  loadExams();
  renderExamList();
  renderEditor();

  if (!wired) {
    wireEvents();
    wired = true;
  }
}
function injectStyles() {
  if (document.getElementById('scanner-styles')) return;
  const style = document.createElement('style');
  style.id = 'scanner-styles';
  style.textContent = `
    .scanner-layout { display:flex; gap:16px; }
    .scanner-list { width:240px; background:var(--panel,rgba(15,23,42,0.45)); border:1px solid var(--stroke,rgba(148,163,184,0.25)); border-radius:16px; padding:14px; display:flex; flex-direction:column; gap:12px; }
    .scanner-list-header { display:flex; justify-content:space-between; align-items:center; }
    .scanner-exams { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:8px; }
    .scanner-exams li { padding:10px; border-radius:12px; border:1px solid transparent; background:rgba(15,23,42,0.35); cursor:pointer; font-size:13px; }
    .scanner-exams li.active { border-color:rgba(14,165,233,0.5); background:rgba(14,165,233,0.15); }
    .scanner-main { flex:1; background:var(--panel,rgba(15,23,42,0.45)); border:1px solid var(--stroke,rgba(148,163,184,0.25)); border-radius:16px; padding:20px; min-height:420px; position:relative; }
    .scanner-empty { opacity:0.75; font-size:14px; text-align:center; margin-top:80px; }
    .scanner-form .row { display:flex; gap:12px; flex-wrap:wrap; }
    .scanner-form label { font-size:12px; opacity:0.75; }
    .scanner-form { display:flex; flex-direction:column; gap:12px; margin-bottom:18px; }
    .scanner-key-actions { display:flex; gap:8px; }
    .scanner-results { display:flex; flex-direction:column; gap:12px; }
    .scanner-results table { width:100%; border-collapse:collapse; font-size:13px; }
    .scanner-results th, .scanner-results td { border-bottom:1px solid rgba(148,163,184,0.2); padding:8px 10px; text-align:left; }
    .scanner-results tbody tr:nth-child(odd) { background:rgba(15,23,42,0.35); }
    .scanner-results-actions { display:flex; gap:8px; flex-wrap:wrap; }
    .scanner-camera { display:flex; flex-direction:column; gap:10px; border:1px dashed rgba(148,163,184,0.35); border-radius:16px; padding:12px; }
    .scanner-camera video, .scanner-camera canvas { width:100%; border-radius:12px; background:#000; }
    .scanner-captures { display:flex; gap:10px; flex-wrap:wrap; }
    .scanner-captures img { width:120px; border-radius:10px; border:1px solid rgba(148,163,184,0.25); cursor:pointer; }
  `;
  document.head.appendChild(style);
}

function buildStructure(root) {
  root.innerHTML = `
    <div class="scanner-layout">
      <aside class="scanner-list">
        <div class="scanner-list-header">
          <h3 style="margin:0;font-size:14px;">Mis exámenes</h3>
          <button id="sc-new" class="btn btn-primary" type="button">Nuevo</button>
        </div>
        <ul id="sc-exam-list" class="scanner-exams"></ul>
      </aside>
      <section class="scanner-main">
        <div id="sc-empty" class="scanner-empty">Selecciona un examen o crea uno nuevo.</div>
        <div id="sc-editor" class="hidden">
          <div class="scanner-form">
            <div class="row">
              <div style="flex:2;min-width:180px;">
                <label for="sc-title">Titulo</label>
                <input id="sc-title" class="input-field" placeholder="Ej. Examen Diagnóstico">
              </div>
              <div>
                <label for="sc-group">Grupo</label>
                <input id="sc-group" class="input-field" placeholder="1A">
              </div>
              <div>
                <label for="sc-questions">Preguntas</label>
                <input id="sc-questions" class="input-field" type="number" min="1" max="200" value="10">
              </div>
              <div>
                <label for="sc-points">Puntos por acierto</label>
                <input id="sc-points" class="input-field" type="number" step="0.1" value="1">
              </div>
              <div>
                <label for="sc-penalty">Penalización error</label>
                <input id="sc-penalty" class="input-field" type="number" step="0.1" value="0">
              </div>
            </div>
            <div>
              <label for="sc-key">Clave de respuestas (una letra por línea)</label>
              <textarea id="sc-key" class="input-field" rows="6" placeholder="A\nB\nC\nD"></textarea>
            </div>
            <div class="scanner-key-actions">
              <button id="sc-save" class="btn btn-primary" type="button">Guardar examen</button>
              <button id="sc-duplicate" class="btn" type="button">Duplicar</button>
              <button id="sc-delete" class="btn" type="button">Eliminar</button>
            </div>
          </div>
          <div class="scanner-results">
            <h3 style="margin:0;">Resultados</h3>
            <div class="row">
              <div style="flex:1;">
                <input id="sc-student" class="input-field" placeholder="Nombre del alumno">
              </div>
              <div style="flex:1;">
                <input id="sc-responses" class="input-field" placeholder="Respuestas (ej. ABCDE)">
              </div>
              <div>
                <button id="sc-add-result" class="btn btn-primary" type="button">Registrar</button>
              </div>
            </div>
            <div class="scanner-results-actions">
              <label class="btn" style="position:relative;overflow:hidden;">
                Importar CSV
                <input id="sc-import" type="file" accept=".csv,text/csv" style="position:absolute;inset:0;opacity:0;cursor:pointer;">
              </label>
              <button id="sc-export-csv" class="btn btn-secondary" type="button">Exportar CSV</button>
              <button id="sc-to-gradebook" class="btn btn-secondary" type="button">Enviar al gradebook</button>
              <button id="sc-camera-btn" class="btn" type="button">Capturar hoja</button>
            </div>
            <div id="sc-camera" class="scanner-camera hidden">
              <video id="sc-video" autoplay playsinline></video>
              <div style="display:flex;gap:8px;">
                <button id="sc-capture" class="btn btn-primary" type="button">Guardar captura</button>
                <button id="sc-camera-close" class="btn" type="button">Cerrar cámara</button>
              </div>
              <div id="sc-captures" class="scanner-captures"></div>
            </div>
            <div id="sc-results-table"></div>
          </div>
        </div>
      </section>
    </div>
  `;
}

function wireEvents() {
  const newBtn = document.getElementById('sc-new');
  const saveBtn = document.getElementById('sc-save');
  const duplicateBtn = document.getElementById('sc-duplicate');
  const deleteBtn = document.getElementById('sc-delete');
  const addResultBtn = document.getElementById('sc-add-result');
  const importInput = document.getElementById('sc-import');
  const exportBtn = document.getElementById('sc-export-csv');
  const gradebookBtn = document.getElementById('sc-to-gradebook');
  const cameraBtn = document.getElementById('sc-camera-btn');
  const captureBtn = document.getElementById('sc-capture');
  const cameraCloseBtn = document.getElementById('sc-camera-close');
  const examList = document.getElementById('sc-exam-list');
  const resultsTable = document.getElementById('sc-results-table');

  newBtn?.addEventListener('click', createExam);
  saveBtn?.addEventListener('click', saveCurrentExam);
  duplicateBtn?.addEventListener('click', duplicateCurrentExam);
  deleteBtn?.addEventListener('click', deleteCurrentExam);
  addResultBtn?.addEventListener('click', appendResult);
  importInput?.addEventListener('change', handleImportCsv);
  exportBtn?.addEventListener('click', exportResultsCsv);
  gradebookBtn?.addEventListener('click', exportResultsToGradebook);
  cameraBtn?.addEventListener('click', toggleCamera);
  captureBtn?.addEventListener('click', captureImage);
  cameraCloseBtn?.addEventListener('click', stopCamera);
  resultsTable?.addEventListener('click', handleResultsClick);

  examList?.addEventListener('click', (event) => {
    const li = event.target.closest('li[data-id]');
    if (!li) return;
    selectExam(li.dataset.id);
  });
}
function loadExams() {
  const stored = Storage.get(KEY_EXAMS, []);
  state.exams = Array.isArray(stored) ? stored.map(normalizeExam).filter(Boolean) : [];
  if (state.exams.length) {
    state.currentId = state.currentId || state.exams[0].id;
  } else {
    state.currentId = '';
  }
}

function saveExams() {
  Storage.set(KEY_EXAMS, state.exams);
}

function normalizeExam(raw) {
  if (!raw) return null;
  const answerKey = Array.isArray(raw.answerKey) ? raw.answerKey : parseAnswerKey(raw.answerKey || '', raw.questions || 0);
  return {
    id: raw.id || `exam-${Math.random().toString(16).slice(2)}`,
    title: raw.title || 'Examen sin titulo',
    group: raw.group || 'GENERAL',
    questions: Number(raw.questions) || answerKey.length || 10,
    points: Number(raw.points) || 1,
    penalty: Number(raw.penalty) || 0,
    answerKey,
    results: Array.isArray(raw.results) ? raw.results.map(normalizeResult).filter(Boolean) : [],
    captures: Array.isArray(raw.captures) ? raw.captures : [],
    createdAt: raw.createdAt || Date.now(),
  };
}

function normalizeResult(raw) {
  if (!raw) return null;
  return {
    id: raw.id || `res-${Math.random().toString(16).slice(2)}`,
    student: raw.student || 'Alumno',
    responses: Array.isArray(raw.responses) ? raw.responses : parseResponses(raw.responses || '', raw.expected || raw.total || 0),
    score: Number(raw.score) || 0,
    correct: Number(raw.correct) || 0,
    incorrect: Number(raw.incorrect) || 0,
    blank: Number(raw.blank) || 0,
    captures: Array.isArray(raw.captures) ? raw.captures : [],
    addedAt: raw.addedAt || Date.now(),
  };
}

function renderExamList() {
  const list = document.getElementById('sc-exam-list');
  if (!list) return;
  if (!state.exams.length) {
    list.innerHTML = '<li style="opacity:0.7;">No hay exámenes guardados.</li>';
    return;
  }
  list.innerHTML = state.exams
    .map((exam) => {
      const avg = exam.results.length ? (exam.results.reduce((acc, r) => acc + (Number(r.score) || 0), 0) / exam.results.length).toFixed(1) : '0.0';
      const active = exam.id === state.currentId ? 'active' : '';
      return `<li data-id="${exam.id}" class="${active}">
        <strong>${escapeHtml(exam.title)}</strong><br>
        <span style="opacity:0.7;font-size:12px;">${exam.results.length} resultados · Promedio ${avg}</span>
      </li>`;
    })
    .join('');
}

function renderEditor() {
  const editor = document.getElementById('sc-editor');
  const empty = document.getElementById('sc-empty');
  const exam = state.exams.find((item) => item.id === state.currentId);
  if (!exam) { stopCamera(); }
  if (!editor || !empty) return;
  if (!exam) {
    editor.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  editor.classList.remove('hidden');

  document.getElementById('sc-title').value = exam.title;
  document.getElementById('sc-group').value = exam.group;
  document.getElementById('sc-questions').value = exam.questions;
  document.getElementById('sc-points').value = exam.points;
  document.getElementById('sc-penalty').value = exam.penalty;
  document.getElementById('sc-key').value = exam.answerKey.join('\n');
  renderResultsTable(exam);
}

function selectExam(id) {
  state.currentId = id;
  renderExamList();
  renderEditor();
}

function createExam() {
  const exam = {
    id: `exam-${Date.now()}`,
    title: 'Nuevo examen',
    group: 'GENERAL',
    questions: 10,
    points: 1,
    penalty: 0,
    answerKey: Array(10).fill('A'),
    results: [],
    captures: [],
    createdAt: Date.now(),
  };
  state.exams.unshift(exam);
  state.currentId = exam.id;
  saveExams();
  renderExamList();
  renderEditor();
  notify('success', 'Examen creado. Configura la clave y comienza a registrar resultados.');
}

function saveCurrentExam() {
  const exam = state.exams.find((item) => item.id === state.currentId);
  if (!exam) return;
  const titleInput = document.getElementById('sc-title');
  const groupInput = document.getElementById('sc-group');
  const questionsInput = document.getElementById('sc-questions');
  const pointsInput = document.getElementById('sc-points');
  const penaltyInput = document.getElementById('sc-penalty');
  const keyInput = document.getElementById('sc-key');

  exam.title = (titleInput?.value || 'Examen sin titulo').trim();
  exam.group = (groupInput?.value || 'GENERAL').trim() || 'GENERAL';
  exam.questions = Math.max(1, Math.min(200, Number(questionsInput?.value) || exam.answerKey.length || 10));
  exam.points = Number(pointsInput?.value) || 1;
  exam.penalty = Number(penaltyInput?.value) || 0;
  exam.answerKey = parseAnswerKey(keyInput?.value || '', exam.questions);

  saveExams();
  renderExamList();
  renderEditor();
  notify('success', 'Examen actualizado.');
}

function duplicateCurrentExam() {
  const exam = state.exams.find((item) => item.id === state.currentId);
  if (!exam) return;
  const copy = JSON.parse(JSON.stringify(exam));
  copy.id = `exam-${Date.now()}`;
  copy.title = `${exam.title} (copia)`;
  copy.createdAt = Date.now();
  copy.results = [];
  copy.captures = [];
  state.exams.unshift(copy);
  state.currentId = copy.id;
  saveExams();
  renderExamList();
  renderEditor();
  notify('info', 'Se creó una copia del examen.');
}

function deleteCurrentExam() {
  if (!state.currentId) return;
  if (typeof window !== 'undefined' && !window.confirm('Eliminar el examen y sus resultados?')) return;
  stopCamera();
  state.exams = state.exams.filter((item) => item.id !== state.currentId);
  state.currentId = state.exams[0]?.id || '';
  saveExams();
  renderExamList();
  renderEditor();
  notify('success', 'Examen eliminado.');
}
function appendResult() {
  const exam = state.exams.find((item) => item.id === state.currentId);
  if (!exam) return;
  const nameInput = document.getElementById('sc-student');
  const responsesInput = document.getElementById('sc-responses');
  const student = (nameInput?.value || '').trim();
  const responsesText = (responsesInput?.value || '').trim();
  if (!student) {
    notify('warn', 'Ingresa el nombre del alumno.');
    return;
  }
  if (!responsesText) {
    notify('warn', 'Ingresa las respuestas (ej. ABCDE).');
    return;
  }
  const responses = parseResponses(responsesText, exam.questions);
  const stats = computeScore(exam, responses);
  const result = {
    id: `res-${Date.now()}`,
    student,
    responses,
    score: stats.score,
    correct: stats.correct,
    incorrect: stats.incorrect,
    blank: stats.blank,
    captures: [],
    addedAt: Date.now(),
  };
  exam.results.push(result);
  saveExams();
  renderExamList();
  renderResultsTable(exam);
  if (nameInput) nameInput.value = '';
  if (responsesInput) responsesInput.value = '';
  notify('success', 'Resultado registrado.');
}

function handleImportCsv(event) {
  const exam = state.exams.find((item) => item.id === state.currentId);
  if (!exam) return;
  const file = event.target?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      importCsvData(String(reader.result || ''), exam);
      notify('success', 'CSV importado.');
    } catch (err) {
      console.error(err);
      notify('error', 'No se pudo procesar el CSV.');
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

function importCsvData(text, exam) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const added = [];
  lines.forEach((line) => {
    const parts = line.split(',');
    if (parts.length < 2) return;
    const student = parts[0].trim();
    const responsesText = parts[1].trim();
    if (!student || !responsesText) return;
    const responses = parseResponses(responsesText, exam.questions);
    const stats = computeScore(exam, responses);
    added.push({
      id: `res-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      student,
      responses,
      score: stats.score,
      correct: stats.correct,
      incorrect: stats.incorrect,
      blank: stats.blank,
      captures: [],
      addedAt: Date.now(),
    });
  });
  if (!added.length) return;
  exam.results = [...exam.results, ...added];
  saveExams();
  renderExamList();
  renderResultsTable(exam);
}

function exportResultsCsv() {
  const exam = state.exams.find((item) => item.id === state.currentId);
  if (!exam || !exam.results.length) {
    notify('warn', 'No hay resultados para exportar.');
    return;
  }
  const header = ['Alumno','Respuestas','Aciertos','Errores','Blancos','Puntaje'];
  const rows = exam.results.map((r) => [
    r.student,
    r.responses.join(''),
    r.correct,
    r.incorrect,
    r.blank,
    r.score.toFixed(2),
  ]);
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${sanitizeFileName(exam.title || 'examen')}.csv`;
  a.click();
}

function exportResultsToGradebook() {
  const exam = state.exams.find((item) => item.id === state.currentId);
  if (!exam || !exam.results.length) {
    notify('warn', 'Registra al menos un resultado antes de exportar.');
    return;
  }
  const group = (exam.group || 'GENERAL').trim() || 'GENERAL';
  const gradebook = Storage.get(K.GBOOK(group), { alumnos: [], cols: [], vals: [] });
  gradebook.alumnos = Array.isArray(gradebook.alumnos) ? gradebook.alumnos : [];
  gradebook.cols = Array.isArray(gradebook.cols) ? gradebook.cols : [];
  gradebook.vals = Array.isArray(gradebook.vals) ? gradebook.vals : [];

  // Ensure all students are present
  exam.results.forEach((result) => {
    const name = result.student;
    if (!gradebook.alumnos.includes(name)) {
      gradebook.alumnos.push(name);
      gradebook.vals.push([]);
    }
  });

  // Create column
  const columnTitle = `${exam.title} (${formatDate(exam.createdAt)})`;
  const column = {
    t: columnTitle,
    w: 100,
    type: 'num',
    crit: 'Autoevaluado',
  };
  gradebook.cols.push(column);
  const colIndex = gradebook.cols.length - 1;

  gradebook.alumnos.forEach((name, index) => {
    gradebook.vals[index] = Array.isArray(gradebook.vals[index]) ? gradebook.vals[index] : [];
    gradebook.vals[index].length = gradebook.cols.length;
    const result = exam.results.find((r) => r.student === name);
    gradebook.vals[index][colIndex] = result ? Number(result.score.toFixed(2)) : 0;
  });

  Storage.set(K.GBOOK(group), gradebook);
  notify('success', `Resultados enviados al gradebook del grupo ${group}.`);
}

function toggleCamera() {
  const exam = state.exams.find((item) => item.id === state.currentId);
  if (!exam) { notify('warn', 'Selecciona un examen antes de usar la cámara.'); return; }
  const camera = document.getElementById('sc-camera');
  if (!camera) return;
  if (!camera.classList.contains('hidden')) {
    stopCamera();
    return;
  }
  camera.classList.remove('hidden');
  if (!navigator.mediaDevices?.getUserMedia) {
    notify('warn', 'Tu navegador no soporta captura con cámara.');
    return;
  }
  navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
    state.stream = stream;
    const video = document.getElementById('sc-video');
    if (video) video.srcObject = stream;
  }).catch((err) => {
    console.error(err);
    notify('error', 'No se pudo acceder a la cámara.');
    stopCamera();
  });
}

function captureImage() {
  const exam = state.exams.find((item) => item.id === state.currentId);
  if (!exam || !state.stream) return;
  const video = document.getElementById('sc-video');
  if (!video) return;
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/png');
  exam.captures.unshift({ id: `cap-${Date.now()}`, dataUrl, addedAt: Date.now() });
  saveExams();
  notify('success', 'Captura guardada.');
}

function stopCamera() {
  const camera = document.getElementById('sc-camera');
  if (camera) camera.classList.add('hidden');
  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
    state.stream = null;
  }
}
function handleResultsClick(event) {
  const exam = state.exams.find((item) => item.id === state.currentId);
  if (!exam) return;
  const actionBtn = event.target.closest('[data-action]');
  if (!actionBtn) return;
  const id = actionBtn.getAttribute('data-id');
  const action = actionBtn.getAttribute('data-action');
  if (!id || !action) return;
  const result = exam.results.find((r) => r.id === id);
  if (!result) return;
  if (action === 'preview') {
    abrirVisor([
      { url: createResultPreview(result), type: 'unknown', label: `${result.student} (${result.score.toFixed(2)})` },
    ], 0);
  }
  if (action === 'delete') {
    if (typeof window !== 'undefined' && !window.confirm('Eliminar resultado?')) return;
    exam.results = exam.results.filter((r) => r.id !== id);
    saveExams();
    renderExamList();
    renderResultsTable(exam);
  }
}

function createResultPreview(result) {
  const answers = result.responses.join(' ');
  const summary = `Alumno: ${result.student}\nPuntaje: ${result.score.toFixed(2)}\nCorrectas: ${result.correct}\nIncorrectas: ${result.incorrect}\nBlancos: ${result.blank}\nRespuestas: ${answers}`;
  return `data:text/plain;charset=utf-8,${encodeURIComponent(summary)}`;
}

function renderCaptures(exam) {
  const container = document.getElementById('sc-captures');
  if (!container) return;
  if (!exam.captures.length) {
    container.innerHTML = '<span style="font-size:12px;opacity:0.7;">Sin capturas.</span>';
    return;
  }
  container.innerHTML = exam.captures.map((cap) => `<img src="${cap.dataUrl}" data-cap="${cap.id}" alt="Captura">`).join('');
  container.querySelectorAll('img').forEach((img) => {
    img.addEventListener('click', () => {
      abrirVisor([{ url: img.src, type: 'image', label: 'Captura' }], 0);
    });
  });
}

function renderResultsTable(exam) {
  const container = document.getElementById('sc-results-table');
  if (!container) return;
  if (!exam.results.length) {
    container.innerHTML = '<div class="scanner-empty" style="margin-top:20px;">Aun no hay resultados registrados.</div>';
    return;
  }
  const rows = exam.results.map((result) => `<tr data-id="${result.id}">
    <td>${escapeHtml(result.student)}</td>
    <td>${result.responses.join('')}</td>
    <td>${result.correct}</td>
    <td>${result.incorrect}</td>
    <td>${result.blank}</td>
    <td>${result.score.toFixed(2)}</td>
    <td style="display:flex;gap:6px;">
      <button type="button" class="btn btn-secondary" data-action="preview" data-id="${result.id}">Ver</button>
      <button type="button" class="btn" data-action="delete" data-id="${result.id}">Eliminar</button>
    </td>
  </tr>`).join('');
  container.innerHTML = `<table>
    <thead><tr><th>Alumno</th><th>Respuestas</th><th>Aciertos</th><th>Errores</th><th>Blancos</th><th>Puntaje</th><th>Acciones</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function computeScore(exam, responses) {
  const answerKey = exam.answerKey;
  const maxQuestions = Math.min(answerKey.length, responses.length);
  let correct = 0;
  let incorrect = 0;
  let blank = 0;
  for (let i = 0; i < maxQuestions; i += 1) {
    const expected = (answerKey[i] || '').toUpperCase();
    const given = (responses[i] || '').toUpperCase();
    if (!given) blank += 1;
    else if (expected === given) correct += 1;
    else incorrect += 1;
  }
  const score = (correct * exam.points) - (incorrect * Math.abs(exam.penalty));
  return { correct, incorrect, blank, score };
}

function parseAnswerKey(text, expected) {
  const lines = text.split(/\r?\n|\s+/).map((item) => item.trim().toUpperCase()).filter(Boolean);
  if (expected && lines.length < expected) {
    while (lines.length < expected) lines.push('A');
  }
  return lines;
}

function parseResponses(text, expected) {
  const sanitized = text.replace(/[^A-Za-z]/g, '').toUpperCase();
  const arr = sanitized.split('');
  if (expected && arr.length < expected) {
    while (arr.length < expected) arr.push('');
  }
  return arr;
}


function sanitizeFileName(name) {
  return String(name || 'archivo').replace(/[^a-z0-9\-_\.]+/gi, '_');
}

function formatDate(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleDateString('es-MX', { dateStyle: 'medium' });
  } catch (_) {
    return '';
  }
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function notify(type, message) {
  try {
    import('./ui.js').then((mod) => {
      if (mod?.notify) mod.notify(type, message); else fallbackNotify(type, message);
    }).catch(() => fallbackNotify(type, message));
  } catch (err) {
    fallbackNotify(type, message);
  }
}

function fallbackNotify(type, message) {
  if (typeof window !== 'undefined' && (type === 'warn' || type === 'error')) window.alert?.(message);
  else console.log(`[scanner][${type}] ${message}`);
}

export { parseAnswerKey, parseResponses, computeScore };
