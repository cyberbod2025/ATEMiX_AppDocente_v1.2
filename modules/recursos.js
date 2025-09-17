import { Storage, K } from '../services/storage.js';
import { initVisor, abrirVisor } from './visor.js';

const KEY_RESOURCES = K.RESOURCES || 'atemix.recursos';
const KEY_VIEW_PREF = 'atemix.recursos.view';

const state = {
  resources: [],
  filter: '',
  view: 'grid',
};

let wired = false;

export function initRecursos() {
  const view = document.querySelector('#view-recursos');
  const root = document.querySelector('#recursos-root');
  if (!view || !root) return;

  injectStyles();
  if (root.dataset.ready !== '1') {
    buildStructure(root);
    root.dataset.ready = '1';
  }

  try { initVisor(); } catch (_) { }

  loadResources();
  renderResources();

  if (!wired) {
    wireEvents();
    wired = true;
  }
}
function injectStyles() {
  if (document.getElementById('recursos-styles')) return;
  const style = document.createElement('style');
  style.id = 'recursos-styles';
  style.textContent = `
    .recursos-toolbar { display:grid; gap:16px; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); margin-bottom:16px; }
    .recursos-card { background:var(--panel,rgba(15,23,42,0.45)); border:1px solid var(--stroke,rgba(148,163,184,0.25)); border-radius:14px; padding:14px; display:flex; flex-direction:column; gap:8px; }
    .recursos-card h3 { margin:0; font-size:14px; font-weight:600; }
    .recursos-card small { font-size:11px; opacity:0.7; }
    .recursos-drop { border:2px dashed rgba(148,163,184,0.35); border-radius:16px; padding:18px; text-align:center; font-size:13px; opacity:0.75; transition:background 0.2s,border-color 0.2s; margin-bottom:18px; }
    .recursos-drop.is-active { background:rgba(14,165,120,0.12); border-color:rgba(14,165,120,0.45); opacity:1; }
    .recursos-grid { display:grid; gap:16px; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); }
    .recursos-list { overflow:auto; border:1px solid var(--stroke,rgba(148,163,184,0.25)); border-radius:16px; }
    .recursos-list table { width:100%; border-collapse:collapse; }
    .recursos-list th, .recursos-list td { padding:10px 12px; border-bottom:1px solid rgba(148,163,184,0.18); text-align:left; font-size:13px; }
    .recurso-card { display:flex; gap:12px; background:var(--panel,rgba(15,23,42,0.45)); border:1px solid var(--stroke,rgba(148,163,184,0.2)); border-radius:16px; padding:14px; align-items:flex-start; }
    .recurso-thumb { width:52px; height:52px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-weight:600; font-size:12px; background:rgba(14,165,233,0.18); border:1px solid rgba(14,165,233,0.35); }
    .recurso-thumb.pdf { background:rgba(239,68,68,0.18); border-color:rgba(239,68,68,0.35); }
    .recurso-thumb.image { background:rgba(16,185,129,0.18); border-color:rgba(16,185,129,0.35); }
    .recurso-thumb.audio { background:rgba(217,119,6,0.18); border-color:rgba(217,119,6,0.35); }
    .recurso-thumb.video { background:rgba(139,92,246,0.18); border-color:rgba(139,92,246,0.35); }
    .recurso-info { flex:1; display:flex; flex-direction:column; gap:6px; }
    .recurso-info h3 { margin:0; font-size:15px; }
    .recurso-meta { font-size:12px; opacity:0.75; }
    .recurso-tags { display:flex; flex-wrap:wrap; gap:6px; }
    .recurso-tags span { font-size:11px; padding:2px 6px; border-radius:999px; background:rgba(148,163,184,0.18); }
    .recurso-actions { display:flex; flex-wrap:wrap; gap:8px; }
    .recursos-empty { padding:24px; text-align:center; border:1px dashed rgba(148,163,184,0.35); border-radius:16px; opacity:0.75; }
  `;
  document.head.appendChild(style);
}

function buildStructure(root) {
  root.innerHTML = `
    <div class="recursos-toolbar">
      <section class="recursos-card">
        <h3>Agregar archivos</h3>
        <p style="font-size:12px;opacity:0.75;">Selecciona uno o varios archivos (pdf, imagen, audio o video).</p>
        <input id="res-file" type="file" multiple accept="application/pdf,image/*,audio/*,video/*" class="input-field">
        <input id="res-file-tags" class="input-field" placeholder="Etiquetas (separadas por coma)">
        <small>Los archivos se almacenan localmente (limite recomendado 4 MB por archivo).</small>
      </section>
      <section class="recursos-card">
        <h3>Guardar enlace</h3>
        <input id="res-link-title" class="input-field" placeholder="Titulo del recurso">
        <input id="res-link-url" class="input-field" placeholder="https://...">
        <input id="res-link-tags" class="input-field" placeholder="Etiquetas (separadas por coma)">
        <button id="res-add-link" class="btn btn-secondary" type="button">Guardar enlace</button>
      </section>
      <section class="recursos-card">
        <h3>Buscar y vista</h3>
        <input id="res-search" class="input-field" placeholder="Buscar por titulo, tipo o etiqueta">
        <select id="res-view" class="select-field">
          <option value="grid">Tarjetas</option>
          <option value="list">Lista</option>
        </select>
        <button id="res-load-demo" class="btn" type="button">Cargar demo</button>
      </section>
    </div>
    <div id="res-dropzone" class="recursos-drop">Suelta archivos aquí o usa los botones anteriores.</div>
    <div id="res-stats" style="font-size:12px;opacity:0.7;margin-bottom:6px;"></div>
    <div id="recursos-list" class="recursos-grid"></div>
  `;
}

function wireEvents() {
  const fileInput = document.getElementById('res-file');
  const fileTags = document.getElementById('res-file-tags');
  const linkTitle = document.getElementById('res-link-title');
  const linkUrl = document.getElementById('res-link-url');
  const linkTags = document.getElementById('res-link-tags');
  const addLinkBtn = document.getElementById('res-add-link');
  const searchInput = document.getElementById('res-search');
  const viewSelect = document.getElementById('res-view');
  const dropzone = document.getElementById('res-dropzone');
  const demoBtn = document.getElementById('res-load-demo');
  const list = document.getElementById('recursos-list');

  fileInput?.addEventListener('change', async () => {
    if (!fileInput.files || !fileInput.files.length) return;
    await addFiles(fileInput.files, fileTags?.value || '');
    fileInput.value = '';
  });

  addLinkBtn?.addEventListener('click', () => {
    handleLinkSave(linkTitle, linkUrl, linkTags);
  });

  searchInput?.addEventListener('input', (e) => {
    state.filter = String(e.target.value || '').trim().toLowerCase();
    renderResources();
  });

  viewSelect?.addEventListener('change', (e) => {
    const value = String(e.target.value);
    state.view = value === 'list' ? 'list' : 'grid';
    Storage.set(KEY_VIEW_PREF, state.view);
    renderResources();
  });

  demoBtn?.addEventListener('click', () => {
    loadDemoResources();
  });

  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('is-active');
    });
    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('is-active');
    });
    dropzone.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropzone.classList.remove('is-active');
      const files = e.dataTransfer?.files;
      if (files && files.length) {
        await addFiles(files, fileTags?.value || '');
      }
    });
  }

  list?.addEventListener('click', (e) => {
    const actionBtn = e.target.closest('[data-action]');
    if (!actionBtn) return;
    const id = actionBtn.getAttribute('data-id');
    const action = actionBtn.getAttribute('data-action');
    if (!id || !action) return;
    if (action === 'preview') openResource(id);
    if (action === 'download') downloadResource(id);
    if (action === 'delete') deleteResource(id);
  });
}
function loadResources() {
  const stored = Storage.get(KEY_RESOURCES, []);
  state.resources = Array.isArray(stored) ? stored.map(normalizeResource).filter(Boolean) : [];
  const savedView = Storage.get(KEY_VIEW_PREF, state.view);
  state.view = savedView === 'list' ? 'list' : 'grid';
  const viewSelect = document.getElementById('res-view');
  if (viewSelect) viewSelect.value = state.view;
}

function normalizeResource(raw) {
  if (!raw) return null;
  const id = raw.id || `res-${Math.random().toString(16).slice(2)}`;
  const tags = Array.isArray(raw.tags) ? raw.tags : parseTags(raw.tags || '');
  const source = raw.src || raw.url;
  if (!source) return null;
  return {
    id,
    title: raw.title || raw.name || 'Recurso',
    type: raw.type || detectType(raw.mime, raw.originalName || source),
    mime: raw.mime || '',
    size: Number(raw.size) || 0,
    src: source,
    kind: raw.kind || (source.startsWith('data:') ? 'file' : 'link'),
    originalName: raw.originalName || raw.name || '',
    tags,
    addedAt: raw.addedAt || Date.now(),
  };
}

function saveResources() {
  Storage.set(KEY_RESOURCES, state.resources);
}

function renderResources() {
  const list = document.getElementById('recursos-list');
  const stats = document.getElementById('res-stats');
  if (!list) return;
  const filtered = state.resources.filter(matchesFilter);
  if (stats) {
    const total = state.resources.length;
    stats.textContent = total ? `${total} recurso(s) almacenado(s)` : 'Sin recursos guardados.';
  }
  if (!filtered.length) {
    list.className = 'recursos-grid';
    list.innerHTML = '<div class="recursos-empty">Aun no hay recursos. Sube un archivo o guarda un enlace.</div>';
    return;
  }
  if (state.view === 'list') {
    list.className = 'recursos-list';
    list.innerHTML = renderListView(filtered);
  } else {
    list.className = 'recursos-grid';
    list.innerHTML = filtered.map(renderCard).join('');
  }
}

function matchesFilter(resource) {
  if (!state.filter) return true;
  const haystack = `${resource.title} ${resource.type} ${(resource.tags || []).join(' ')}`.toLowerCase();
  return haystack.includes(state.filter);
}

function renderCard(resource) {
  const badge = typeBadge(resource.type);
  const tags = (resource.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
  return `
    <article class="recurso-card" data-id="${resource.id}">
      <div class="recurso-thumb ${resource.type}">${badge}</div>
      <div class="recurso-info">
        <h3>${escapeHtml(resource.title)}</h3>
        <p class="recurso-meta">${typeLabel(resource.type)} - ${formatBytes(resource.size)} - ${formatDate(resource.addedAt)}</p>
        ${tags ? `<div class="recurso-tags">${tags}</div>` : ''}
        <div class="recurso-actions">
          <button type="button" class="btn btn-primary" data-action="preview" data-id="${resource.id}">Abrir</button>
          <button type="button" class="btn btn-secondary" data-action="download" data-id="${resource.id}">Descargar</button>
          <button type="button" class="btn" data-action="delete" data-id="${resource.id}">Eliminar</button>
        </div>
      </div>
    </article>`;
}

function renderListView(resources) {
  const rows = resources.map((resource) => {
    const tags = (resource.tags || []).join(', ');
    return `<tr data-id="${resource.id}">
      <td>${escapeHtml(resource.title)}</td>
      <td>${typeLabel(resource.type)}</td>
      <td>${formatBytes(resource.size)}</td>
      <td>${formatDate(resource.addedAt)}</td>
      <td>${escapeHtml(tags)}</td>
      <td style="display:flex;gap:8px;">
        <button type="button" class="btn btn-primary" data-action="preview" data-id="${resource.id}">Abrir</button>
        <button type="button" class="btn" data-action="download" data-id="${resource.id}">Descargar</button>
        <button type="button" class="btn" data-action="delete" data-id="${resource.id}">Eliminar</button>
      </td>
    </tr>`;
  }).join('');
  return `<table>
    <thead>
      <tr><th>Titulo</th><th>Tipo</th><th>Tamaño</th><th>Agregado</th><th>Etiquetas</th><th>Acciones</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}
function typeBadge(type) {
  switch (type) {
    case 'pdf': return 'PDF';
    case 'image': return 'IMG';
    case 'audio': return 'AUD';
    case 'video': return 'VID';
    case 'link': return 'URL';
    default: return 'DOC';
  }
}

function typeLabel(type) {
  const map = {
    pdf: 'PDF',
    image: 'Imagen',
    audio: 'Audio',
    video: 'Video',
    link: 'Enlace',
    document: 'Documento',
  };
  return map[type] || 'Recurso';
}

function openResource(id) {
  const resource = state.resources.find((item) => item.id === id);
  if (!resource) return;
  const previewable = ['pdf', 'image', 'audio', 'video'];
  if (!previewable.includes(resource.type) && resource.kind === 'link') {
    window.open(resource.src, '_blank');
    return;
  }
  try {
    abrirVisor([
      { url: resource.src, type: mapViewerType(resource.type), label: resource.title },
    ], 0);
  } catch (err) {
    window.open(resource.src, '_blank');
  }
}

function mapViewerType(type) {
  if (['pdf', 'image', 'audio', 'video'].includes(type)) return type;
  return 'unknown';
}

function downloadResource(id) {
  const resource = state.resources.find((item) => item.id === id);
  if (!resource) return;
  if (resource.kind === 'link') {
    window.open(resource.src, '_blank');
    return;
  }
  const link = document.createElement('a');
  link.href = resource.src;
  const ext = extensionFromType(resource);
  link.download = resource.originalName || `${resource.title}.${ext}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function extensionFromType(resource) {
  if (resource.originalName && resource.originalName.includes('.')) {
    return resource.originalName.split('.').pop();
  }
  const map = { pdf: 'pdf', image: 'png', audio: 'mp3', video: 'mp4' };
  return map[resource.type] || 'dat';
}

function deleteResource(id) {
  const idx = state.resources.findIndex((item) => item.id === id);
  if (idx === -1) return;
  if (typeof window !== 'undefined' && !window.confirm('Eliminar este recurso?')) return;
  state.resources.splice(idx, 1);
  saveResources();
  renderResources();
  notify('success', 'Recurso eliminado.');
}

async function addFiles(fileList, tagsText) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  const tags = parseTags(tagsText);
  const added = [];
  for (const file of files) {
    const dataUrl = await readFileAsDataURL(file);
    added.push({
      id: `res-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title: file.name.replace(/\.[^.]+$/, ''),
      originalName: file.name,
      type: detectType(file.type, file.name),
      mime: file.type || '',
      size: file.size || 0,
      src: dataUrl,
      kind: 'file',
      tags: [...tags],
      addedAt: Date.now(),
    });
  }
  state.resources = [...added, ...state.resources];
  saveResources();
  renderResources();
  notify('success', `${added.length} recurso(s) añadido(s).`);
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function handleLinkSave(titleInput, urlInput, tagsInput) {
  const url = (urlInput?.value || '').trim();
  if (!url) {
    notify('warn', 'Ingresa una URL valida.');
    return;
  }
  const normalizedUrl = /^https?:/i.test(url) ? url : `https://${url}`;
  const title = (titleInput?.value || '').trim() || normalizedUrl;
  const tags = parseTags(tagsInput?.value || '');
  const resource = {
    id: `res-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    type: detectType('', normalizedUrl),
    mime: '',
    size: 0,
    src: normalizedUrl,
    kind: 'link',
    tags,
    addedAt: Date.now(),
  };
  state.resources = [resource, ...state.resources];
  saveResources();
  renderResources();
  notify('success', 'Enlace guardado.');
  if (titleInput) titleInput.value = '';
  if (urlInput) urlInput.value = '';
  if (tagsInput) tagsInput.value = '';
}

function loadDemoResources() {
  const samples = [
    {
      title: 'Guía NEM PDF',
      type: 'pdf',
      src: 'https://www.africau.edu/images/default/sample.pdf',
      kind: 'link',
      tags: ['demo', 'pdf'],
      addedAt: Date.now(),
      size: 0,
      mime: 'application/pdf',
      id: `res-demo-${Math.random().toString(16).slice(2)}`,
    },
    {
      title: 'Infografía convivencia',
      type: 'image',
      src: 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&w=800&q=60',
      kind: 'link',
      tags: ['demo', 'imagen'],
      addedAt: Date.now(),
      size: 0,
      mime: 'image/jpeg',
      id: `res-demo-${Math.random().toString(16).slice(2)}`,
    },
  ];
  state.resources = [...samples, ...state.resources];
  saveResources();
  renderResources();
  notify('info', 'Recursos de ejemplo cargados.');
}

function detectType(mime, nameOrUrl) {
  const lowerMime = (mime || '').toLowerCase();
  if (lowerMime.startsWith('image/')) return 'image';
  if (lowerMime.startsWith('video/')) return 'video';
  if (lowerMime.startsWith('audio/')) return 'audio';
  if (lowerMime === 'application/pdf') return 'pdf';
  const name = (nameOrUrl || '').split('?')[0];
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return 'image';
  if (['mp4','webm','mkv','mov'].includes(ext)) return 'video';
  if (['mp3','wav','ogg','m4a'].includes(ext)) return 'audio';
  if (ext === 'pdf') return 'pdf';
  if (!ext && /^https?:/i.test(name)) return 'link';
  return 'document';
}

function parseTags(text) {
  return (text || '')
    .split(/[,;\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function formatBytes(size) {
  const bytes = Number(size) || 0;
  if (bytes <= 0) return '—';
  const units = ['B','KB','MB','GB'];
  let unitIndex = 0;
  let value = bytes;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDate(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleDateString('es-MX', { dateStyle: 'medium' });
  } catch (_err) {
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
  else console.log(`[recursos][${type}] ${message}`);
}




export { detectType, parseTags, formatBytes };
