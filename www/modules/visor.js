// Módulo para el visor multimedia embebido

let state = {
  items: [],
  currentIndex: 0,
};

let viewerEl = null;

/**
 * Inicializa el visor, creando el elemento del overlay en el DOM.
 */
export function initVisor() {
  if (document.getElementById('atemix-viewer')) return;

  viewerEl = document.createElement('div');
  viewerEl.id = 'atemix-viewer';
  viewerEl.className = 'hidden';
  viewerEl.innerHTML = `
    <div class="viewer-overlay"></div>
    <div class="viewer-content">
      <button class="viewer-close">&times;</button>
      <button class="viewer-prev">&lsaquo;</button>
      <button class="viewer-next">&rsaquo;</button>
      <div class="viewer-media-container"></div>
    </div>
  `;
  document.body.appendChild(viewerEl);

  // Event Listeners
  viewerEl.querySelector('.viewer-close').addEventListener('click', closeVisor);
  viewerEl.querySelector('.viewer-overlay').addEventListener('click', closeVisor);
  viewerEl.querySelector('.viewer-next').addEventListener('click', showNext);
  viewerEl.querySelector('.viewer-prev').addEventListener('click', showPrev);
  
  document.addEventListener('keydown', (e) => {
    if (viewerEl.classList.contains('hidden')) return;
    if (e.key === 'Escape') closeVisor();
    if (e.key === 'ArrowRight') showNext();
    if (e.key === 'ArrowLeft') showPrev();
  });
}

/**
 * Abre el visor con una lista de items.
 * @param {Array<object>} items - Array de objetos, cada uno con { url, type, label }.
 * @param {number} index - El índice del item a mostrar inicialmente.
 */
export function abrirVisor(items, index = 0) {
  state.items = items;
  state.currentIndex = index;
  viewerEl.classList.remove('hidden');
  renderMedia();
}

function closeVisor() {
  viewerEl.classList.add('hidden');
  // Limpiar el contenedor para detener la reproducción de video/audio
  const container = viewerEl.querySelector('.viewer-media-container');
  container.innerHTML = '';
}

function showNext() {
  if (state.items.length > 1) {
    state.currentIndex = (state.currentIndex + 1) % state.items.length;
    renderMedia();
  }
}

function showPrev() {
  if (state.items.length > 1) {
    state.currentIndex = (state.currentIndex - 1 + state.items.length) % state.items.length;
    renderMedia();
  }
}

/**
 * Renderiza el contenido multimedia actual en el contenedor del visor.
 */
function renderMedia() {
  const container = viewerEl.querySelector('.viewer-media-container');
  const item = state.items[state.currentIndex];
  if (!item) return;

  let mediaHtml = '';
  const fileType = item.type || getFileTypeFromUrl(item.url);

  switch (fileType) {
    case 'image':
      mediaHtml = `<img src="${item.url}" alt="${item.label || 'Imagen'}">`;
      break;
    case 'video':
      mediaHtml = `<video controls autoplay src="${item.url}"></video>`;
      break;
    case 'audio':
      mediaHtml = `<audio controls autoplay src="${item.url}"></audio>`;
      break;
    case 'pdf':
      mediaHtml = `<object data="${item.url}" type="application/pdf"><p>Tu navegador no puede mostrar el PDF. <a href="${item.url}" download>Descárgalo aquí</a>.</p></object>`;
      break;
    default:
      mediaHtml = `<div class="viewer-fallback">No se puede previsualizar este archivo. <a href="${item.url}" download>Descargar archivo</a></div>`;
  }
  container.innerHTML = mediaHtml;

  // Actualizar visibilidad de botones de navegación
  const prevBtn = viewerEl.querySelector('.viewer-prev');
  const nextBtn = viewerEl.querySelector('.viewer-next');
  const showNav = state.items.length > 1;
  prevBtn.style.display = showNav ? 'block' : 'none';
  nextBtn.style.display = showNav ? 'block' : 'none';
}

/**
 * Deduce el tipo de archivo desde la extensión en la URL.
 * @param {string} url - La URL del archivo.
 * @returns {string} - El tipo de archivo (image, video, audio, pdf, unknown).
 */
function getFileTypeFromUrl(url) {
  const ext = url.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'ogg'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg'].includes(ext)) return 'audio';
  if (ext === 'pdf') return 'pdf';
  return 'unknown';
}