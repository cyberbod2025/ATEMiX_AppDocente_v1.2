// AtemiMX – Catálogo/Visor enriquecido (v2)
import { Storage, K, withSync, Sync } from '../services/storage.js';
import { showBanner } from './ui.js';

const CACHE_KEY = 'atemix.catalogo.v1';
const state = {
  data: null,
  fase: '',
  campo: '',
  grado: '',
  search: '',
  etiqueta: '',
  orden: 'default',
  selected: new Set(),
  detalle: null,
  tags: [],
  filtered: [],
};

export async function initCatalogo() {
  const $ = (q) => document.querySelector(q);
  const faseSel = $('#cat-fase');
  const campoSel = $('#cat-campo');
  const gradoSel = $('#cat-grado');
  const lista = $('#cat-lista');
  const btnAdd = $('#cat-add');
  const searchInput = $('#cat-search');
  const tagSelect = $('#cat-etiqueta');
  const orderSelect = $('#cat-orden');
  const detalle = $('#cat-detalle');

  await loadCatalogData();
  if (!state.data) return;

  hydrateSelectors();
  renderTags();
  renderLista();

  faseSel?.addEventListener('change', () => {
    state.fase = faseSel.value;
    state.campo = '';
    state.grado = '';
    state.selected.clear();
    hydrateCampos();
    renderLista();
  });

  campoSel?.addEventListener('change', () => {
    state.campo = campoSel.value;
    state.grado = '';
    state.selected.clear();
    hydrateGrados();
    renderLista();
  });

  gradoSel?.addEventListener('change', () => {
    state.grado = gradoSel.value;
    state.selected.clear();
    renderLista();
  });

  searchInput?.addEventListener('input', (e) => {
    state.search = (e.target.value || '').toLowerCase();
    renderLista();
  });

  tagSelect?.addEventListener('change', (e) => {
    state.etiqueta = e.target.value || '';
    renderLista();
  });

  orderSelect?.addEventListener('change', (e) => {
    state.orden = e.target.value || 'default';
    renderLista();
  });

  lista?.addEventListener('click', (ev) => {
    const item = ev.target.closest('.cat-item');
    if (!item) return;
    const id = item.getAttribute('data-id');
    if (!id) return;
    if (state.selected.has(id)) {
      state.selected.delete(id);
      item.classList.remove('selected');
    } else {
      state.selected.add(id);
      item.classList.add('selected');
    }
    const contenido = state.filtered.find((ct) => ct.id === id);
    if (contenido) {
      state.detalle = contenido;
      renderDetalle(detalle, contenido);
    }
    toggleAddButton(btnAdd);
  });

  btnAdd?.addEventListener('click', () => {
    if (!state.selected.size) {
      alert('Selecciona al menos un contenido.');
      return;
    }
    const cfg = Storage.get(K.CONFIG) || {};
    const planKey = K.PLAN(cfg.ciclo || '');
    const plan = Storage.get(planKey, {
      ciclo: cfg.ciclo || '',
      periodicidad: 'quincenal',
      unidades: [],
    });
    const nuevaUnidad = {
      id: `U${plan.unidades.length + 1}`,
      campo: state.campo,
      grado: parseInt(state.grado, 10),
      contenidos_ids: Array.from(state.selected),
      actividades: [],
      evaluacion: { tipo: 'formativa', instrumentos: ['rúbrica'] },
    };
    plan.unidades.push(nuevaUnidad);
    withSync(planKey, plan);
    alert('Añadido a Planeación.');
    state.selected.clear();
    renderLista();
    toggleAddButton(btnAdd);
  });

  toggleAddButton(btnAdd);
  renderDetalle(detalle, state.detalle || state.filtered[0] || null);
}

async function loadCatalogData() {
  let data = Storage.get(CACHE_KEY);
  if (!data) {
    data = await fetchLocalCatalog();
    if (data) Storage.set(CACHE_KEY, data);
  }
  if (!data) {
    alert('No se pudo cargar el Catálogo NEM. Revisa tu conexión.');
    return;
  }
  state.data = data;
  try {
    const cfg = Sync?.getConfig?.();
    const endpoint = cfg?.endpoints?.catalog;
    if (endpoint && typeof fetch === 'function') {
      const url = `${endpoint}${endpoint.includes('?') ? '&' : '?'}version=${encodeURIComponent(data.version || 'local')}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const remote = await res.json();
        if (remote && Object.keys(remote?.fases || {}).length) {
          const changed = JSON.stringify(remote) !== JSON.stringify(data);
          if (changed) {
            state.data = remote;
            withSync(CACHE_KEY, remote, { delay: 0 });
          }
        }
      }
    }
  } catch (err) {
    console.warn('[catalogo] sync remoto omitido', err);
  }
  buildTags();
}

async function fetchLocalCatalog() {
  try {
    const resp = await fetch('data/catalogo_nem_v1.json');
    if (!resp.ok) throw new Error(String(resp.status));
    return await resp.json();
  } catch (error) {
    console.error('[catalogo] fetch fallback', error);
    return null;
  }
}

function hydrateSelectors() {
  const fases = Object.keys(state.data?.fases || {}).sort();
  const faseSel = document.getElementById('cat-fase');
  if (faseSel) {
    faseSel.innerHTML = '<option value="">Fase.</option>' + fases.map((f) => `<option value="${f}">${f}</option>`).join('');
    if (state.fase && fases.includes(state.fase)) faseSel.value = state.fase;
  }
  hydrateCampos();
  hydrateGrados();
  try {
    if (!state.fase) showBanner('Selecciona Fase, Campo y Grado para continuar', 'info');
  } catch (_) {}
}

function hydrateCampos() {
  const campoSel = document.getElementById('cat-campo');
  if (!campoSel) return;
  if (!state.fase) {
    campoSel.innerHTML = '<option value="">Campo.</option>';
    return;
  }
  const campos = Object.keys(state.data?.fases?.[state.fase]?.campos || {});
  campoSel.innerHTML = '<option value="">Campo.</option>' + campos.map((c) => `<option>${c}</option>`).join('');
  if (state.campo && campos.includes(state.campo)) campoSel.value = state.campo;
}

function hydrateGrados() {
  const gradoSel = document.getElementById('cat-grado');
  if (!gradoSel) return;
  if (!state.fase || !state.campo) {
    gradoSel.innerHTML = '<option value="">Grado.</option>';
    return;
  }
  const grados = Object.keys(state.data?.fases?.[state.fase]?.campos?.[state.campo]?.grados || {});
  gradoSel.innerHTML = '<option value="">Grado.</option>' + grados.map((g) => `<option>${g}</option>`).join('');
  if (state.grado && grados.includes(state.grado)) gradoSel.value = state.grado;
}

function buildTags() {
  const tags = new Set();
  const fases = state.data?.fases || {};
  Object.values(fases).forEach((fase) => {
    Object.values(fase.campos || {}).forEach((campo) => {
      Object.values(campo.grados || {}).forEach((grado) => {
        (grado.contenidos || []).forEach((ct) => {
          (ct.etiquetas || ct.tags || []).forEach((tag) => tags.add(tag));
          (ct.pda || []).forEach((tag) => tags.add(tag));
          if (campo.nombre) tags.add(campo.nombre);
        });
      });
    });
  });
  state.tags = Array.from(tags).filter(Boolean).sort((a, b) => a.localeCompare(b, 'es'));
}

function renderTags() {
  const tagSelect = document.getElementById('cat-etiqueta');
  if (!tagSelect) return;
  const options = ['<option value="">Todas</option>'].concat(state.tags.map((tag) => `<option value="${tag}">${tag}</option>`));
  tagSelect.innerHTML = options.join('');
}

function getCurrentContents() {
  if (!state.fase || !state.campo || !state.grado) return [];
  const grado = state.data?.fases?.[state.fase]?.campos?.[state.campo]?.grados?.[state.grado];
  return (grado?.contenidos || []).map((ct) => enrichContenido(ct));
}

function enrichContenido(ct) {
  const tags = new Set();
  (ct.etiquetas || ct.tags || []).forEach((tag) => tags.add(tag));
  (ct.pda || []).forEach((tag) => tags.add(tag));
  if (ct.campo) tags.add(ct.campo);
  return {
    ...ct,
    tags: Array.from(tags).filter(Boolean),
    descripcion: ct.descripcion || ct.desc || '',
  };
}

function filterAndSort(contents) {
  let filtered = contents;
  if (state.search) {
    filtered = filtered.filter((ct) => {
      const t = [ct.titulo, ct.descripcion, ...(ct.tags || []), ...(ct.pda || [])].join(' ').toLowerCase();
      return t.includes(state.search);
    });
  }
  if (state.etiqueta) {
    filtered = filtered.filter((ct) => (ct.tags || []).some((tag) => tag === state.etiqueta));
  }
  if (state.orden === 'alf') {
    filtered = [...filtered].sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));
  } else if (state.orden === 'etiqueta') {
    filtered = [...filtered].sort((a, b) => (a.tags?.[0] || '').localeCompare(b.tags?.[0] || '', 'es'));
  }
  return filtered;
}

function renderLista() {
  const lista = document.getElementById('cat-lista');
  const detalle = document.getElementById('cat-detalle');
  if (!lista) return;
  const contenidos = getCurrentContents();
  const filtered = filterAndSort(contenidos);
  state.filtered = filtered;
  if (!filtered.length) {
    lista.innerHTML = '<li class="cat-item empty">Selecciona filtros para ver contenidos.</li>';
    renderDetalle(detalle, null);
    return;
  }
  const html = filtered.map((ct) => {
    const selected = state.selected.has(ct.id) ? ' selected' : '';
    const etiquetas = (ct.tags || []).slice(0, 3).join(', ');
    return `<li data-id="${ct.id}" class="cat-item${selected}">` +
      `<strong>${ct.titulo}</strong>` +
      (etiquetas ? `<div class="cat-meta">${etiquetas}</div>` : '') +
      `</li>`;
  }).join('');
  lista.innerHTML = html;
  if (filtered.length && (!state.detalle || !filtered.some((ct) => ct.id === state.detalle?.id))) {
    state.detalle = filtered[0];
  }
  renderDetalle(detalle, state.detalle || filtered[0]);
  toggleAddButton(document.getElementById('cat-add'));
}

function renderDetalle(container, contenido) {
  if (!container) return;
  if (!contenido) {
    container.innerHTML = '<p style="opacity:0.7;">Selecciona un contenido para ver el detalle pedagógico.</p>';
    return;
  }
  const etiquetas = (contenido.tags || []).map((tag) => `<li>${tag}</li>`).join('');
  const pda = (contenido.pda || []).map((item) => `<li>${item}</li>`).join('');
  container.innerHTML = `
    <h3>${contenido.titulo}</h3>
    <p>${contenido.descripcion || 'Sin descripción registrada.'}</p>
    ${(etiquetas ? `<strong>Etiquetas:</strong><ul>${etiquetas}</ul>` : '') || ''}
    ${(pda ? `<strong>PDA:</strong><ul>${pda}</ul>` : '') || ''}
  `;
}

function toggleAddButton(btn) {
  if (!btn) return;
  btn.disabled = state.selected.size === 0;
}
